"""Park Guru backend API tests - iteration 2 coverage.
Covers: parks (63), geocode, plan-trip custom coords, subscriptions (Stripe).
"""
import os
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/") if os.environ.get("EXPO_PUBLIC_BACKEND_URL") else "https://park-passport.preview.emergentagent.com"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Parks list: expect exactly 63 including sequ/kica/redw/npsa, no seki ---
class TestParks:
    def test_list_parks_63(self, client):
        r = client.get(f"{BASE_URL}/api/parks", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        codes = {p["parkCode"] for p in data}
        assert len(data) == 63, f"Expected 63 parks, got {len(data)}: codes={sorted(codes)}"
        for required in ("sequ", "kica", "redw", "npsa"):
            assert required in codes, f"Missing expected parkCode {required}"
        assert "seki" not in codes, "Combined seki should NOT be present"

    def test_get_park_detail_sequ(self, client):
        r = client.get(f"{BASE_URL}/api/parks/sequ", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["parkCode"] == "sequ"
        assert len(d.get("trails", [])) >= 3

    def test_get_park_detail_kica(self, client):
        r = client.get(f"{BASE_URL}/api/parks/kica", timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["parkCode"] == "kica"

    def test_get_park_404(self, client):
        r = client.get(f"{BASE_URL}/api/parks/xxxx", timeout=15)
        assert r.status_code == 404


# --- Start cities ---
class TestStartCities:
    def test_list_start_cities(self, client):
        r = client.get(f"{BASE_URL}/api/start-cities", timeout=15)
        assert r.status_code == 200
        assert len(r.json()) >= 15


# --- Geocode (OSM Nominatim proxy) ---
class TestGeocode:
    def test_geocode_denver(self, client):
        r = client.get(f"{BASE_URL}/api/geocode", params={"q": "denver"}, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Expected non-empty geocode results for 'denver'"
        item = data[0]
        for k in ("id", "name", "lat", "lng"):
            assert k in item, f"Missing key {k}"
        assert isinstance(item["lat"], (int, float))
        assert isinstance(item["lng"], (int, float))

    def test_geocode_too_short(self, client):
        r = client.get(f"{BASE_URL}/api/geocode", params={"q": "a"}, timeout=10)
        assert r.status_code == 200
        assert r.json() == []


# --- Plan trip with custom coords ---
class TestPlanTripCustom:
    def test_plan_custom_coords(self, client):
        r = client.post(f"{BASE_URL}/api/plan-trip", json={
            "start_lat": 39.74,
            "start_lng": -104.99,
            "start_name": "Custom City",
            "duration_days": 5,
            "mode": "auto",
        }, timeout=30)
        assert r.status_code == 200, r.text
        plan = r.json()
        assert plan["duration_days"] == 5
        assert plan["start_city"]["name"] == "Custom City"
        assert abs(plan["start_city"]["lat"] - 39.74) < 0.01
        assert abs(plan["start_city"]["lng"] - (-104.99)) < 0.01
        assert len(plan["stops"]) >= 2
        assert "cost" in plan


# --- Subscriptions ---
class TestSubscriptions:
    def test_list_packages(self, client):
        r = client.get(f"{BASE_URL}/api/subscriptions/packages", timeout=15)
        assert r.status_code == 200, r.text
        pkgs = r.json()
        assert isinstance(pkgs, list)
        by_id = {p["id"]: p for p in pkgs}
        assert "premium_monthly" in by_id
        assert "ultra_monthly" in by_id
        assert abs(by_id["premium_monthly"]["amount"] - 4.99) < 0.001
        assert abs(by_id["ultra_monthly"]["amount"] - 9.99) < 0.001
        assert by_id["premium_monthly"]["tier"] == "premium"
        assert by_id["ultra_monthly"]["tier"] == "ultra"

    def test_checkout_valid(self, client):
        r = client.post(f"{BASE_URL}/api/subscriptions/checkout", json={
            "package_id": "premium_monthly",
            "origin_url": "https://park-passport.preview.emergentagent.com",
        }, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "url" in data and data["url"].startswith("http")
        assert "session_id" in data and data["session_id"]
        # Verify status endpoint reachable for this session
        sid = data["session_id"]
        s = client.get(f"{BASE_URL}/api/subscriptions/status/{sid}", timeout=20)
        assert s.status_code == 200, s.text
        sdata = s.json()
        assert sdata["session_id"] == sid
        assert "payment_status" in sdata
        assert "status" in sdata

    def test_checkout_invalid_package(self, client):
        r = client.post(f"{BASE_URL}/api/subscriptions/checkout", json={
            "package_id": "bogus_plan",
            "origin_url": "https://park-passport.preview.emergentagent.com",
        }, timeout=15)
        assert r.status_code == 400
