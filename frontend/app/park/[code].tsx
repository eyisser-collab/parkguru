import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { api, ParkDetail, getVisited, toggleVisited } from '../../src/lib/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../src/lib/theme';

const { width } = Dimensions.get('window');

export default function ParkDetailScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const [park, setPark] = useState<ParkDetail | null>(null);
  const [visited, setVisited] = useState<string[]>([]);

  useEffect(() => {
    if (!code) return;
    (async () => {
      const [p, v] = await Promise.all([api.getPark(code), getVisited()]);
      setPark(p);
      setVisited(v);
    })();
  }, [code]);

  if (!park) {
    return <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={COLORS.primary} /></View>;
  }

  const isVisited = visited.includes(park.parkCode);
  const toggle = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setVisited(await toggleVisited(park.parkCode));
  };

  return (
    <View style={styles.root} testID="park-detail-screen">
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={{ uri: park.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={500} />
          <LinearGradient
            colors={['rgba(8,11,9,0.3)', 'rgba(8,11,9,0.9)']}
            locations={[0.35, 1]}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView edges={['top']} style={styles.heroInner}>
            <View style={styles.heroTopRow}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="park-back">
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={toggle}
                style={[styles.bookmark, isVisited && { backgroundColor: COLORS.accent }]}
                testID="park-mark-visited"
              >
                <Ionicons name={isVisited ? 'checkmark' : 'bookmark-outline'} size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }} />
            <Text style={styles.heroOverline}>{park.states.join(' · ')}</Text>
            <Text style={styles.heroTitle}>{park.fullName}</Text>
            <Text style={styles.heroDesg}>{park.designation}</Text>
          </SafeAreaView>
        </View>

        {park.gallery.length > 1 && (
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: SPACING.screenEdge, gap: 10, marginTop: SPACING.lg }}
          >
            {park.gallery.slice(0, 6).map((u, i) => (
              <Image key={i} source={{ uri: u }} style={styles.galleryImg} contentFit="cover" />
            ))}
          </ScrollView>
        )}

        <View style={{ paddingHorizontal: SPACING.screenEdge, marginTop: SPACING.xl }}>
          <Text style={styles.body}>{park.description}</Text>
        </View>

        {!!park.trails?.length && (
          <>
            <Text style={styles.sectionTitle}>Top Trails</Text>
            <View style={{ gap: 10, paddingHorizontal: SPACING.screenEdge }}>
              {park.trails.map((t, i) => (
                <Animated.View key={i} entering={FadeInDown.delay(i * 80).duration(400)} style={styles.trail}>
                  <View style={[styles.difficultyPill, {
                    backgroundColor:
                      t.difficulty === 'Easy' ? COLORS.success + '22' :
                      t.difficulty === 'Moderate' ? COLORS.warning + '22' : COLORS.accent + '22',
                  }]}>
                    <Text style={[styles.difficultyText, {
                      color: t.difficulty === 'Easy' ? COLORS.success :
                             t.difficulty === 'Moderate' ? COLORS.warning : COLORS.accent,
                    }]}>
                      {t.difficulty}
                    </Text>
                  </View>
                  <Text style={styles.trailName}>{t.name}</Text>
                  <View style={styles.trailMetaRow}>
                    <Ionicons name="walk-outline" size={13} color={COLORS.textSecondary} />
                    <Text style={styles.trailLen}>{t.length}</Text>
                  </View>
                  <Text style={styles.trailDesc}>{t.description}</Text>
                </Animated.View>
              ))}
            </View>
          </>
        )}

        {!!park.activities?.length && (
          <>
            <Text style={styles.sectionTitle}>Activities</Text>
            <View style={styles.activityRow}>
              {park.activities.slice(0, 12).map((a) => (
                <View key={a} style={styles.activityChip}>
                  <Text style={styles.activityText}>{a}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {!!park.weather && (
          <View style={{ paddingHorizontal: SPACING.screenEdge, marginTop: SPACING.xl }}>
            <Text style={styles.sectionOverline}>Weather</Text>
            <Text style={styles.body}>{park.weather}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  hero: { height: 460 },
  heroInner: { flex: 1, padding: SPACING.screenEdge },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  bookmark: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  heroOverline: { color: '#A3B5AA', fontSize: 11, letterSpacing: 2, fontWeight: '700' },
  heroTitle: { color: '#fff', fontSize: 36, fontWeight: '800', letterSpacing: -1, marginTop: 6, lineHeight: 40 },
  heroDesg: { color: '#D5DFD9', fontSize: 13, marginTop: 6, fontWeight: '600' },

  galleryImg: { width: 140, height: 100, borderRadius: RADIUS.md, backgroundColor: COLORS.border },

  body: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 22 },

  sectionTitle: {
    fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.5,
    paddingHorizontal: SPACING.screenEdge, marginTop: SPACING.xl, marginBottom: SPACING.md,
  },
  sectionOverline: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },

  trail: {
    backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  difficultyPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
  difficultyText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  trailName: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.3, marginTop: 8 },
  trailMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  trailLen: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  trailDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, marginTop: 6 },

  activityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: SPACING.screenEdge },
  activityChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  activityText: { fontSize: 12, color: COLORS.textPrimary, fontWeight: '600' },
});
