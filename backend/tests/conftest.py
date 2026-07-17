"""
Shared pytest fixtures for the Builder CRM test suite.

Integration and E2E tests run against the live application over HTTP (the
same uvicorn process the container serves), so the async DB, tenant schema
routing, and AI worker all exercise their real code paths.
"""
import httpx
import pytest
from tests.helpers import BASE_URL, API, DEFAULT_TENANT, ALT_TENANT, rand_phone, rand_email


@pytest.fixture(scope="session")
def client():
    with httpx.Client(base_url=BASE_URL, timeout=30) as c:
        yield c


def _login(client, tenant, username="admin", password="admin"):
    resp = client.post(f"{API}/auth/login",
                       json={"username": username, "password": password},
                       headers={"X-Tenant-ID": tenant})
    resp.raise_for_status()
    return resp.json()["access_token"]


@pytest.fixture()
def admin_headers(client):
    token = _login(client, DEFAULT_TENANT)
    return {"Authorization": f"Bearer {token}", "X-Tenant-ID": DEFAULT_TENANT}


@pytest.fixture()
def alt_admin_headers(client):
    token = _login(client, ALT_TENANT)
    return {"Authorization": f"Bearer {token}", "X-Tenant-ID": ALT_TENANT}


@pytest.fixture()
def sales_headers(client):
    """Sales Executive role (seeded user 'priya') for RBAC-negative tests."""
    token = _login(client, DEFAULT_TENANT, username="priya")
    return {"Authorization": f"Bearer {token}", "X-Tenant-ID": DEFAULT_TENANT}


@pytest.fixture(scope="session", autouse=True)
def pause_ai_agent():
    """
    Deterministic tests: pause the automatic AI calling worker for the tenants
    under test so freshly created raw leads don't get auto-moved to Called
    mid-assertion. Restored afterwards.
    """
    with httpx.Client(base_url=BASE_URL, timeout=30) as c:
        restore = {}
        for tenant in (DEFAULT_TENANT, ALT_TENANT):
            token = _login(c, tenant)
            h = {"Authorization": f"Bearer {token}", "X-Tenant-ID": tenant}
            prev = c.get(f"{API}/pipeline/settings", headers=h).json()
            restore[tenant] = (h, prev.get("ai_calling_enabled", True))
            c.put(f"{API}/pipeline/settings", json={"ai_calling_enabled": False}, headers=h)
        yield
        for tenant, (h, was_enabled) in restore.items():
            c.put(f"{API}/pipeline/settings",
                  json={"ai_calling_enabled": was_enabled}, headers=h)


@pytest.fixture()
def make_raw_lead(client, admin_headers):
    """Factory that creates a fresh raw lead and returns its JSON."""
    created = []

    def _make(**overrides):
        payload = {
            "name": overrides.get("name", "QA Raw Lead"),
            "phone": overrides.get("phone", rand_phone()),
            "email": overrides.get("email", rand_email()),
            "source": overrides.get("source", "Website Form"),
            "project": overrides.get("project", "Sunrise Heights"),
            "budget": overrides.get("budget", "₹90 Lakhs"),
        }
        if "stage" in overrides:
            payload["stage"] = overrides["stage"]
        resp = client.post(f"{API}/pipeline/leads", json=payload, headers=admin_headers)
        resp.raise_for_status()
        lead = resp.json()
        created.append(lead["id"])
        return lead

    return _make
