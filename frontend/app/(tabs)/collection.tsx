import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions,
  ActivityIndicator, Modal, Alert, Share,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import ConfettiCannon from 'react-native-confetti-cannon';
import {
  api, Park, getVisited, toggleVisited, syncAchievements, ACHIEVEMENT_DEFS,
  getVisitedPhotos, setVisitedPhoto, removeVisitedPhoto,
} from '../../src/lib/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../src/lib/theme';

const { width } = Dimensions.get('window');
const GRID_GAP = 10;
const GRID_COLS = 2;
const CARD_W = (width - SPACING.screenEdge * 2 - GRID_GAP) / GRID_COLS;

export default function Collection() {
  const [parks, setParks] = useState<Park[]>([]);
  const [visited, setVisited] = useState<string[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'all' | 'visited' | 'unvisited'>('all');
  const [loading, setLoading] = useState(true);
  const [confetti, setConfetti] = useState(false);
  const [detailPark, setDetailPark] = useState<Park | null>(null);

  const load = useCallback(async () => {
    const [p, v, ph] = await Promise.all([api.listParks(), getVisited(), getVisitedPhotos()]);
    setParks(p);
    setVisited(v);
    setPhotos(ph);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggle = async (code: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const wasVisited = visited.includes(code);
    const v = await toggleVisited(code);
    setVisited(v);
    syncAchievements(v, parks);
    if (!wasVisited) {
      setConfetti(true);
      setTimeout(() => setConfetti(false), 3000);
    } else {
      await removeVisitedPhoto(code);
      setPhotos(await getVisitedPhotos());
    }
  };

  const addPhoto = async (park: Park) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Grant photo library access to add a park memory.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!res.canceled && res.assets[0]?.base64) {
      const uri = `data:image/jpeg;base64,${res.assets[0].base64}`;
      await setVisitedPhoto(park.parkCode, uri);
      setPhotos(await getVisitedPhotos());
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const sharePark = async (park: Park) => {
    try {
      await Share.share({
        message: `I just collected ${park.name} National Park on Park Guru! ${visited.length}/${parks.length} parks visited · Who's joining me next?`,
      });
    } catch {}
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
            const photo = photos[item.parkCode];
            const imgSrc = photo || item.image;
            return (
              <Animated.View entering={FadeIn.delay(Math.min(index, 15) * 30).duration(350)}>
                <TouchableOpacity
                  style={[styles.tile, { width: CARD_W }]}
                  activeOpacity={0.88}
                  onPress={() => toggle(item.parkCode)}
                  onLongPress={() => setDetailPark(item)}
                  testID={`park-tile-${item.parkCode}`}
                >
                  <Image
                    source={{ uri: imgSrc }}
                    style={[styles.tileImg, !isVisited && { opacity: 0.35 }]}
                    contentFit="cover"
                  />
                  {!isVisited && <View style={styles.tileOverlay} />}
                  {isVisited && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  )}
                  {isVisited && photo && (
                    <View style={styles.photoBadge}>
                      <Ionicons name="camera" size={12} color="#fff" />
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

      {confetti && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ConfettiCannon
            count={150}
            origin={{ x: width / 2, y: 0 }}
            autoStart
            fadeOut
            explosionSpeed={350}
            fallSpeed={2600}
            colors={['#FF5C35', '#235E3B', '#FF9F0A', '#34C759', '#FFFFFF']}
          />
        </View>
      )}

      <Modal visible={!!detailPark} transparent animationType="fade" onRequestClose={() => setDetailPark(null)}>
        {detailPark && (
          <View style={styles.modalBackdrop}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setDetailPark(null)} />
            <View style={styles.modalCard}>
              <Image
                source={{ uri: photos[detailPark.parkCode] || detailPark.image }}
                style={styles.modalImg}
                contentFit="cover"
              />
              <View style={{ padding: SPACING.md }}>
                <Text style={styles.modalOverline}>{detailPark.states.join(' · ')}</Text>
                <Text style={styles.modalTitle}>{detailPark.name}</Text>
                <Text style={styles.modalDesc} numberOfLines={3}>{detailPark.description}</Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalBtn}
                    onPress={() => addPhoto(detailPark)}
                    testID={`add-photo-${detailPark.parkCode}`}
                  >
                    <Ionicons name="camera-outline" size={16} color={COLORS.textPrimary} />
                    <Text style={styles.modalBtnText}>
                      {photos[detailPark.parkCode] ? 'Change Photo' : 'Add Photo'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalBtn}
                    onPress={() => sharePark(detailPark)}
                    testID={`share-park-${detailPark.parkCode}`}
                  >
                    <Ionicons name="share-outline" size={16} color={COLORS.textPrimary} />
                    <Text style={styles.modalBtnText}>Share</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.modalBtnPrimary, visited.includes(detailPark.parkCode) && { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border }]}
                  onPress={() => { toggle(detailPark.parkCode); setDetailPark(null); }}
                  testID={`modal-toggle-${detailPark.parkCode}`}
                >
                  <Text style={[styles.modalBtnPrimaryText, visited.includes(detailPark.parkCode) && { color: COLORS.textPrimary }]}>
                    {visited.includes(detailPark.parkCode) ? 'Remove from Collection' : 'Mark as Visited'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  h1: { fontSize: 34, fontWeight: '800', letterSpacing: -1, color: COLORS.textPrimary, marginTop: SPACING.md },
  sub: { fontSize: 15, color: COLORS.textSecondary, marginTop: 4 },

  progressTrack: { marginTop: SPACING.lg, height: 10, borderRadius: 5, backgroundColor: COLORS.border, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 5 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },

  chips: { flexDirection: 'row', gap: 8, marginTop: SPACING.lg },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  chipActive: { backgroundColor: COLORS.textPrimary, borderColor: COLORS.textPrimary },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  chipTextActive: { color: '#fff' },

  tile: { borderRadius: RADIUS.md, overflow: 'hidden', backgroundColor: COLORS.surface, aspectRatio: 0.82 },
  tileImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  tileOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(18,22,20,0.35)' },
  checkBadge: { position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  photoBadge: { position: 'absolute', top: 10, left: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  tileMeta: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: 'rgba(0,0,0,0.55)' },
  tileName: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: -0.3 },
  tileState: { color: '#D5DFD9', fontSize: 10, marginTop: 2, letterSpacing: 1, fontWeight: '600' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  modalCard: { width: '100%', maxWidth: 420, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.lg },
  modalImg: { width: '100%', height: 220 },
  modalOverline: { color: COLORS.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: '700' },
  modalTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.6, marginTop: 4 },
  modalDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, marginTop: 8 },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: SPACING.md },
  modalBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border },
  modalBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  modalBtnPrimary: { marginTop: 10, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: RADIUS.pill, alignItems: 'center' },
  modalBtnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
});
