# Park Guru — PRD (v2)

## Vision
Park Guru is a premium, habit-forming travel-planning experience for U.S. National Parks. Cinematic Apple-minimal UI + real-time NPS data + optimized routing + collection/achievement loop + subscription revenue.

## Core Flows
1. **Explore** — Cinematic dark hero + "Plan Your Trip" CTA + featured parks carousel + **ALL** states browsable.
2. **Plan** — Bottom-sheet modal: **free-form city autocomplete** (OpenStreetMap Nominatim), popular quick-picks, duration 2–10 days, Auto/Manual mode.
3. **Itinerary** — Route visual + cost bento + per-park cards with top trails **+ deep-link buttons: Booking.com / Airbnb / VRBO / AllTrails / Google Calendar**.
4. **Trips** — Saved trips + **6 suggested trip templates** with cinematic imagery (Mighty Five, Pacific NW Giants, Desert Southwest, Alaska Wild, Smoky & Shenandoah, California Dream). Taps generate real plans.
5. **Collection** — **63**-park grid (full official count), grayscale unvisited / color visited, progress bar, filters. **Confetti cannon** on first visit, **photo upload + share** via long-press modal.
6. **Profile** — Stats + achievements + **Upgrade card** → Subscribe modal with 3 tiers (Free / Premium $4.99 / Ultra $9.99).
7. **Subscribe** — Full cinematic paywall with feature comparison, Stripe Checkout (test mode, no real charges), polling for payment status.

## Data / APIs
- **NPS API** for 63 parks (includes Sequoia + Kings Canyon split + Redwood + American Samoa).
- **Nominatim** (OSM) for free-form city geocoding — no key needed.
- **Stripe Checkout** via `emergentintegrations` (test key), `payment_transactions` collection in MongoDB.
- **AsyncStorage** for visited parks, saved trips, achievements, visitedPhotos, current tier.

## Backend Endpoints
- `GET /api/parks` (63), `GET /api/parks/{code}`
- `GET /api/start-cities`, `GET /api/geocode?q=`
- `POST /api/plan-trip` (accepts start_city_id OR start_lat/lng/start_name)
- `GET /api/subscriptions/packages`, `POST /api/subscriptions/checkout`
- `GET /api/subscriptions/status/{session_id}` (graceful unknown), `POST /api/webhook/stripe`

## Integrations Policy
- **Real, working**: NPS API, OpenStreetMap geocoding, Stripe Checkout (test).
- **Deep-links only** (no true API): Airbnb, VRBO, Booking.com, AllTrails, Google Calendar. Clearly labeled "coming soon" for Capital One/Gmail/Calendar ingest.

## Out of Scope
- Real-time flights, in-app hotel booking, social graph, auth.

## Monetization
- Subscription tiers (Premium/Ultra) wired to Stripe test mode.
- Ready to add Booking.com affiliate program (user plans to enroll).
