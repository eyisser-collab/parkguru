import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import {
  api, Park, getVisited, toggleVisited, syncAchievements, ACHIEVEMENT_DEFS,
} from '../../src/lib/api';
import { COLORS, SPACING, RADIUS } from '../../src/lib/theme';

const { width } = Dimensions.get('window');
const GRID_GAP = 10;
const GRID_COLS = 2;
const CARD_W = (width - SPACING.screenEdge * 2 - GRID_GAP) / GRID_COLS;

export default function Collection() {
  const [parks, setParks] = useState<Park[]>([]);
  const [visited, setVisited] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'visited' | 'unvisited'>('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [p, v] = await Promise.all([api.listParks(), getVisited()]);
    setParks(p);
    setVisited(v);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggle = async (code: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const v = await toggleVisited(code);
    setVisited(v);
    syncAchievements(v, parks);
  };

  const pct = parks.length ? Math.round((visited.length / parks.length) * 100) : 0;
  const unlockedCount = ACHIEVEMENT_DEFS.filter((a) => a.check(visited, parks)).length;

  const data = parks.filter((p) => {
    if (filter === 'visited') return visited.includes(p.parkCode);
    if (filter === 'unvisited') return !visited.includes(p.parkCode);
    return true;
  });

  return (
    <View style={styles.root} testID="collection-screen">
      <SafeAreaView edges={['top']} style={{ paddingHorizontal: SPACING.screenEdge }}>
        <Text style={styles.h1}>Collection</Text>
        <Text style={styles.sub}>{visited.length} of {parks.length} parks · {unlockedCount} achievements</Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>{pct}% complete</Text>
          <Text style={styles.progressText}>{parks.length - visited.length} to go</Text>
        </View>

        <View style={styles.chips}>
          {(['all', 'visited', 'unvisited'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.chip, filter === f && styles.chipActive]}
              testID={`filter-${f}`}
            >
              <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
                {f === 'all' ? 'All' : f === 'visited' ? 'Visited' : 'To Visit'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(p) => p.parkCode}
          numColumns={2}
          columnWrapperStyle={{ gap: GRID_GAP, paddingHorizontal: SPACING.screenEdge }}
          contentContainerStyle={{ paddingBottom: 140, paddingTop: SPACING.md, gap: GRID_GAP }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const isVisited = visited.includes(item.parkCode);
            return (
              <Animated.View entering={FadeIn.delay(Math.min(index, 15) * 30).duration(350)}>
                <TouchableOpacity
                  style={[styles.tile, { width: CARD_W }]}
                  activeOpacity={0.88}
                  onPress={() => toggle(item.parkCode)}
                  testID={`park-tile-${item.parkCode}`}
                >
                  <Image
                    source={{ uri: item.image }}
                    style={[styles.tileImg, !isVisited && { opacity: 0.35 }]}
                    contentFit="cover"
                  />
                  {!isVisited && <View style={styles.tileOverlay} />}
                  {isVisited && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  )}
                  <View style={styles.tileMeta}>
                    <Text style={[styles.tileName, !isVisited && { color: COLORS.textSecondary }]} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.tileState}>{item.states.join(' · ')}</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  h1: { fontSize: 34, fontWeight: '800', letterSpacing: -1, color: COLORS.textPrimary, marginTop: SPACING.md },
  sub: { fontSize: 15, color: COLORS.textSecondary, marginTop: 4 },

  progressTrack: {
    marginTop: SPACING.lg, height: 10, borderRadius: 5, backgroundColor: COLORS.border, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 5 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },

  chips: { flexDirection: 'row', gap: 8, marginTop: SPACING.lg },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.pill,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  chipActive: { backgroundColor: COLORS.textPrimary, borderColor: COLORS.textPrimary },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  chipTextActive: { color: '#fff' },

  tile: {
    borderRadius: RADIUS.md, overflow: 'hidden', backgroundColor: COLORS.surface,
    aspectRatio: 0.82,
  },
  tileImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  tileOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(18,22,20,0.35)' },
  checkBadge: {
    position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center',
  },
  tileMeta: {
    position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  tileName: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: -0.3 },
  tileState: { color: '#D5DFD9', fontSize: 10, marginTop: 2, letterSpacing: 1, fontWeight: '600' },
});
