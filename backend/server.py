from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import math
import time
import asyncio
import uuid
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime, timezone

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionResponse,
    CheckoutStatusResponse,
    CheckoutSessionRequest,
)

from parks_data import (
    START_CITIES,
    CURATED_TRAILS,
    generic_trails,
    DEFAULT_MPG,
    DEFAULT_GAS_PRICE,
    LODGING_PER_NIGHT_LOW,
    LODGING_PER_NIGHT_HIGH,
    FOOD_PER_DAY_LOW,
    FOOD_PER_DAY_HIGH,
    AVG_DRIVING_MPH,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

NPS_API_KEY = os.environ.get("NPS_API_KEY", "")
NPS_BASE = "https://developer.nps.gov/api/v1"
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")
NOMINATIM_BASE = "https://nominatim.openstreetmap.org"

# Fixed subscription packages (server-side only for security)
SUBSCRIPTION_PACKAGES: Dict[str, Dict[str, Any]] = {
    "premium_monthly": {"tier": "premium", "amount": 4.99, "currency": "usd", "name": "Park Guru Premium"},
    "ultra_monthly": {"tier": "ultra", "amount": 9.99, "currency": "usd", "name": "Park Guru Ultra"},
}

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# ---------- Models ----------
class Trail(BaseModel):
    name: str
    difficulty: str
    length: str
    description: str

class Park(BaseModel):
    parkCode: str
    name: str
    fullName: str
    states: List[str]
    designation: str
    description: str
    latitude: float
    longitude: float
    image: str
    gallery: List[str] = []
    activities: List[str] = []
    url: str = ""

class ParkDetail(Park):
    trails: List[Trail]
    weather: str = ""
    directions: str = ""

class StartCity(BaseModel):
    id: str
    name: str
    lat: float
    lng: float

class PlanRequest(BaseModel):
    start_city_id: Optional[str] = None
    start_lat: Optional[float] = None
    start_lng: Optional[float] = None
    start_name: Optional[str] = None
    duration_days: int = Field(ge=2, le=10)
    mode: Literal["auto", "manual"] = "auto"
    selected_park_codes: Optional[List[str]] = None
    max_drive_hours_per_day: float = 6.0

class RouteStop(BaseModel):
    park: Park
    day: int
    drive_miles_from_prev: float
    drive_hours_from_prev: float
    suggested_trails: List[Trail]

class CostEstimate(BaseModel):
    total_miles: float
    total_drive_hours: float
    gas_cost_usd: float
    lodging_low_usd: float
    lodging_high_usd: float
    food_low_usd: float
    food_high_usd: float
    total_low_usd: float
    total_high_usd: float
    mpg_used: float
    gas_price_used: float

class TripPlan(BaseModel):
    id: str
    created_at: datetime
    start_city: StartCity
    duration_days: int
    stops: List[RouteStop]
    cost: CostEstimate


# ---------- In-memory cache of parks ----------
_parks_cache: dict = {"data": [], "ts": 0.0}
CACHE_TTL = 60 * 30  # 30 minutes


def haversine_miles(lat1, lng1, lat2, lng2) -> float:
    R = 3958.8
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _parse_latlong(s: str):
    try:
        parts = dict(
            p.strip().split(":", 1) for p in s.split(",") if ":" in p
        )
        return float(parts.get("lat", "0")), float(parts.get("long", "0"))
    except Exception:
        return 0.0, 0.0


async def fetch_all_parks() -> List[dict]:
    """Fetch U.S. National Parks from NPS API, filter to designation == 'National Park'."""
    now = time.time()
    if _parks_cache["data"] and now - _parks_cache["ts"] < CACHE_TTL:
        return _parks_cache["data"]

    if not NPS_API_KEY:
        raise HTTPException(status_code=500, detail="NPS API key not configured")

    async with httpx.AsyncClient(timeout=20.0) as http:
        params = {"api_key": NPS_API_KEY, "limit": 500}
        r = await http.get(f"{NPS_BASE}/parks", params=params)
        r.raise_for_status()
        payload = r.json()

    raw = payload.get("data", [])
    parks: List[dict] = []
    # Split Sequoia & Kings Canyon into 2 separate parks so count matches official 63
    SEKI_SPLIT = {
        "seki": [
            {
                "parkCode": "sequ",
                "name": "Sequoia",
                "fullName": "Sequoia National Park",
                "states": ["CA"],
                "description": "Home to the largest tree on Earth, General Sherman, Sequoia National Park safeguards groves of giant sequoias and rugged Sierra peaks.",
                "image": "https://images.unsplash.com/photo-1600431521340-491eca880813?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85",
                "lat": 36.4864, "lng": -118.5658,
            },
            {
                "parkCode": "kica",
                "name": "Kings Canyon",
                "fullName": "Kings Canyon National Park",
                "states": ["CA"],
                "description": "Deep glacier-carved canyons, towering sequoias, and the roaring Kings River make Kings Canyon one of the wildest corners of the Sierra.",
                "image": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85",
                "lat": 36.8879, "lng": -118.5551,
            },
        ],
    }
    for p in raw:
        desg = p.get("designation", "")
        # Include specific parkCodes for parks with non-standard designations to reach official 63
        if p.get("parkCode") not in ("redw", "npsa") and desg not in (
            "National Park", "National Park & Preserve", "National Parks"
        ):
            continue

        # Split Sequoia & Kings Canyon combined entry
        if p.get("parkCode") in SEKI_SPLIT:
            images = [img.get("url") for img in p.get("images", []) if img.get("url")]
            for split in SEKI_SPLIT[p["parkCode"]]:
                parks.append({
                    "parkCode": split["parkCode"],
                    "name": split["name"],
                    "fullName": split["fullName"],
                    "states": split["states"],
                    "designation": "National Park",
                    "description": split["description"],
                    "latitude": split["lat"],
                    "longitude": split["lng"],
                    "image": split["image"],
                    "gallery": [split["image"]] + images[:5],
                    "activities": [a.get("name", "") for a in p.get("activities", [])],
                    "url": p.get("url", ""),
                    "weatherInfo": p.get("weatherInfo", ""),
                    "directionsInfo": p.get("directionsInfo", ""),
                })
            continue

        lat, lng = _parse_latlong(p.get("latLong", ""))
        if lat == 0 and lng == 0:
            try:
                lat = float(p.get("latitude") or 0)
                lng = float(p.get("longitude") or 0)
            except Exception:
                lat, lng = 0.0, 0.0
        images = [img.get("url") for img in p.get("images", []) if img.get("url")]
        parks.append(
            {
                "parkCode": p.get("parkCode", ""),
                "name": p.get("name", ""),
                "fullName": p.get("fullName", ""),
                "states": [s.strip() for s in (p.get("states", "") or "").split(",") if s.strip()],
                "designation": p.get("designation", ""),
                "description": p.get("description", ""),
                "latitude": lat,
                "longitude": lng,
                "image": images[0] if images else "",
                "gallery": images[:6],
                "activities": [a.get("name", "") for a in p.get("activities", [])],
                "url": p.get("url", ""),
                "weatherInfo": p.get("weatherInfo", ""),
                "directionsInfo": p.get("directionsInfo", ""),
            }
        )

    parks.sort(key=lambda x: x["name"])
    _parks_cache["data"] = parks
    _parks_cache["ts"] = now
    logger.info(f"Fetched {len(parks)} national parks from NPS API")
    return parks


def trails_for(park_code: str, park_name: str) -> List[dict]:
    return CURATED_TRAILS.get(park_code, generic_trails(park_name))


# ---------- Endpoints ----------
@api_router.get("/")
async def root():
    return {"message": "Park Guru API"}


@api_router.get("/start-cities", response_model=List[StartCity])
async def get_start_cities():
    return [StartCity(**c) for c in START_CITIES]


@api_router.get("/parks", response_model=List[Park])
async def list_parks():
    parks = await fetch_all_parks()
    return [Park(**p) for p in parks]


@api_router.get("/parks/{park_code}", response_model=ParkDetail)
async def get_park(park_code: str):
    parks = await fetch_all_parks()
    match = next((p for p in parks if p["parkCode"] == park_code), None)
    if not match:
        raise HTTPException(status_code=404, detail="Park not found")
    detail = {
        **match,
        "trails": trails_for(park_code, match["name"]),
        "weather": match.get("weatherInfo", ""),
        "directions": match.get("directionsInfo", ""),
    }
    return ParkDetail(**detail)


def nearest_neighbor_route(start_lat, start_lng, parks, max_stops):
    """Classic nearest-neighbor heuristic."""
    remaining = list(parks)
    route = []
    cur_lat, cur_lng = start_lat, start_lng
    for _ in range(min(max_stops, len(remaining))):
        remaining.sort(key=lambda p: haversine_miles(cur_lat, cur_lng, p["latitude"], p["longitude"]))
        nxt = remaining.pop(0)
        route.append(nxt)
        cur_lat, cur_lng = nxt["latitude"], nxt["longitude"]
    return route


@api_router.post("/plan-trip", response_model=TripPlan)
async def plan_trip(req: PlanRequest):
    # Resolve starting location: prefer explicit lat/lng, fall back to start_city_id
    if req.start_lat is not None and req.start_lng is not None:
        city = {
            "id": req.start_city_id or "custom",
            "name": req.start_name or f"{req.start_lat:.3f}, {req.start_lng:.3f}",
            "lat": req.start_lat,
            "lng": req.start_lng,
        }
    else:
        city = next((c for c in START_CITIES if c["id"] == req.start_city_id), None)
        if not city:
            raise HTTPException(status_code=400, detail="Invalid start city")

    parks = await fetch_all_parks()
    parks = [p for p in parks if p["latitude"] != 0 and p["longitude"] != 0]

    # For Alaska/Hawaii starts, focus on same-region parks only
    if city["id"] == "anc" or (city["lat"] > 58 and city["lng"] < -130):
        parks = [p for p in parks if "AK" in p["states"]]
    elif city["id"] == "hnl" or (city["lat"] < 23 and city["lng"] < -154):
        parks = [p for p in parks if "HI" in p["states"] or "AS" in p["states"]]
    else:
        parks = [
            p for p in parks
            if not any(s in ("AK", "HI", "AS", "VI") for s in p["states"])
        ]

    if req.mode == "manual" and req.selected_park_codes:
        parks = [p for p in parks if p["parkCode"] in req.selected_park_codes]
        max_stops = len(parks)
    else:
        # Auto: roughly 1 park per 1.5 days
        max_stops = max(2, min(8, round(req.duration_days / 1.5)))

    if not parks:
        raise HTTPException(status_code=400, detail="No parks available for this start")

    ordered = nearest_neighbor_route(city["lat"], city["lng"], parks, max_stops)

    # Build stops with per-leg miles/hours and assign days proportionally
    total_miles = 0.0
    legs = []
    prev_lat, prev_lng = city["lat"], city["lng"]
    for p in ordered:
        miles = haversine_miles(prev_lat, prev_lng, p["latitude"], p["longitude"]) * 1.25  # driving correction
        hours = miles / AVG_DRIVING_MPH
        legs.append((p, miles, hours))
        total_miles += miles
        prev_lat, prev_lng = p["latitude"], p["longitude"]

    # Return leg
    return_miles = haversine_miles(prev_lat, prev_lng, city["lat"], city["lng"]) * 1.25
    total_miles += return_miles
    total_drive_hours = total_miles / AVG_DRIVING_MPH

    # Day assignment: distribute stops evenly across duration
    n = len(legs)
    stops: List[RouteStop] = []
    for idx, (p, miles, hours) in enumerate(legs):
        day = 1 + int(round(idx * (req.duration_days - 1) / max(1, n))) if n > 1 else 1
        day = min(day, req.duration_days)
        stops.append(
            RouteStop(
                park=Park(**p),
                day=day,
                drive_miles_from_prev=round(miles, 1),
                drive_hours_from_prev=round(hours, 2),
                suggested_trails=[Trail(**t) for t in trails_for(p["parkCode"], p["name"])],
            )
        )

    # Cost
    gallons = total_miles / DEFAULT_MPG
    gas_cost = gallons * DEFAULT_GAS_PRICE
    lodging_low = (req.duration_days - 1) * LODGING_PER_NIGHT_LOW
    lodging_high = (req.duration_days - 1) * LODGING_PER_NIGHT_HIGH
    food_low = req.duration_days * FOOD_PER_DAY_LOW
    food_high = req.duration_days * FOOD_PER_DAY_HIGH
    cost = CostEstimate(
        total_miles=round(total_miles, 1),
        total_drive_hours=round(total_drive_hours, 1),
        gas_cost_usd=round(gas_cost, 2),
        lodging_low_usd=round(lodging_low, 2),
        lodging_high_usd=round(lodging_high, 2),
        food_low_usd=round(food_low, 2),
        food_high_usd=round(food_high, 2),
        total_low_usd=round(gas_cost + lodging_low + food_low, 2),
        total_high_usd=round(gas_cost + lodging_high + food_high, 2),
        mpg_used=DEFAULT_MPG,
        gas_price_used=DEFAULT_GAS_PRICE,
    )

    import uuid
    plan = TripPlan(
        id=str(uuid.uuid4()),
        created_at=datetime.utcnow(),
        start_city=StartCity(**city),
        duration_days=req.duration_days,
        stops=stops,
        cost=cost,
    )
    return plan


# ---------- Geocode (free-form city autocomplete) ----------
@api_router.get("/geocode")
async def geocode(q: str, limit: int = 6):
    """Proxy OpenStreetMap Nominatim for free-form location autocomplete."""
    q = (q or "").strip()
    if len(q) < 2:
        return []
    try:
        async with httpx.AsyncClient(timeout=8.0) as http:
            r = await http.get(
                f"{NOMINATIM_BASE}/search",
                params={
                    "q": q,
                    "format": "json",
                    "limit": limit,
                    "addressdetails": 1,
                    "countrycodes": "us",
                },
                headers={"User-Agent": "ParkGuru/1.0 (app@parkguru.example)"},
            )
            r.raise_for_status()
            raw = r.json()
    except Exception as e:
        logger.warning(f"Geocode failed: {e}")
        return []
    results = []
    for item in raw:
        addr = item.get("address", {}) or {}
        city = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("hamlet") or addr.get("county") or ""
        state = addr.get("state") or ""
        name = city if city else item.get("display_name", "").split(",")[0]
        label = ", ".join([p for p in [name, state] if p]) or item.get("display_name", "")
        results.append({
            "id": f"geo_{item.get('place_id')}",
            "name": label,
            "display_name": item.get("display_name", ""),
            "lat": float(item.get("lat", 0)),
            "lng": float(item.get("lon", 0)),
        })
    return results


# ---------- Stripe subscriptions ----------
class CreateCheckoutRequest(BaseModel):
    package_id: str
    origin_url: str


def _get_stripe(request: Request) -> StripeCheckout:
    host = str(request.base_url).rstrip("/")
    webhook_url = f"{host}/api/webhook/stripe"
    return StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)


@api_router.get("/subscriptions/packages")
async def list_packages():
    return [
        {"id": pid, **meta} for pid, meta in SUBSCRIPTION_PACKAGES.items()
    ]


@api_router.post("/subscriptions/checkout")
async def create_subscription_checkout(body: CreateCheckoutRequest, request: Request):
    if body.package_id not in SUBSCRIPTION_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package")
    pkg = SUBSCRIPTION_PACKAGES[body.package_id]
    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/subscribe?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/subscribe"

    stripe = _get_stripe(request)
    session: CheckoutSessionResponse = await stripe.create_checkout_session(
        CheckoutSessionRequest(
            amount=float(pkg["amount"]),
            currency=pkg["currency"],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"package_id": body.package_id, "tier": pkg["tier"], "source": "park_guru"},
        )
    )
    # Record pending transaction
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "package_id": body.package_id,
        "tier": pkg["tier"],
        "amount": float(pkg["amount"]),
        "currency": pkg["currency"],
        "payment_status": "pending",
        "status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": session.url, "session_id": session.session_id}


@api_router.get("/subscriptions/status/{session_id}")
async def subscription_status(session_id: str, request: Request):
    stripe = _get_stripe(request)
    try:
        status: CheckoutStatusResponse = await stripe.get_checkout_status(session_id)
    except Exception as e:
        logger.warning(f"Stripe status lookup failed for {session_id}: {e}")
        existing = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0}) or {}
        return {
            "session_id": session_id,
            "payment_status": existing.get("payment_status", "unknown"),
            "status": existing.get("status", "unknown"),
            "amount_total": 0,
            "currency": "usd",
            "metadata": {},
        }
    # Update db only if not already paid
    existing = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if existing and existing.get("payment_status") != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "payment_status": status.payment_status,
                "status": status.status,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
    return {
        "session_id": session_id,
        "payment_status": status.payment_status,
        "status": status.status,
        "amount_total": status.amount_total,
        "currency": status.currency,
        "metadata": status.metadata,
    }


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    stripe = _get_stripe(request)
    sig = request.headers.get("Stripe-Signature", "")
    try:
        resp = await stripe.handle_webhook(body, sig)
    except Exception as e:
        logger.warning(f"Stripe webhook error: {e}")
        return {"received": False}
    if resp.session_id:
        await db.payment_transactions.update_one(
            {"session_id": resp.session_id},
            {"$set": {
                "payment_status": resp.payment_status,
                "status": resp.event_type,
                "webhook_event_id": resp.event_id,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
    return {"received": True}


# ---------- App wiring ----------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def warm_cache():
    try:
        await fetch_all_parks()
    except Exception as e:
        logger.warning(f"Startup park cache warm failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
