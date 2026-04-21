import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { api, Park } from '../../src/lib/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../src/lib/theme';

const { width } = Dimensions.get('window');

const STATE_NAMES: Record<string, string> = {
  AK: 'Alaska', AL: 'Alabama', AR: 'Arkansas', AS: 'American Samoa',
  AZ: 'Arizona', CA: 'California', CO: 'Colorado', FL: 'Florida',
  GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IN: 'Indiana', KY: 'Kentucky',
  ME: 'Maine', MI: 'Michigan', MN: 'Minnesota', MO: 'Missouri',
  MT: 'Montana', NC: 'North Carolina', ND: 'North Dakota', NM: 'New Mexico',
  NV: 'Nevada', OH: 'Ohio', OR: 'Oregon', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VA: 'Virginia', VI: 'U.S. Virgin Islands', WA: 'Washington', WV: 'West Virginia',
  WY: 'Wyoming',
};

export default function StateScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const [parks, setParks] = useState<Park[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listParks().then((all) => {
      setParks(all.filter((p) => p.states.includes(String(code).toUpperCase())));
      setLoading(false);
    });
  }, [code]);

  const stateName = STATE_NAMES[String(code).toUpperCase()] || String(code).toUpperCase();
  const hero = parks[0]?.image;

  return (
    <View style={styles.root} testID="state-screen">
      <View style={styles.hero}>
        {hero && <Image source={{ uri: hero }} style={StyleSheet.absoluteFill} contentFit="cover" />}
        <LinearGradient
          colors={['rgba(8,11,9,0.2)', 'rgba(8,11,9,0.85)']}
          locations={[0.3, 1]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView edges={['top']} style={styles.heroInner}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="state-back">
            <Ionicons name="chevron-back" size={24} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <Text style={styles.heroOverline}>{parks.length} NATIONAL PARK{parks.length !== 1 ? 'S' : ''}</Text>
          <Text style={styles.heroTitle}>{stateName}</Text>
        </SafeAreaView>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={parks}
          keyExtractor={(p) => p.parkCode}
          contentContainerStyle={{ padding: SPACING.screenEdge, paddingBottom: 140, gap: SPACING.md }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 60).duration(450)}>
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => router.push(`/park/${item.parkCode}`)}
                testID={`state-park-${item.parkCode}`}
              >
                <Image source={{ uri: item.image }} style={styles.cardImg} contentFit="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.85)']}
                  locations={[0.4, 1]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.cardMeta}>
                  <Text style={styles.cardOverline}>{item.designation}</Text>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
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
  hero: { height: 260, backgroundColor: COLORS.bgDark, overflow: 'hidden' },
  heroInner: { flex: 1, padding: SPACING.screenEdge },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 8, marginLeft: -8, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: RADIUS.pill, paddingRight: 14 },
  backText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  heroOverline: { color: '#A3B5AA', fontSize: 11, letterSpacing: 2, fontWeight: '700' },
  heroTitle: { color: '#fff', fontSize: 38, fontWeight: '800', letterSpacing: -1, marginTop: 4 },

  card: { height: 200, borderRadius: RADIUS.lg, overflow: 'hidden', backgroundColor: COLORS.surfaceDark, ...SHADOWS.sm },
  cardImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  cardMeta: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.md },
  cardOverline: { color: '#A3B5AA', fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  cardName: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  cardDesc: { color: '#D5DFD9', fontSize: 13, marginTop: 6, lineHeight: 18 },
});
