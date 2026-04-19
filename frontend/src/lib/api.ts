import AsyncStorage from '@react-native-async-storage/async-storage';

const API = process.env.EXPO_PUBLIC_BACKEND_URL;

export type Park = {
  parkCode: string;
  name: string;
  fullName: string;
  states: string[];
  designation: string;
  description: string;
  latitude: number;
  longitude: number;
  image: string;
  gallery: string[];
  activities: string[];
  url: string;
};

export type Trail = {
  name: string;
  difficulty: string;
  length: string;
  description: string;
};

export type ParkDetail = Park & {
  trails: Trail[];
  weather: string;
  directions: string;
};

export type StartCity = { id: string; name: string; lat: number; lng: number };

export type RouteStop = {
  park: Park;
  day: number;
  drive_miles_from_prev: number;
  drive_hours_from_prev: number;
  suggested_trails: Trail[];
};

export type CostEstimate = {
  total_miles: number;
  total_drive_hours: number;
  gas_cost_usd: number;
  lodging_low_usd: number;
  lodging_high_usd: number;
  food_low_usd: number;
  food_high_usd: number;
  total_low_usd: number;
  total_high_usd: number;
  mpg_used: number;
  gas_price_used: number;
};

export type TripPlan = {
  id: string;
  created_at: string;
  start_city: StartCity;
  duration_days: number;
  stops: RouteStop[];
  cost: CostEstimate;
};

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}/api${path}`);
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

async function post<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

export const api = {
  listParks: () => get<Park[]>('/parks'),
  getPark: (code: string) => get<ParkDetail>(`/parks/${code}`),
  startCities: () => get<StartCity[]>('/start-cities'),
  planTrip: (body: {
    start_city_id: string;
    duration_days: number;
    mode: 'auto' | 'manual';
    selected_park_codes?: string[];
  }) => post<TripPlan>('/plan-trip', body),
};

// ---------- Local persistence ----------
const VISITED_KEY = 'pg.visited';
const SAVED_TRIPS_KEY = 'pg.trips';
const ACHIEVEMENTS_KEY = 'pg.achievements';

export async function getVisited(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(VISITED_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function toggleVisited(parkCode: string): Promise<string[]> {
  const cur = await getVisited();
  const idx = cur.indexOf(parkCode);
  if (idx >= 0) cur.splice(idx, 1);
  else cur.push(parkCode);
  await AsyncStorage.setItem(VISITED_KEY, JSON.stringify(cur));
  return cur;
}

export async function getSavedTrips(): Promise<TripPlan[]> {
  const raw = await AsyncStorage.getItem(SAVED_TRIPS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveTrip(trip: TripPlan) {
  const trips = await getSavedTrips();
  trips.unshift(trip);
  await AsyncStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(trips.slice(0, 50)));
}

export async function deleteTrip(id: string) {
  const trips = await getSavedTrips();
  await AsyncStorage.setItem(
    SAVED_TRIPS_KEY,
    JSON.stringify(trips.filter((t) => t.id !== id)),
  );
}

// Achievements
export type Achievement = { id: string; title: string; subtitle: string; unlockedAt: string };

export const ACHIEVEMENT_DEFS: { id: string; title: string; subtitle: string; check: (v: string[], parks: Park[]) => boolean }[] = [
  { id: 'first_park', title: 'First Stamp', subtitle: 'Visited your first national park', check: (v) => v.length >= 1 },
  { id: 'five_parks', title: 'Trailblazer', subtitle: 'Collected 5 national parks', check: (v) => v.length >= 5 },
  { id: 'ten_parks', title: 'Pathfinder', subtitle: '10 parks in the books', check: (v) => v.length >= 10 },
  { id: 'twenty_parks', title: 'Wilderness Veteran', subtitle: '20 parks visited', check: (v) => v.length >= 20 },
  { id: 'california_complete', title: 'Golden State', subtitle: 'Completed all California parks', check: (v, p) => {
      const ca = p.filter((x) => x.states.includes('CA')).map((x) => x.parkCode);
      return ca.length > 0 && ca.every((c) => v.includes(c));
  }},
  { id: 'utah_complete', title: 'Mighty Five', subtitle: 'Completed all Utah parks', check: (v, p) => {
      const ut = p.filter((x) => x.states.includes('UT')).map((x) => x.parkCode);
      return ut.length > 0 && ut.every((c) => v.includes(c));
  }},
  { id: 'half_collection', title: 'Halfway Home', subtitle: 'Visited half of all national parks', check: (v, p) => p.length > 0 && v.length >= Math.ceil(p.length / 2) },
];

export async function getAchievements(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function syncAchievements(visited: string[], parks: Park[]): Promise<string[]> {
  const unlocked = ACHIEVEMENT_DEFS.filter((a) => a.check(visited, parks)).map((a) => a.id);
  await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlocked));
  return unlocked;
}
