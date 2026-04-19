import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { getSavedTrips, deleteTrip, TripPlan } from '../../src/lib/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../src/lib/theme';

export default function Trips() {
  const router = useRouter();
  const [trips, setTrips] = useState<TripPlan[]>([]);

  useFocusEffect(
    useCallback(() => {
      getSavedTrips().then(setTrips);
    }, [])
  );

  const remove = (id: string) => {
    Alert.alert('Delete trip?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteTrip(id);
          setTrips(await getSavedTrips());
        },
      },
    ]);
  };

  return (
    <View style={styles.root} testID="trips-screen">
      <SafeAreaView edges={['top']} style={{ paddingHorizontal: SPACING.screenEdge }}>
        <Text style={styles.h1}>Your Trips</Text>
        <Text style={styles.sub}>Saved adventures ready to roll.</Text>
      </SafeAreaView>

      {trips.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="map-outline" size={48} color={COLORS.textTertiary} />
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.emptySub}>Plan your first adventure from the Explore tab.</Text>
          <TouchableOpacity
            style={styles.emptyCta}
            onPress={() => router.push('/plan')}
            testID="empty-plan-cta"
          >
            <Text style={styles.emptyCtaText}>Plan a Trip</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: SPACING.screenEdge, paddingBottom: 120, gap: SPACING.md }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 60).duration(450)}>
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
                    {item.stops.map((s) => s.park.name.replace(' National Park', '')).join(' → ')}
                  </Text>
                  <Text style={styles.cardMeta}>
                    From {item.start_city.name} · ${item.cost.total_low_usd.toFixed(0)}–{item.cost.total_high_usd.toFixed(0)}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  h1: { fontSize: 34, fontWeight: '800', letterSpacing: -1, color: COLORS.textPrimary, marginTop: SPACING.md },
  sub: { fontSize: 15, color: COLORS.textSecondary, marginTop: 4, marginBottom: SPACING.lg },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxl, gap: SPACING.sm },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.5, marginTop: SPACING.sm },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', maxWidth: 280 },
  emptyCta: { marginTop: SPACING.md, backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: RADIUS.pill },
  emptyCtaText: { color: '#fff', fontWeight: '700', letterSpacing: -0.2 },

  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.sm, borderWidth: 1, borderColor: COLORS.border },
  cardImg: { width: '100%', height: 180 },
  cardBody: { padding: SPACING.md },
  cardOverline: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  cardTitle: { fontSize: 19, fontWeight: '700', color: COLORS.textPrimary, marginTop: 6, letterSpacing: -0.4 },
  cardMeta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
});
