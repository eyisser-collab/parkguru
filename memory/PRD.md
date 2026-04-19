# Park Guru — PRD (MVP)

## Vision
Park Guru is a premium, habit-forming travel-planning experience for U.S. National Parks. It combines real-time NPS data with a cinematic Apple-minimal UI so users can plan optimized multi-park road trips and build a visual collection of visited parks.

## Core User Flows
1. Explore — Cinematic dark hero screen with "Plan Your Trip" CTA, featured parks carousel, and by-state browsing.
2. Plan — Bottom-sheet modal: pick start city, trip duration (2–10 days), choose Auto (nearest-neighbor) or Manual park selection → Generate.
3. Itinerary — Animated route visual, per-day park cards (hero + 3 top trails + description), bento-style cost estimator (miles, drive hours, gas, lodging, food totals).
4. Collection — 63-park grid with grayscale unvisited / color visited, progress bar, filters.
5. Profile — Stats bento + 7 achievements (First Stamp, Trailblazer, Pathfinder, Wilderness Veteran, Golden State, Mighty Five, Halfway Home) + reset.
6. Park Detail — Full hero, gallery, top trails, activities, weather from NPS.

## Data
- Real-time NPS API (developer.nps.gov) for all 60 national parks (incl. "National Park & Preserve").
- Curated top trails overlay for 20+ flagship parks; generic fallback for others.
- Local AsyncStorage for visited parks, saved trips, achievements.

## Tech
- Frontend: Expo Router, React Native (iOS/Android/Web), Reanimated, expo-image, expo-linear-gradient, expo-haptics.
- Backend: FastAPI + httpx, in-memory 30-min cache of NPS data, nearest-neighbor route planner with Haversine, simple cost model.

## API
- GET /api/parks · GET /api/parks/{code} · GET /api/start-cities · POST /api/plan-trip

## Out of Scope
Authentication, real-time flights/hotels, social features, payments.
