"""Park Guru backend API tests - covers parks, start-cities, and plan-trip flows."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://park-passport.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Parks list ---
class TestParks:
    def test_list_parks_returns_many(self, client):
        r = client.get(f"{BASE_URL}/api/parks", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        # Expect around 60 US national parks; allow some variance
        assert len(data) >= 55, f"Only {len(data)} parks returned"
        p = data[0]
        for k in ("parkCode", "name", "states", "latitude", "longitude", "image", "gallery", "activities"):
            assert k in p, f"Missing {k}"

    def test_get_park_detail_curated(self, client):
        # Curated trails for yose
        r = client.get(f"{BASE_URL}/api/parks/yose", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["parkCode"] == "yose"
        assert isinstance(d.get("trails"), list) and len(d["trails"]) >= 3
        assert "description" in d

    def test_get_park_detail_generic(self, client):
        r = client.get(f"{BASE_URL}/api/parks/acad", timeout=30)
        assert r.status_code == 200
        assert len(r.json()["trails"]) >= 3

    def test_get_park_404(self, client):
        r = client.get(f"{BASE_URL}/api/parks/xxxx", timeout=30)
        assert r.status_code == 404


# --- Start cities ---
class TestStartCities:
    def test_list_start_cities(self, client):
        r = client.get(f"{BASE_URL}/api/start-cities", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 15
        c = data[0]
        for k in ("id", "name", "lat", "lng"):
            assert k in c


# --- Plan trip ---
class TestPlanTrip:
    def test_plan_auto_las_5(self, client):
        r = client.post(f"{BASE_URL}/api/plan-trip", json={
            "start_city_id": "las", "duration_days": 5, "mode": "auto"
        }, timeout=30)
        assert r.status_code == 200, r.text
        plan = r.json()
        assert plan["duration_days"] == 5
        assert plan["start_city"]["id"] == "las"
        assert len(plan["stops"]) >= 2
        stop = plan["stops"][0]
        assert "park" in stop and "day" in stop
        assert "drive_miles_from_prev" in stop
        assert "drive_hours_from_prev" in stop
        assert len(stop["suggested_trails"]) == 3
        cost = plan["cost"]
        for k in ("total_miles", "total_drive_hours", "gas_cost_usd", "total_low_usd", "total_high_usd"):
            assert k in cost
            assert isinstance(cost[k], (int, float))

    def test_plan_manual_three_parks(self, client):
        r = client.post(f"{BASE_URL}/api/plan-trip", json={
            "start_city_id": "las",
            "duration_days": 7,
            "mode": "manual",
            "selected_park_codes": ["yose", "zion", "grca"]
        }, timeout=30)
        assert r.status_code == 200, r.text
        plan = r.json()
        codes = sorted([s["park"]["parkCode"] for s in plan["stops"]])
        assert codes == ["grca", "yose", "zion"]

    def test_plan_invalid_city(self, client):
        r = client.post(f"{BASE_URL}/api/plan-trip", json={
            "start_city_id": "zzz", "duration_days": 5, "mode": "auto"
        }, timeout=15)
        assert r.status_code == 400

    def test_plan_duration_too_short(self, client):
        r = client.post(f"{BASE_URL}/api/plan-trip", json={
            "start_city_id": "las", "duration_days": 1, "mode": "auto"
        }, timeout=15)
        assert r.status_code == 422
