import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ImageBackground, TouchableOpacity, ScrollView,
  Dimensions, ActivityIndicator, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { api, Park, getVisited } from '../../src/lib/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../src/lib/theme';

const { width, height } = Dimensions.get('window');

const HERO = 'https://images.unsplash.com/photo-1516687401797-25297ff1462c?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85';

export default function Explore() {
  const router = useRouter();
  const [parks, setParks] = useState<Park[]>([]);
  const [visited, setVisited] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, v] = await Promise.all([api.listParks(), getVisited()]);
        setParks(p);
        setVisited(v);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const featured = parks.slice(0, 8);
  const byState: Record<string, Park[]> = {};
  parks.forEach((p) => p.states.forEach((s) => {
    byState[s] = byState[s] || [];
    byState[s].push(p);
  }));

  const goPlan = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/plan');
  };

  return (
    <View style={styles.root} testID="explore-screen">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <ImageBackground source={{ uri: HERO }} style={styles.heroBg} resizeMode="cover">
            <LinearGradient
              colors={['rgba(8,11,9,0)', 'rgba(8,11,9,0.35)', 'rgba(8,11,9,0.95)']}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
            />
            <SafeAreaView style={styles.heroSafe} edges={['top']}>
              <Animated.View entering={FadeIn.duration(700)}>
                <Text style={styles.heroOverline}>PARK GURU</Text>
              </Animated.View>
              <View style={{ flex: 1 }} />
              <Animated.View entering={FadeInDown.delay(200).duration(700)}>
                <Text style={styles.heroTitle}>Plan the{'\n'}wild stuff.</Text>
                <Text style={styles.heroSub}>
                  63 U.S. national parks. One optimized route. A lifetime of stories.
                </Text>
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(400).duration(700)}>
                <TouchableOpacity
                  style={styles.cta}
                  onPress={goPlan}
                  activeOpacity={0.85}
                  testID="plan-trip-cta-button"
                >
                  <Text style={styles.ctaText}>Plan Your Trip</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
                <View style={styles.heroStatsRow}>
                  <Stat label="Parks" value={parks.length ? String(parks.length) : '—'} />
                  <Stat label="Visited" value={String(visited.length)} />
                  <Stat label="Trails" value="180+" />
                </View>
              </Animated.View>
            </SafeAreaView>
          </ImageBackground>
        </View>

        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={COLORS.primary} /></View>
        ) : (
          <>
            <SectionHeader title="Featured Parks" sub="Cinematic, unforgettable" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SPACING.screenEdge, gap: SPACING.md }}
            >
              {featured.map((p, i) => (
                <Animated.View key={p.parkCode} entering={FadeInRight.delay(i * 70).duration(500)}>
                  <FeatureCard park={p} onPress={() => router.push(`/park/${p.parkCode}`)} />
                </Animated.View>
              ))}
            </ScrollView>

            <SectionHeader title="By State" sub="Explore the country, region by region" />
            <View style={{ paddingHorizontal: SPACING.screenEdge, gap: SPACING.md }}>
              {Object.entries(byState)
                .sort((a, b) => b[1].length - a[1].length)
                .slice(0, 6)
                .map(([state, ps]) => (
                  <TouchableOpacity
                    key={state}
                    style={styles.stateRow}
                    onPress={() => router.push(`/park/${ps[0].parkCode}`)}
                    activeOpacity={0.8}
                    testID={`state-row-${state}`}
                  >
                    <Image source={{ uri: ps[0].image }} style={styles.stateImg} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stateName}>{state}</Text>
                      <Text style={styles.stateMeta}>{ps.length} park{ps.length > 1 ? 's' : ''}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
                  </TouchableOpacity>
                ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSub}>{sub}</Text>
    </View>
  );
}

function FeatureCard({ park, onPress }: { park: Park; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={styles.featureCard}
      testID={`featured-park-${park.parkCode}`}
    >
      <Image source={{ uri: park.image }} style={styles.featureImg} contentFit="cover" transition={400} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        locations={[0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.featureMeta}>
        <Text style={styles.featureState}>{park.states.join(' · ')}</Text>
        <Text style={styles.featureName} numberOfLines={2}>{park.name}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  hero: { height: height * 0.78, backgroundColor: COLORS.bgDark },
  heroBg: { flex: 1 },
  heroSafe: { flex: 1, paddingHorizontal: SPACING.screenEdge, paddingBottom: SPACING.xl },
  heroOverline: {
    color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 2.5, opacity: 0.85,
  },
  heroTitle: {
    color: '#fff', fontSize: 52, fontWeight: '800', letterSpacing: -1.5, lineHeight: 54,
  },
  heroSub: {
    color: '#D5DFD9', fontSize: 16, lineHeight: 22, marginTop: SPACING.md, maxWidth: 340,
  },
  cta: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.accent,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, borderRadius: RADIUS.pill, gap: 10,
    ...SHADOWS.md,
  },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  heroStatsRow: { flexDirection: 'row', marginTop: SPACING.lg, gap: SPACING.xl },
  stat: {},
  statValue: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  statLabel: { color: '#A3B5AA', fontSize: 11, letterSpacing: 1.2, marginTop: 2, textTransform: 'uppercase' },

  loading: { padding: SPACING.xxl, alignItems: 'center' },

  sectionHeader: { paddingHorizontal: SPACING.screenEdge, marginTop: SPACING.xxl, marginBottom: SPACING.md },
  sectionTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.8, color: COLORS.textPrimary },
  sectionSub: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },

  featureCard: {
    width: width * 0.7, height: 380, borderRadius: RADIUS.lg, overflow: 'hidden',
    backgroundColor: COLORS.surfaceDark, ...SHADOWS.md,
  },
  featureImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  featureMeta: { position: 'absolute', bottom: SPACING.lg, left: SPACING.lg, right: SPACING.lg },
  featureState: { color: '#A3B5AA', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '700' },
  featureName: { color: '#fff', fontSize: 26, fontWeight: '700', letterSpacing: -0.6, marginTop: 6, lineHeight: 30 },

  stateRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  stateImg: { width: 56, height: 56, borderRadius: RADIUS.sm, backgroundColor: COLORS.border },
  stateName: { fontSize: 17, fontWeight: '600', color: COLORS.textPrimary, letterSpacing: -0.3 },
  stateMeta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
});
