import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  api, getVisited, Park, ACHIEVEMENT_DEFS, getTier, Tier,
} from '../../src/lib/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../src/lib/theme';

export default function Profile() {
  const router = useRouter();
  const [parks, setParks] = useState<Park[]>([]);
  const [visited, setVisited] = useState<string[]>([]);
  const [tier, setTierState] = useState<Tier>('free');

  useFocusEffect(useCallback(() => {
    (async () => {
      const [p, v, t] = await Promise.all([api.listParks(), getVisited(), getTier()]);
      setParks(p);
      setVisited(v);
      setTierState(t);
    })();
  }, []));

  const stateCount = new Set(
    parks.filter((p) => visited.includes(p.parkCode)).flatMap((p) => p.states)
  ).size;

  const unlocked = new Set(ACHIEVEMENT_DEFS.filter((a) => a.check(visited, parks)).map((a) => a.id));

  const reset = () => {
    Alert.alert('Reset progress?', 'This clears all visited parks and achievements.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['pg.visited', 'pg.achievements']);
          setVisited([]);
        },
      },
    ]);
  };

  return (
    <View style={styles.root} testID="profile-screen">
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <SafeAreaView edges={['top']} style={{ paddingHorizontal: SPACING.screenEdge }}>
          <Text style={styles.h1}>Profile</Text>
          <Text style={styles.sub}>Your park journey, at a glance.</Text>

          {/* Subscription card */}
          <TouchableOpacity
            onPress={() => router.push('/subscribe')}
            activeOpacity={0.9}
            style={styles.subCard}
            testID="upgrade-card"
          >
            <LinearGradient
              colors={tier === 'ultra' ? ['#FF5C35', '#E04824'] : tier === 'premium' ? ['#235E3B', '#1A472C'] : ['#1C241F', '#080B09']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.subCardInner}>
              <View>
                <Text style={styles.subCardTier}>
                  {tier === 'free' ? 'FREE PLAN' : tier === 'premium' ? 'PREMIUM' : 'ULTRA'}
                </Text>
                <Text style={styles.subCardTitle}>
                  {tier === 'free' ? 'Unlock the full wild' : tier === 'premium' ? 'You\'re Premium' : 'You\'re Ultra'}
                </Text>
                <Text style={styles.subCardSub}>
                  {tier === 'free' ? 'Unlimited trips · AI routes · Ranger tips' : 'Thanks for supporting Park Guru'}
                </Text>
              </View>
              <View style={styles.subCardArrow}>
                <Ionicons name={tier === 'free' ? 'arrow-forward' : 'settings-outline'} size={18} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.bento}>
            <BentoCard big value={String(visited.length)} label="Parks Visited" icon="ribbon" />
            <BentoCard value={`${parks.length ? Math.round((visited.length/parks.length)*100):0}%`} label="Collection" icon="trending-up" />
            <BentoCard value={String(stateCount)} label="States" icon="flag" />
            <BentoCard value={String(unlocked.size)} label="Achievements" icon="trophy" />
          </View>

          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={{ gap: SPACING.sm, marginTop: SPACING.sm }}>
            {ACHIEVEMENT_DEFS.map((a, i) => {
              const got = unlocked.has(a.id);
              return (
                <Animated.View key={a.id} entering={FadeInDown.delay(i * 50).duration(400)}>
                  <View style={[styles.achRow, got && styles.achRowUnlocked]} testID={`achievement-${a.id}`}>
                    <View style={[styles.achIcon, got && { backgroundColor: COLORS.accent }]}>
                      <Ionicons name={got ? 'trophy' : 'lock-closed'} size={18} color={got ? '#fff' : COLORS.textTertiary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.achTitle, !got && { color: COLORS.textSecondary }]}>{a.title}</Text>
                      <Text style={styles.achSub}>{a.subtitle}</Text>
                    </View>
                    {got && <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />}
                  </View>
                </Animated.View>
              );
            })}
          </View>

          <TouchableOpacity style={styles.reset} onPress={reset} testID="reset-progress-btn">
            <Ionicons name="refresh" size={16} color={COLORS.textSecondary} />
            <Text style={styles.resetText}>Reset progress</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ScrollView>
    </View>
  );
}

function BentoCard({ value, label, icon, big }: { value: string; label: string; icon: any; big?: boolean }) {
  return (
    <View style={[styles.bentoCard, big && styles.bentoBig]}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
      <Text style={[styles.bentoValue, big && { fontSize: 44 }]}>{value}</Text>
      <Text style={styles.bentoLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  h1: { fontSize: 34, fontWeight: '800', letterSpacing: -1, color: COLORS.textPrimary, marginTop: SPACING.md },
  sub: { fontSize: 15, color: COLORS.textSecondary, marginTop: 4, marginBottom: SPACING.lg },

  bento: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bentoCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, gap: 8,
    width: '48.5%',
  },
  bentoBig: { width: '100%' },
  bentoValue: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -1 },
  bentoLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },

  sectionTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.5, marginTop: SPACING.xl },

  achRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  achRowUnlocked: { borderColor: COLORS.primary + '33' },
  achIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  achTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.3 },
  achSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  reset: {
    marginTop: SPACING.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14,
  },
  resetText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },

  subCard: {
    marginTop: SPACING.lg, marginBottom: SPACING.lg, borderRadius: RADIUS.lg,
    overflow: 'hidden', ...SHADOWS.md,
  },
  subCardInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.lg,
  },
  subCardTier: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  subCardTitle: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginTop: 4 },
  subCardSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 },
  subCardArrow: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
});
