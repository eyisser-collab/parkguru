import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { api, getSavedTrips, deleteTrip, saveTrip, TripPlan } from '../../src/lib/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../src/lib/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// Suggested trip templates (generate real trip via backend when tapped)
const SUGGESTIONS = [
  {
    id: 'mighty-five',
    title: 'The Mighty Five',
    subtitle: '7 days · Utah canyons',
    image: 'https://images.unsplash.com/photo-1523419409543-a5e549c1faa8?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85',
    start_city_id: 'slc',
    duration: 7,
    parks: ['zion', 'brca', 'care', 'arch', 'cany'],
  },
  {
    id: 'pacific-nw',
    title: 'Pacific NW Giants',
    subtitle: '6 days · Washington & Oregon',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85',
    start_city_id: 'sea',
    duration: 6,
    parks: ['mora', 'olym', 'noca', 'crla'],
  },
  {
    id: 'desert-sw',
    title: 'Desert Southwest',
    subtitle: '8 days · AZ, NV, CA',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85',
    start_city_id: 'las',
    duration: 8,
    parks: ['grca', 'zion', 'brca', 'deva', 'jotr'],
  },
  {
    id: 'alaska-wild',
    title: 'Alaska Wild',
    subtitle: '9 days · Last frontier',
    image: 'https://images.unsplash.com/photo-1515514311136-4d11e6262b08?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85',
    start_city_id: 'anc',
    duration: 9,
    parks: ['dena', 'kefj', 'glba'],
  },
  {
    id: 'smoky-blue',
    title: 'Smoky & Shenandoah',
    subtitle: '5 days · Appalachian trail',
    image: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85',
    start_city_id: 'atl',
    duration: 5,
    parks: ['grsm', 'shen'],
  },
  {
    id: 'california-dream',
    title: 'California Dream',
    subtitle: '8 days · Coast to Sierra',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85',
    start_city_id: 'sfo',
    duration: 8,
    parks: ['yose', 'sequ', 'kica', 'pinn', 'lavo'],
  },
];

export default function Trips() {
  const router = useRouter();
  const [trips, setTrips] = useState<TripPlan[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getSavedTrips().then(setTrips);
    }, [])
  );

  const remove = (id: string) => {
    Alert.alert('Delete trip?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteTrip(id);
        setTrips(await getSavedTrips());
      }},
    ]);
  };

  const tryTemplate = async (tpl: typeof SUGGESTIONS[0]) => {
    setLoading(tpl.id);
    try {
      const plan = await api.planTrip({
        start_city_id: tpl.start_city_id,
        duration_days: tpl.duration,
        mode: 'manual',
        selected_park_codes: tpl.parks,
      });
      await AsyncStorage.setItem('pg.currentTrip', JSON.stringify(plan));
      await saveTrip(plan);
      setTrips(await getSavedTrips());
      router.push({ pathname: '/itinerary', params: { tripId: plan.id } });
    } catch (e) {
      Alert.alert('Oops', 'Could not build that trip right now.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.root} testID="trips-screen">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <SafeAreaView edges={['top']} style={{ paddingHorizontal: SPACING.screenEdge }}>
          <Text style={styles.h1}>Your Trips</Text>
          <Text style={styles.sub}>Saved adventures ready to roll.</Text>
        </SafeAreaView>

        {/* Integration status note */}
        <View style={styles.integrationsNote}>
          <Ionicons name="information-circle-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.integrationsNoteText}>
            Capital One Travel, Gmail, and Google Calendar trip import aren't yet connected — coming soon.
          </Text>
        </View>

        {trips.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Saved</Text>
            <View style={{ paddingHorizontal: SPACING.screenEdge, gap: SPACING.md }}>
              {trips.map((item, index) => (
                <Animated.View key={item.id} entering={FadeInDown.delay(index * 60).duration(450)}>
                  <TouchableOpacity
                    style={styles.card}
                    activeOpacity={0.9}
                    onPress={() => router.push({ pathname: '/itinerary', params: { tripId: item.id } })}
                    onLongPress={() => remove(item.id)}
                    testID={`trip-card-${item.id}`}
                  >
                    <Image source={{ uri: item.stops[0]?.park.image }} style={styles.cardImg} contentFit="cover" />
                    <View style={styles.cardBody}>
                      <Text style={styles.cardOverline}>
                        {item.duration_days} DAYS · {item.stops.length} PARKS
                      </Text>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.stops.map((s) => s.park.name.replace(' National Park', '').replace(' & Preserve', '')).join(' → ')}
                      </Text>
                      <Text style={styles.cardMeta}>
                        From {item.start_city.name} · ${item.cost.total_low_usd.toFixed(0)}–{item.cost.total_high_usd.toFixed(0)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>{trips.length > 0 ? 'More Ideas' : 'Suggested Trips'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.screenEdge, gap: SPACING.md }}>
          {SUGGESTIONS.map((s, i) => (
            <Animated.View key={s.id} entering={FadeInRight.delay(i * 70).duration(450)}>
              <TouchableOpacity
                style={styles.suggestCard}
                activeOpacity={0.88}
                onPress={() => tryTemplate(s)}
                disabled={loading === s.id}
                testID={`suggested-${s.id}`}
              >
                <Image source={{ uri: s.image }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.85)']}
                  locations={[0.45, 1]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.suggestMeta}>
                  <Text style={styles.suggestSub}>{s.subtitle}</Text>
                  <Text style={styles.suggestTitle}>{s.title}</Text>
                  <View style={styles.suggestCTA}>
                    {loading === s.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.suggestCTAText}>Try this trip</Text>
                        <Ionicons name="arrow-forward" size={14} color="#fff" />
                      </>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  h1: { fontSize: 34, fontWeight: '800', letterSpacing: -1, color: COLORS.textPrimary, marginTop: SPACING.md },
  sub: { fontSize: 15, color: COLORS.textSecondary, marginTop: 4, marginBottom: SPACING.md },

  integrationsNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: SPACING.screenEdge, padding: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  integrationsNoteText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },

  sectionTitle: {
    fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.5,
    paddingHorizontal: SPACING.screenEdge, marginTop: SPACING.xl, marginBottom: SPACING.md,
  },

  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.sm, borderWidth: 1, borderColor: COLORS.border },
  cardImg: { width: '100%', height: 180 },
  cardBody: { padding: SPACING.md },
  cardOverline: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  cardTitle: { fontSize: 19, fontWeight: '700', color: COLORS.textPrimary, marginTop: 6, letterSpacing: -0.4 },
  cardMeta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },

  suggestCard: {
    width: width * 0.72, height: 260, borderRadius: RADIUS.lg, overflow: 'hidden',
    backgroundColor: COLORS.surfaceDark, ...SHADOWS.md,
  },
  suggestMeta: { position: 'absolute', bottom: SPACING.md, left: SPACING.md, right: SPACING.md },
  suggestSub: { color: '#A3B5AA', fontSize: 11, letterSpacing: 1.5, fontWeight: '700', textTransform: 'uppercase' },
  suggestTitle: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: -0.6, marginTop: 4 },
  suggestCTA: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  suggestCTAText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
