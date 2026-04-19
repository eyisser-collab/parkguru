import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator,
  TextInput, Pressable, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { api, Park, StartCity, saveTrip } from '../src/lib/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../src/lib/theme';

export default function PlanModal() {
  const router = useRouter();
  const [popular, setPopular] = useState<StartCity[]>([]);
  const [parks, setParks] = useState<Park[]>([]);
  const [selectedCity, setSelectedCity] = useState<StartCity | null>(null);
  const [duration, setDuration] = useState(5);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [citySearch, setCitySearch] = useState('');
  const [suggestions, setSuggestions] = useState<StartCity[]>([]);
  const [searching, setSearching] = useState(false);
  const [planning, setPlanning] = useState(false);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    Promise.all([api.startCities(), api.listParks()]).then(([c, p]) => {
      setPopular(c);
      setParks(p);
      setSelectedCity(c[2] || c[0]); // Default: Las Vegas
    });
  }, []);

  // Debounced geocode
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = citySearch.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await api.geocode(q);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 320);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [citySearch]);

  const sortedParks = useMemo(() => parks.slice().sort((a, b) => a.name.localeCompare(b.name)), [parks]);

  const toggleSel = (code: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(code)) n.delete(code); else n.add(code);
      return n;
    });
  };

  const pickSuggestion = (s: StartCity) => {
    setSelectedCity(s);
    setCitySearch('');
    setSuggestions([]);
    if (Platform.OS !== 'web') Haptics.selectionAsync();
  };

  const generate = async () => {
    if (!selectedCity) return;
    if (mode === 'manual' && selected.size < 2) return;
    setPlanning(true);
    try {
      const body: any = {
        duration_days: duration,
        mode,
        start_name: selectedCity.name,
      };
      if (selectedCity.id.startsWith('geo_') || selectedCity.id === 'custom') {
        body.start_lat = selectedCity.lat;
        body.start_lng = selectedCity.lng;
      } else {
        body.start_city_id = selectedCity.id;
      }
      if (mode === 'manual') body.selected_park_codes = Array.from(selected);
      const plan = await api.planTrip(body);
      await AsyncStorage.setItem('pg.currentTrip', JSON.stringify(plan));
      await saveTrip(plan);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({ pathname: '/itinerary', params: { tripId: plan.id } });
    } catch (e) {
      console.error(e);
    } finally {
      setPlanning(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.root} testID="plan-modal">
        <SafeAreaView edges={['top']} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} testID="plan-close">
            <Ionicons name="close" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Plan your trip</Text>
          <View style={{ width: 36 }} />
        </SafeAreaView>

        <ScrollView contentContainerStyle={{ padding: SPACING.screenEdge, paddingBottom: 180 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.duration(400)}>
            <Text style={styles.label}>Starting from</Text>
            {selectedCity && !citySearch && (
              <View style={styles.selectedChip}>
                <Ionicons name="location" size={14} color={COLORS.primary} />
                <Text style={styles.selectedChipText} numberOfLines={1}>{selectedCity.name}</Text>
                <TouchableOpacity onPress={() => setSelectedCity(null)} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={16} color={COLORS.textTertiary} />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color={COLORS.textSecondary} />
              <TextInput
                placeholder="Search any city, airport, or address"
                placeholderTextColor={COLORS.textTertiary}
                value={citySearch}
                onChangeText={setCitySearch}
                style={styles.searchInput}
                testID="city-search-input"
              />
              {searching && <ActivityIndicator size="small" color={COLORS.textTertiary} />}
            </View>

            {suggestions.length > 0 && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.suggestList}>
                {suggestions.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => pickSuggestion(s)}
                    style={styles.suggestRow}
                    testID={`suggest-${s.id}`}
                  >
                    <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.suggestText} numberOfLines={1}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </Animated.View>
            )}

            {!citySearch && (
              <>
                <Text style={[styles.helper, { marginTop: SPACING.md }]}>Popular starts</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 8, paddingRight: 20 }}>
                    {popular.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => pickSuggestion(c)}
                        style={[styles.cityChip, selectedCity?.id === c.id && styles.cityChipActive]}
                        testID={`city-chip-${c.id}`}
                      >
                        <Text style={[styles.cityChipText, selectedCity?.id === c.id && { color: '#fff' }]}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(80).duration(400)} style={{ marginTop: SPACING.xl }}>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Trip duration</Text>
              <Text style={styles.valueLabel}>{duration} days</Text>
            </View>
            <View style={styles.daysRow}>
              {[2,3,4,5,6,7,8,9,10].map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setDuration(d)}
                  style={[styles.dayPill, duration === d && styles.dayPillActive]}
                  testID={`duration-${d}`}
                >
                  <Text style={[styles.dayPillText, duration === d && { color: '#fff' }]}>{d}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(160).duration(400)} style={[styles.card, { marginTop: SPACING.xl }]}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Maximize parks near me</Text>
                <Text style={styles.cardSub}>Let Park Guru pick the optimal route.</Text>
              </View>
              <Switch
                value={mode === 'auto'}
                onValueChange={(v) => setMode(v ? 'auto' : 'manual')}
                trackColor={{ false: '#E6E9E6', true: COLORS.primary }}
                thumbColor="#fff"
                testID="mode-toggle"
              />
            </View>
          </Animated.View>

          {mode === 'manual' && (
            <Animated.View entering={FadeInUp.duration(300)} style={{ marginTop: SPACING.lg }}>
              <Text style={styles.label}>Select parks ({selected.size})</Text>
              <Text style={styles.helper}>Tap at least 2 parks to include.</Text>
              <View style={{ gap: 8, marginTop: SPACING.md }}>
                {sortedParks.map((p) => {
                  const isSel = selected.has(p.parkCode);
                  return (
                    <TouchableOpacity
                      key={p.parkCode}
                      onPress={() => toggleSel(p.parkCode)}
                      style={[styles.parkRow, isSel && styles.parkRowActive]}
                      testID={`select-park-${p.parkCode}`}
                    >
                      <View style={[styles.checkbox, isSel && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
                        {isSel && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.parkRowName}>{p.name}</Text>
                        <Text style={styles.parkRowState}>{p.states.join(' · ')}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          )}
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <TouchableOpacity
            style={[styles.generateBtn, (planning || !selectedCity) && { opacity: 0.5 }]}
            onPress={generate}
            disabled={planning || !selectedCity || (mode === 'manual' && selected.size < 2)}
            activeOpacity={0.85}
            testID="generate-trip-btn"
          >
            {planning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.generateText}>Generate Trip</Text>
                <Ionicons name="sparkles" size={16} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.screenEdge, paddingBottom: SPACING.md, backgroundColor: COLORS.bg,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.3 },

  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1.2, textTransform: 'uppercase' },
  valueLabel: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  helper: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },

  selectedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary + '14', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: RADIUS.pill, alignSelf: 'flex-start', marginTop: SPACING.sm,
  },
  selectedChipText: { color: COLORS.primary, fontSize: 13, fontWeight: '700', maxWidth: 260 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: RADIUS.md, marginTop: SPACING.sm,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.textPrimary, padding: 0 },

  suggestList: {
    backgroundColor: COLORS.surface, marginTop: 8, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  suggestRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  suggestText: { flex: 1, fontSize: 14, color: COLORS.textPrimary },

  cityChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.pill,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  cityChipActive: { backgroundColor: COLORS.textPrimary, borderColor: COLORS.textPrimary },
  cityChipText: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACING.md },
  dayPill: {
    width: 48, height: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  dayPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayPillText: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },

  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.3 },
  cardSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },

  parkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, padding: 12, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  parkRowActive: { borderColor: COLORS.primary + '66', backgroundColor: '#F0F5F2' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  parkRowName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  parkRowState: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.screenEdge,
    backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  generateBtn: {
    backgroundColor: COLORS.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 17, borderRadius: RADIUS.pill, ...SHADOWS.md,
  },
  generateText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
});
