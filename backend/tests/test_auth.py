import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)

def test_healthcheck():
    """
    Validates standard compliance health check routes.
    """
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "operational"

def test_metrics_prometheus():
    """
    Validates Prometheus scraping endpoints configurations.
    """
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "http_requests_total" in response.text

def test_invalid_login():
    """
    Validates authentication credentials rejection alerts (in a real
    workspace context - the X-Tenant-ID header selects the workspace).
    """
    payload = {
        "username": "invalid_user",
        "password": "wrong_password",
        "tenant_code": "tenant-1"
    }
    response = client.post(f"{settings.API_V1_STR}/auth/login", json=payload,
                           headers={"X-Tenant-ID": "tenant-1"})
    assert response.status_code == 401
    assert "Incorrect username or password" in response.json()["detail"]

# NOTE: the no-workspace-header login rejection is covered in
# tests/test_qa2_fixes.py over live HTTP - the in-process TestClient cannot
# issue two DB-backed requests (asyncpg pool binds to the first event loop).
