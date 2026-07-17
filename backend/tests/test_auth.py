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
    Validates authentication credentials rejection alerts.
    """
    payload = {
        "username": "invalid_user",
        "password": "wrong_password",
        "tenant_code": "tenant-1"
    }
    response = client.post(f"{settings.API_V1_STR}/auth/login", json=payload)
    assert response.status_code == 401
    assert "Incorrect username or password" in response.json()["detail"]
