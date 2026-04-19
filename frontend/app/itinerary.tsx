import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform,
  ActivityIndicator, Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { TripPlan, getSavedTrips, toggleVisited, getVisited } from '../src/lib/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../src/lib/theme';

const { width } = Dimensions.get('window');

export default function Itinerary() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const [trip, setTrip] = useState<TripPlan | null>(null);
  const [visited, setVisited] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const trips = await getSavedTrips();
      let t = trips.find((x) => x.id === tripId);
      if (!t) {
        const cur = await AsyncStorage.getItem('pg.currentTrip');
        if (cur) t = JSON.parse(cur);
      }
      setTrip(t || null);
      setVisited(await getVisited());
    })();
  }, [tripId]);

  if (!trip) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  const mark = async (code: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const v = await toggleVisited(code);
    setVisited(v);
  };

  const heroImg = trip.stops[0]?.park.image;

  return (
    <View style={styles.root} testID="itinerary-screen">
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={{ uri: heroImg }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient
            colors={['rgba(8,11,9,0.25)', 'rgba(8,11,9,0.85)']}
            locations={[0.3, 1]}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView edges={['top']} style={styles.heroInner}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              testID="itinerary-back"
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <Animated.View entering={FadeInDown.duration(500)}>
              <Text style={styles.heroOverline}>
                {trip.duration_days} DAYS · {trip.stops.length} PARKS
              </Text>
              <Text style={styles.heroTitle}>
                From {trip.start_city.name.split(',')[0]}
              </Text>
              <Text style={styles.heroSub}>
                {trip.stops.map((s) => s.park.name.replace(' National Park', '')).join(' · ')}
              </Text>
            </Animated.View>
          </SafeAreaView>
        </View>

        {/* Route visual */}
        <View style={styles.routeWrap}>
          <Text style={styles.sectionTitle}>The Route</Text>
          <RouteVisual trip={trip} />
        </View>

        {/* Cost estimator */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.costCard}>
          <Text style={styles.costTitle}>Trip Cost Estimate</Text>
          <View style={styles.costGrid}>
            <CostCell label="Miles" value={`${trip.cost.total_miles.toFixed(0)}`} />
            <CostCell label="Drive" value={`${trip.cost.total_drive_hours.toFixed(1)}h`} />
            <CostCell label="Gas" value={`$${trip.cost.gas_cost_usd.toFixed(0)}`} />
            <CostCell label="Lodging" value={`$${trip.cost.lodging_low_usd.toFixed(0)}+`} />
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Estimated total</Text>
            <Text style={styles.totalValue}>
              ${trip.cost.total_low_usd.toFixed(0)}–${trip.cost.total_high_usd.toFixed(0)}
            </Text>
          </View>
          <Text style={styles.costFootnote}>
            Based on {trip.cost.mpg_used} mpg · ${trip.cost.gas_price_used}/gal
          </Text>
        </Animated.View>

        {/* Day-by-day feed */}
        <Text style={[styles.sectionTitle, { paddingHorizontal: SPACING.screenEdge, marginTop: SPACING.xl }]}>
          Day by Day
        </Text>

        <View style={{ paddingHorizontal: SPACING.screenEdge, gap: SPACING.lg, marginTop: SPACING.md }}>
          {trip.stops.map((stop, i) => {
            const isVisited = visited.includes(stop.park.parkCode);
            return (
              <Animated.View key={stop.park.parkCode} entering={FadeInDown.delay(i * 120).duration(500)}>
                <View style={styles.parkCard}>
                  <View style={styles.dayBadge}>
                    <Text style={styles.dayBadgeText}>DAY {stop.day}</Text>
                  </View>
                  <Image source={{ uri: stop.park.image }} style={styles.parkImg} contentFit="cover" />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.65)']}
                    locations={[0.5, 1]}
                    style={styles.parkImgOverlay}
                  />
                  <View style={styles.parkImgText}>
                    <Text style={styles.parkImgState}>{stop.park.states.join(' · ')}</Text>
                    <Text style={styles.parkImgName}>{stop.park.name}</Text>
                  </View>
                  <View style={styles.parkBody}>
                    <View style={styles.driveRow}>
                      <Ionicons name="car-outline" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.driveText}>
                        {stop.drive_miles_from_prev.toFixed(0)} mi · {stop.drive_hours_from_prev.toFixed(1)}h
                      </Text>
                    </View>
                    <Text style={styles.parkDesc} numberOfLines={3}>
                      {stop.park.description}
                    </Text>
                    <Text style={styles.trailsTitle}>Top Trails</Text>
                    <View style={{ gap: 8 }}>
                      {stop.suggested_trails.slice(0, 3).map((t, idx) => (
                        <View key={idx} style={styles.trailRow}>
                          <View style={[styles.difficultyDot, {
                            backgroundColor:
                              t.difficulty === 'Easy' ? COLORS.success :
                              t.difficulty === 'Moderate' ? COLORS.warning : COLORS.accent,
                          }]} />
                          <View style={{ flex: 1 }}>
                            <View style={styles.trailHeader}>
                              <Text style={styles.trailName} numberOfLines={1}>{t.name}</Text>
                              <Text style={styles.trailLen}>{t.length}</Text>
                            </View>
                            <Text style={styles.trailDesc} numberOfLines={2}>{t.description}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                    <View style={styles.parkActions}>
                      <TouchableOpacity
                        style={[styles.actionBtn, isVisited && styles.actionBtnActive]}
                        onPress={() => mark(stop.park.parkCode)}
                        testID={`mark-visited-${stop.park.parkCode}`}
                      >
                        <Ionicons
                          name={isVisited ? 'checkmark-circle' : 'bookmark-outline'}
                          size={16}
                          color={isVisited ? '#fff' : COLORS.textPrimary}
                        />
                        <Text style={[styles.actionText, isVisited && { color: '#fff' }]}>
                          {isVisited ? 'Visited' : 'Mark as visited'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtnGhost}
                        onPress={() => router.push(`/park/${stop.park.parkCode}`)}
                        testID={`view-park-${stop.park.parkCode}`}
                      >
                        <Text style={styles.actionTextGhost}>Details</Text>
                        <Ionicons name="arrow-forward" size={14} color={COLORS.textPrimary} />
                      </TouchableOpacity>
                    </View>

                    {/* Deep links to external services */}
                    <Text style={styles.integrationsTitle}>Book & Explore</Text>
                    <View style={styles.integrationsGrid}>
                      <IntegrationBtn
                        label="Booking.com"
                        icon="bed-outline"
                        color="#003B95"
                        onPress={() => openExternal(`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(stop.park.name)}&aid=parkguru`)}
                        testID={`book-hotels-${stop.park.parkCode}`}
                      />
                      <IntegrationBtn
                        label="Airbnb"
                        icon="home-outline"
                        color="#FF385C"
                        onPress={() => openExternal(`https://www.airbnb.com/s/${encodeURIComponent(stop.park.name)}`)}
                        testID={`book-airbnb-${stop.park.parkCode}`}
                      />
                      <IntegrationBtn
                        label="VRBO"
                        icon="key-outline"
                        color="#245ABC"
                        onPress={() => openExternal(`https://www.vrbo.com/search?q=${encodeURIComponent(stop.park.name)}`)}
                        testID={`book-vrbo-${stop.park.parkCode}`}
                      />
                      <IntegrationBtn
                        label="AllTrails"
                        icon="trail-sign-outline"
                        color="#2C5F2D"
                        onPress={() => openExternal(`https://www.alltrails.com/search?q=${encodeURIComponent(stop.park.name)}`)}
                        testID={`open-alltrails-${stop.park.parkCode}`}
                      />
                      <IntegrationBtn
                        label="Add to Calendar"
                        icon="calendar-outline"
                        color="#4285F4"
                        onPress={() => openExternal(buildCalendarUrl(stop.park.name, trip.start_city.name, trip.duration_days, stop.day))}
                        testID={`add-calendar-${stop.park.parkCode}`}
                      />
                    </View>
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function CostCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.costCell}>
      <Text style={styles.costValue}>{value}</Text>
      <Text style={styles.costLabel}>{label}</Text>
    </View>
  );
}

function openExternal(url: string) {
  Linking.openURL(url).catch(() => {});
}

function buildCalendarUrl(parkName: string, startCity: string, durationDays: number, day: number): string {
  const base = new Date();
  base.setHours(9, 0, 0, 0);
  base.setDate(base.getDate() + 14 + (day - 1)); // 2 weeks out + day offset
  const end = new Date(base.getTime() + 8 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Park Guru · ${parkName}`,
    dates: `${fmt(base)}/${fmt(end)}`,
    details: `Park Guru itinerary · Day ${day} of ${durationDays} · From ${startCity}`,
    location: parkName,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function IntegrationBtn({ label, icon, color, onPress, testID }: { label: string; icon: any; color: string; onPress: () => void; testID: string }) {
  return (
    <TouchableOpacity style={styles.intBtn} onPress={onPress} testID={testID} activeOpacity={0.85}>
      <View style={[styles.intIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.intLabel} numberOfLines={1}>{label}</Text>
      <Ionicons name="open-outline" size={12} color={COLORS.textTertiary} />
    </TouchableOpacity>
  );
}

function RouteVisual({ trip }: { trip: TripPlan }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: SPACING.screenEdge, alignItems: 'center' }}
    >
      <View style={styles.routeNode}>
        <View style={[styles.routeDot, { backgroundColor: COLORS.textPrimary }]}>
          <Ionicons name="locate" size={14} color="#fff" />
        </View>
        <Text style={styles.routeNodeText} numberOfLines={1}>
          {trip.start_city.name.split(',')[0]}
        </Text>
      </View>
      {trip.stops.map((s, i) => (
        <Animated.View
          key={s.park.parkCode}
          entering={FadeInRight.delay(i * 100).duration(400)}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <View style={styles.routeLine} />
          <View style={styles.routeNode}>
            <View style={[styles.routeDot, { backgroundColor: COLORS.accent }]}>
              <Text style={styles.routeDotNum}>{i + 1}</Text>
            </View>
            <Text style={styles.routeNodeText} numberOfLines={1}>
              {s.park.name.replace(' National Park', '')}
            </Text>
            <Text style={styles.routeNodeSub}>Day {s.day}</Text>
          </View>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  hero: { height: 420, backgroundColor: COLORS.bgDark, overflow: 'hidden' },
  heroInner: { flex: 1, paddingHorizontal: SPACING.screenEdge, paddingBottom: SPACING.xl },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroOverline: { color: '#A3B5AA', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  heroTitle: { color: '#fff', fontSize: 40, fontWeight: '800', letterSpacing: -1.2, marginTop: 6 },
  heroSub: { color: '#D5DFD9', fontSize: 14, marginTop: 8 },

  sectionTitle: {
    fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.5,
    marginBottom: SPACING.md, paddingHorizontal: SPACING.screenEdge,
  },
  routeWrap: { marginTop: SPACING.xl },

  routeNode: { alignItems: 'center', width: 100 },
  routeDot: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.sm,
  },
  routeDotNum: { color: '#fff', fontWeight: '700', fontSize: 14 },
  routeNodeText: { marginTop: 6, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },
  routeNodeSub: { fontSize: 10, color: COLORS.textSecondary, letterSpacing: 1, marginTop: 2 },
  routeLine: { width: 32, height: 2, backgroundColor: COLORS.border, marginHorizontal: 4 },

  costCard: {
    marginTop: SPACING.xl, marginHorizontal: SPACING.screenEdge,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  costTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.4 },
  costGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACING.md, gap: 12 },
  costCell: {
    width: (width - SPACING.screenEdge * 2 - SPACING.lg * 2 - 12) / 2,
    paddingVertical: 10,
  },
  costValue: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.8 },
  costLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '600' },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  totalLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1, textTransform: 'uppercase' },
  totalValue: { fontSize: 22, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.5 },
  costFootnote: { fontSize: 11, color: COLORS.textTertiary, marginTop: SPACING.sm },

  parkCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.md },
  dayBadge: {
    position: 'absolute', top: 16, left: 16, zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill,
  },
  dayBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  parkImg: { width: '100%', height: 240 },
  parkImgOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 240 },
  parkImgText: { position: 'absolute', top: 180, left: 16, right: 16 },
  parkImgState: { color: '#A3B5AA', fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  parkImgName: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginTop: 2 },

  parkBody: { padding: SPACING.md },
  driveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  driveText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  parkDesc: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginTop: SPACING.sm },

  trailsTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: SPACING.md, marginBottom: SPACING.sm },

  trailRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  difficultyDot: { width: 8, height: 8, borderRadius: 4, marginTop: 8 },
  trailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trailName: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, letterSpacing: -0.2 },
  trailLen: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', marginLeft: 8 },
  trailDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, lineHeight: 17 },

  parkActions: { flexDirection: 'row', gap: 10, marginTop: SPACING.md },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  actionBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  actionText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.2 },
  actionBtnGhost: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, paddingHorizontal: 18, borderRadius: RADIUS.pill, backgroundColor: COLORS.bg,
  },
  actionTextGhost: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.2 },

  integrationsTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: SPACING.md, marginBottom: SPACING.sm },
  integrationsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  intBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  intIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  intLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.2 },
});
