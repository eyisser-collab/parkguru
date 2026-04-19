import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { api, getTier, setTier, Tier } from '../src/lib/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../src/lib/theme';

const TIER_FEATURES: Record<Tier, { label: string; items: string[]; color: string }> = {
  free: {
    label: 'Free', color: COLORS.textSecondary,
    items: [
      'Up to 3 saved trips',
      '63 national parks collection',
      'Nearest-neighbor routing',
      'Standard park info',
    ],
  },
  premium: {
    label: 'Premium · $4.99/mo', color: COLORS.primary,
    items: [
      'Unlimited saved trips',
      'Smarter multi-day routing',
      'Offline park guides',
      'High-res photo gallery',
      'Priority trail recommendations',
    ],
  },
  ultra: {
    label: 'Ultra · $9.99/mo', color: COLORS.accent,
    items: [
      'Everything in Premium',
      'AI itinerary personalization',
      'Live crowd predictions',
      'Exclusive ranger tips',
      'Partner discounts (Booking, REI)',
      'Early access to new features',
    ],
  },
};

export default function Subscribe() {
  const router = useRouter();
  const { session_id } = useLocalSearchParams<{ session_id?: string }>();
  const [currentTier, setCurrentTier] = useState<Tier>('free');
  const [loading, setLoading] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const pollAttempts = useRef(0);

  useEffect(() => {
    getTier().then(setCurrentTier);
  }, []);

  // Handle return from Stripe checkout
  useEffect(() => {
    if (!session_id) return;
    setPolling(true);
    const poll = async () => {
      try {
        const status = await api.subscriptionStatus(String(session_id));
        if (status.payment_status === 'paid') {
          const tier = (status.metadata?.tier as Tier) || 'premium';
          await setTier(tier);
          setCurrentTier(tier);
          setPolling(false);
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Welcome to ' + tier.toUpperCase() + '!', 'Your subscription is now active.');
          return;
        }
        if (status.status === 'expired' || pollAttempts.current > 8) {
          setPolling(false);
          return;
        }
        pollAttempts.current += 1;
        setTimeout(poll, 2000);
      } catch {
        setPolling(false);
      }
    };
    poll();
  }, [session_id]);

  const subscribe = async (packageId: 'premium_monthly' | 'ultra_monthly') => {
    setLoading(packageId);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await api.createCheckout({ package_id: packageId, origin_url: origin });
      if (Platform.OS === 'web') {
        window.location.href = res.url;
      } else {
        await WebBrowser.openBrowserAsync(res.url);
      }
    } catch (e: any) {
      Alert.alert('Checkout failed', e?.message || 'Try again in a moment.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.root} testID="subscribe-screen">
      <LinearGradient colors={['#080B09', '#121714', '#1C241F']} style={StyleSheet.absoluteFill} />
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} testID="subscribe-close">
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: SPACING.screenEdge, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(500)}>
          <View style={styles.badge}>
            <Ionicons name="flask-outline" size={12} color="#FFD3C1" />
            <Text style={styles.badgeText}>TEST MODE · NO REAL CHARGES</Text>
          </View>
          <Text style={styles.title}>Unlock the{'\n'}full wild.</Text>
          <Text style={styles.subtitle}>
            Upgrade to plan unlimited adventures, get smarter routes, and support the app.
          </Text>
        </Animated.View>

        {polling && (
          <View style={styles.pollCard}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.pollText}>Confirming your subscription…</Text>
          </View>
        )}

        {(['free', 'premium', 'ultra'] as Tier[]).map((t, i) => {
          const def = TIER_FEATURES[t];
          const isCurrent = currentTier === t;
          const pkgId = t === 'premium' ? 'premium_monthly' : t === 'ultra' ? 'ultra_monthly' : null;
          return (
            <Animated.View
              key={t}
              entering={FadeInUp.delay(150 + i * 100).duration(500)}
              style={[styles.card, t !== 'free' && { borderColor: def.color + '44' }]}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.cardTier, { color: def.color }]}>{def.label}</Text>
                  {isCurrent && <Text style={styles.currentBadge}>YOUR PLAN</Text>}
                </View>
                {t === 'ultra' && (
                  <View style={styles.bestBadge}>
                    <Text style={styles.bestBadgeText}>BEST VALUE</Text>
                  </View>
                )}
              </View>
              <View style={{ gap: 8, marginTop: SPACING.md }}>
                {def.items.map((item) => (
                  <View key={item} style={styles.featRow}>
                    <Ionicons name="checkmark-circle" size={16} color={def.color} />
                    <Text style={styles.featText}>{item}</Text>
                  </View>
                ))}
              </View>
              {pkgId && !isCurrent && (
                <TouchableOpacity
                  style={[styles.subBtn, { backgroundColor: def.color }]}
                  onPress={() => subscribe(pkgId as any)}
                  disabled={loading === pkgId}
                  testID={`subscribe-${t}`}
                >
                  {loading === pkgId ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.subBtnText}>Subscribe</Text>
                  )}
                </TouchableOpacity>
              )}
            </Animated.View>
          );
        })}

        <Text style={styles.testNote}>
          Test card: 4242 4242 4242 4242 · any future date · any CVC · any ZIP
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgDark },
  header: { flexDirection: 'row', paddingHorizontal: SPACING.screenEdge, paddingTop: SPACING.sm },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.accent + '22', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.pill, alignSelf: 'flex-start',
  },
  badgeText: { color: '#FFD3C1', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },

  title: { color: '#fff', fontSize: 44, fontWeight: '800', letterSpacing: -1.3, marginTop: SPACING.md, lineHeight: 48 },
  subtitle: { color: '#A3B5AA', fontSize: 15, lineHeight: 22, marginTop: SPACING.md, maxWidth: 340 },

  pollCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.08)', padding: SPACING.md, borderRadius: RADIUS.md,
    marginTop: SPACING.xl,
  },
  pollText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  card: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.lg,
    padding: SPACING.lg, marginTop: SPACING.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTier: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  currentBadge: { color: COLORS.success, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: 4 },

  bestBadge: { backgroundColor: COLORS.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
  bestBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },

  featRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featText: { color: '#D5DFD9', fontSize: 14, flex: 1 },

  subBtn: {
    marginTop: SPACING.lg, paddingVertical: 14, borderRadius: RADIUS.pill,
    alignItems: 'center', ...SHADOWS.md,
  },
  subBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },

  testNote: {
    color: '#6A7B72', fontSize: 11, textAlign: 'center',
    marginTop: SPACING.xl, lineHeight: 16,
  },
});
