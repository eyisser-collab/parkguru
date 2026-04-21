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
import { api, Park, StartCity, saveTrip } from '../../src/lib/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../src/lib/theme';

type Picker = 'start' | 'end' | null;

export default function PlanTab() {
  const router = useRouter();
  const [popular, setPopular] = useState<StartCity[]>([]);
  const [parks, setParks] = useState<Park[]>([]);
  const [startCity, setStartCity] = useState<StartCity | null>(null);
  const [endCity, setEndCity] = useState<StartCity | null>(null);
  const [sameAsStart, setSameAsStart] = useState(true);
  const [duration, setDuration] = useState(5);
  const [customDuration, setCustomDuration] = useState('');
  const [startDate, setStartDate] = useState(''); // YYYY-MM-DD
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [picker, setPicker] = useState<Picker>(null);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<StartCity[]>([]);
  const [searching, setSearching] = useState(false);
  const [planning, setPlanning] = useState(false);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    Promise.all([api.startCities(), api.listParks()]).then(([c, p]) => {
      setPopular(c);
      setParks(p);
    });
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = search.trim();
    if (q.length < 2) { setSuggestions([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try { setSuggestions(await api.geocode(q)); } catch { setSuggestions([]); }
      finally { setSearching(false); }
    }, 320);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [search]);

  const sortedParks = useMemo(() => parks.slice().sort((a, b) => a.name.localeCompare(b.name)), [parks]);

  const toggleSel = (code: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setSelected((prev) => { const n = new Set(prev); n.has(code) ? n.delete(code) : n.add(code); return n; });
  };

  const pickCity = (s: StartCity) => {
    if (picker === 'start') setStartCity(s);
    else if (picker === 'end') setEndCity(s);
    setSearch(''); setSuggestions([]); setPicker(null);
    if (Platform.OS !== 'web') Haptics.selectionAsync();
  };

  const generate = async () => {
    if (!startCity) return;
    if (mode === 'manual' && selected.size < 1) return;
    const durationNum = customDuration ? parseInt(customDuration, 10) : duration;
    if (!durationNum || durationNum < 1 || durationNum > 30) return;
    setPlanning(true);
    try {
      const body: any = {
        duration_days: durationNum,
        mode,
        start_name: startCity.name,
      };
      if (startDate) body.start_date = startDate;
      if (startCity.id.startsWith('geo_') || startCity.id === 'custom') {
        body.start_lat = startCity.lat; body.start_lng = startCity.lng;
      } else {
        body.start_city_id = startCity.id;
      }
      const effEnd = sameAsStart ? startCity : endCity;
      if (effEnd) {
        body.end_name = effEnd.name;
        if (effEnd.id.startsWith('geo_') || effEnd.id.startsWith('custom')) {
          body.end_lat = effEnd.lat; body.end_lng = effEnd.lng;
        } else {
          body.end_city_id = effEnd.id;
        }
      }
      if (mode === 'manual') body.selected_park_codes = Array.from(selected);
      const plan = await api.planTrip(body);
      await AsyncStorage.setItem('pg.currentTrip', JSON.stringify(plan));
      await saveTrip(plan);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({ pathname: '/itinerary', params: { tripId: plan.id } });
    } catch (e) {
      console.error(e);
    } finally {
      setPlanning(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.root} testID="plan-screen">
        <SafeAreaView edges={['top']} style={{ paddingHorizontal: SPACING.screenEdge, paddingBottom: SPACING.sm }}>
          <Text style={styles.h1}>Plan a trip</Text>
          <Text style={styles.sub}>Tell us where you're starting and how long you have.</Text>
        </SafeAreaView>

        <ScrollView contentContainerStyle={{ padding: SPACING.screenEdge, paddingBottom: 200 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Start & End Location */}
          <Animated.View entering={FadeInUp.duration(400)}>
            <Text style={styles.label}>From</Text>
            <TouchableOpacity
              style={styles.locBtn}
              onPress={() => { setPicker('start'); setSearch(''); }}
              testID="open-start-picker"
            >
              <Ionicons name="location" size={16} color={COLORS.primary} />
              <Text style={styles.locText} numberOfLines={1}>
                {startCity?.name || 'Choose a starting city or address'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
            </TouchableOpacity>

            <View style={[styles.rowBetween, { marginTop: SPACING.md }]}>
              <Text style={styles.label}>To</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.helper}>Round trip</Text>
                <Switch
                  value={sameAsStart}
                  onValueChange={setSameAsStart}
                  trackColor={{ false: '#E6E9E6', true: COLORS.primary }}
                  thumbColor="#fff"
                  testID="round-trip-toggle"
                />
              </View>
            </View>
            {!sameAsStart && (
              <TouchableOpacity
                style={styles.locBtn}
                onPress={() => { setPicker('end'); setSearch(''); }}
                testID="open-end-picker"
              >
                <Ionicons name="flag" size={16} color={COLORS.accent} />
                <Text style={styles.locText} numberOfLines={1}>
                  {endCity?.name || 'Choose an ending city (one-way)'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Start date (optional) */}
          <Animated.View entering={FadeInUp.delay(60).duration(400)} style={{ marginTop: SPACING.xl }}>
            <Text style={styles.label}>Start date <Text style={styles.optional}>(optional)</Text></Text>
            <View style={styles.dateBox}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
              <TextInput
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textTertiary}
                value={startDate}
                onChangeText={setStartDate}
                style={styles.dateInput}
                testID="start-date-input"
              />
            </View>
          </Animated.View>

          {/* Duration */}
          <Animated.View entering={FadeInUp.delay(120).duration(400)} style={{ marginTop: SPACING.xl }}>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Trip duration</Text>
              <Text style={styles.valueLabel}>
                {customDuration ? `${customDuration} days` : `${duration} day${duration > 1 ? 's' : ''}`}
              </Text>
            </View>
            <View style={styles.daysRow}>
              {[1,2,3,4,5,6,7,8,9,10,14].map((d) => (
                <Pressable
                  key={d}
                  onPress={() => { setDuration(d); setCustomDuration(''); }}
                  style={[styles.dayPill, !customDuration && duration === d && styles.dayPillActive]}
                  testID={`duration-${d}`}
                >
                  <Text style={[styles.dayPillText, !customDuration && duration === d && { color: '#fff' }]}>{d}</Text>
                </Pressable>
              ))}
              <View style={[styles.dateBox, { marginTop: 0, width: 130, paddingVertical: 8 }]}>
                <TextInput
                  placeholder="Custom"
                  placeholderTextColor={COLORS.textTertiary}
                  value={customDuration}
                  onChangeText={(t) => setCustomDuration(t.replace(/[^0-9]/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  style={[styles.dateInput, { fontSize: 14 }]}
                  testID="duration-custom-input"
                />
                <Text style={styles.helper}>days</Text>
              </View>
            </View>
          </Animated.View>

          {/* Mode */}
          <Animated.View entering={FadeInUp.delay(180).duration(400)} style={[styles.card, { marginTop: SPACING.xl }]}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Maximize parks near my route</Text>
                <Text style={styles.cardSub}>Auto-optimize the stops.</Text>
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

          {/* Manual park picker */}
          {mode === 'manual' && (
            <Animated.View entering={FadeInUp.duration(300)} style={{ marginTop: SPACING.lg }}>
              <Text style={styles.label}>Select parks ({selected.size})</Text>
              <Text style={styles.helper}>Tap to include.</Text>
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

        {/* Picker overlay */}
        {picker && (
          <View style={styles.pickerOverlay}>
            <SafeAreaView edges={['top']} style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setPicker(null)} style={styles.pickerBack} testID="picker-back">
                <Ionicons name="close" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>
                {picker === 'start' ? 'Starting location' : 'Ending location'}
              </Text>
              <View style={{ width: 36 }} />
            </SafeAreaView>
            <View style={{ padding: SPACING.screenEdge }}>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={16} color={COLORS.textSecondary} />
                <TextInput
                  placeholder="Search any city, airport, or address"
                  placeholderTextColor={COLORS.textTertiary}
                  value={search}
                  onChangeText={setSearch}
                  style={styles.searchInput}
                  autoFocus
                  testID="picker-search-input"
                />
                {searching && <ActivityIndicator size="small" color={COLORS.textTertiary} />}
              </View>
              {suggestions.length > 0 && (
                <Animated.View entering={FadeIn.duration(200)} style={styles.suggestList}>
                  {suggestions.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => pickCity(s)}
                      style={styles.suggestRow}
                      testID={`suggest-${s.id}`}
                    >
                      <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.suggestText} numberOfLines={1}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </Animated.View>
              )}
              {!search && (
                <>
                  <Text style={[styles.helper, { marginTop: SPACING.md }]}>Popular starts</Text>
                  <ScrollView style={{ marginTop: 8 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {popular.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => pickCity(c)}
                        style={styles.cityChip}
                        testID={`city-chip-${c.id}`}
                      >
                        <Text style={styles.cityChipText}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}
            </View>
          </View>
        )}

        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <TouchableOpacity
            style={[styles.generateBtn, (planning || !startCity) && { opacity: 0.5 }]}
            onPress={generate}
            disabled={planning || !startCity}
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
  h1: { fontSize: 34, fontWeight: '800', letterSpacing: -1, color: COLORS.textPrimary, marginTop: SPACING.md },
  sub: { fontSize: 15, color: COLORS.textSecondary, marginTop: 4 },

  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
  optional: { fontWeight: '500', color: COLORS.textTertiary, letterSpacing: 0 },
  valueLabel: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  helper: { fontSize: 12, color: COLORS.textSecondary },

  locBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, padding: 14, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  locText: { flex: 1, fontSize: 15, color: COLORS.textPrimary, fontWeight: '500' },

  dateBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: RADIUS.md,
  },
  dateInput: { flex: 1, fontSize: 15, color: COLORS.textPrimary, padding: 0 },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACING.md },
  dayPill: {
    width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  dayPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayPillText: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },

  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.3 },
  cardSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },

  parkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, padding: 12, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  parkRowActive: { borderColor: COLORS.primary + '66', backgroundColor: '#F0F5F2' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  parkRowName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  parkRowState: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.screenEdge, paddingBottom: SPACING.xxl + SPACING.lg, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border },
  generateBtn: { backgroundColor: COLORS.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 17, borderRadius: RADIUS.pill, ...SHADOWS.md },
  generateText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },

  pickerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.bg, zIndex: 10 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.screenEdge, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerBack: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  pickerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.3 },

  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 12, borderRadius: RADIUS.md },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.textPrimary, padding: 0 },
  suggestList: { backgroundColor: COLORS.surface, marginTop: 8, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  suggestRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  suggestText: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  cityChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  cityChipText: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
});
