import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_tenant_header_injection():
    """
    Validates that active tenant headers are correctly extracted by routing middleware.
    """
    headers = {"X-Tenant-ID": "tenant-2"}
    response = client.get("/", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("X-Active-Workspace-Context") == "tenant-2"

def test_default_tenant_header():
    """
    Validates that public schemas are used by default if header details are absent.
    """
    response = client.get("/")
    assert response.status_code == 200
    assert response.headers.get("X-Active-Workspace-Context") == "public"
