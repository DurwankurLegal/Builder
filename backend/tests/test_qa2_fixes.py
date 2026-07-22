"""
QA cycle 2 regression tests: security hardening, business rules, RBAC, and
the newly wired Follow-ups / Reports / Workspace-Settings modules.
Runs over HTTP against the live application (same rig as the rest of the suite).
"""
from datetime import date, timedelta

import pytest

from tests.helpers import API, DEFAULT_TENANT, rand_phone, rand_email


TODAY = date.today().strftime("%Y-%m-%d")
TOMORROW = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")
YESTERDAY = (date.today() - timedelta(days=1)).strftime("%Y-%m-%d")


# ============================================================
# Security regressions
# ============================================================

def test_register_endpoint_removed(client):
    """QA2-002: unauthenticated /auth/register (arbitrary roles) must be gone."""
    resp = client.post(f"{API}/auth/register", json={
        "username": "intruder", "email": "intruder@evil.com",
        "password": "hackhack", "role": "Super Admin"
    }, headers={"X-Tenant-ID": DEFAULT_TENANT})
    assert resp.status_code in (404, 405)


def test_admin_log_injection_removed(client):
    """QA2-003: unauthenticated audit-log writer must be gone."""
    resp = client.post(f"{API}/admin/logs", params={
        "action": "forged entry", "user_name": "ghost", "tenant_name": "Prestige Group"
    }, headers={"X-Tenant-ID": DEFAULT_TENANT})
    assert resp.status_code in (404, 405)


def test_login_rejected_for_public_pseudo_workspace(client):
    """
    QA2-001: the `public` schema is not a workspace. Logging into it (which
    previously auto-seeded a Super Admin with default credentials) must fail.
    """
    resp = client.post(f"{API}/auth/login",
                       json={"username": "admin", "password": "admin"},
                       headers={"X-Tenant-ID": "public"})
    assert resp.status_code == 401


def test_login_rejected_for_unprovisioned_workspace(client):
    resp = client.post(f"{API}/auth/login",
                       json={"username": "admin", "password": "admin"},
                       headers={"X-Tenant-ID": "tenant-99"})
    assert resp.status_code in (400, 401)


def test_login_without_workspace_header_rejected(client):
    """No header lands on `public` - never a valid authentication surface."""
    resp = client.post(f"{API}/auth/login",
                       json={"username": "admin", "password": "admin"})
    assert resp.status_code == 401
    assert "workspace" in resp.json()["detail"].lower()


def test_tenant_create_rejects_hostile_id(client, admin_headers):
    """Provisioning validates the tenant id before it reaches any DDL."""
    resp = client.post(f"{API}/admin/tenants", json={
        "id": "evil; DROP SCHEMA public--", "name": "Evil Corp", "subdomain": "evil",
        "tier": "Basic", "userQuota": 5, "storageQuota": 5
    }, headers=admin_headers)
    assert resp.status_code == 400


def test_provisioning_ddl_covers_all_tables():
    """
    QA2-004: workspaces provisioned via the Admin Console must receive every
    application table (the old inline DDL missed the pipeline tables, breaking
    Raw/Called/Qualified for new tenants). Provisioning now shares the seed's
    DDL list - assert it covers the full model surface.
    """
    from app.db.seed import SCHEMA_TABLES_DDL
    ddl_blob = " ".join(SCHEMA_TABLES_DDL).lower()
    for table in ("users", "leads", "customers", "bookings", "pipeline_leads",
                  "import_batches", "lead_settings", "integration_logs",
                  "followups", "workspace_settings"):
        assert f"{{schema}}.{table}" in ddl_blob, f"provisioning DDL missing table {table}"


# ============================================================
# Business rules & RBAC
# ============================================================

def test_sales_executive_cannot_create_customer(client, sales_headers):
    """SRS role matrix: 'Add Customer Profile' is admin-only."""
    resp = client.post(f"{API}/customers", json={
        "name": "RBAC Blocked", "email": rand_email(), "phone": rand_phone(),
        "address": "Test", "project": "Sunrise Heights", "budget": "₹1 Cr",
        "executive": "priya", "status": "Agreement Pending"
    }, headers=sales_headers)
    assert resp.status_code == 403


def test_admin_can_create_customer(client, admin_headers):
    resp = client.post(f"{API}/customers", json={
        "name": "QA Customer", "email": rand_email(), "phone": rand_phone(),
        "address": "Test Lane", "project": "Sunrise Heights", "budget": "₹1 Cr",
        "executive": "priya", "status": "Agreement Pending"
    }, headers=admin_headers)
    assert resp.status_code == 201


def test_convert_blocks_duplicate_customer(client, admin_headers):
    """SRS 4.1: conversion validates email/mobile against existing customers."""
    phone, email = rand_phone(), rand_email()
    # Existing customer with this phone
    resp = client.post(f"{API}/customers", json={
        "name": "Existing Owner", "email": rand_email(), "phone": phone,
        "address": "Test", "project": "Sunrise Heights", "budget": "₹1 Cr",
        "executive": "priya", "status": "Agreement Pending"
    }, headers=admin_headers)
    assert resp.status_code == 201

    # A lead sharing the phone cannot be converted
    lead = client.post(f"{API}/leads", json={
        "name": "Dup Lead", "email": email, "phone": phone,
        "project": "Sunrise Heights", "budget": "₹1 Cr",
        "source": "Referral", "executive": "priya"
    }, headers=admin_headers).json()
    resp = client.post(f"{API}/leads/{lead['id']}/convert", headers=admin_headers)
    assert resp.status_code == 409
    assert "mobile" in resp.json()["detail"].lower() or "email" in resp.json()["detail"].lower()


def test_convert_success_and_audited(client, admin_headers):
    lead = client.post(f"{API}/leads", json={
        "name": "Convertible Lead", "email": rand_email(), "phone": rand_phone(),
        "project": "Green Meadows", "budget": "₹1.2 Cr",
        "source": "Google Ads", "executive": "priya"
    }, headers=admin_headers).json()
    resp = client.post(f"{API}/leads/{lead['id']}/convert", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "Converted"

    logs = client.get(f"{API}/admin/logs", headers=admin_headers).json()
    assert any(f"Lead {lead['id']}" in l["action"] and "converted" in l["action"] for l in logs)


# ============================================================
# Follow-ups module (real backend)
# ============================================================

def test_followup_crud_and_toggle(client, admin_headers):
    created = client.post(f"{API}/followups", json={
        "client": "QA Follow Client", "activity": "Verify booking documents",
        "date": TOMORROW, "task_type": "Document"
    }, headers=admin_headers)
    assert created.status_code == 201
    task = created.json()
    assert task["status"] == "Pending"
    assert task["executive"] == "admin"  # defaults to creator

    listing = client.get(f"{API}/followups", headers=admin_headers).json()
    assert any(t["id"] == task["id"] for t in listing)

    toggled = client.post(f"{API}/followups/{task['id']}/toggle", headers=admin_headers).json()
    assert toggled["status"] == "Completed"

    deleted = client.delete(f"{API}/followups/{task['id']}", headers=admin_headers)
    assert deleted.status_code == 200


def test_followup_rejects_past_date(client, admin_headers):
    """SRS field validation: Task Date cannot be in the past."""
    resp = client.post(f"{API}/followups", json={
        "client": "Time Traveller", "activity": "Should never persist",
        "date": YESTERDAY, "task_type": "Call"
    }, headers=admin_headers)
    assert resp.status_code == 422


def test_followup_delete_requires_admin(client, admin_headers, sales_headers):
    created = client.post(f"{API}/followups", json={
        "client": "Protected Task", "activity": "Sales exec cannot delete this",
        "date": TOMORROW, "task_type": "Call"
    }, headers=admin_headers).json()
    resp = client.delete(f"{API}/followups/{created['id']}", headers=sales_headers)
    assert resp.status_code == 403
    # cleanup
    client.delete(f"{API}/followups/{created['id']}", headers=admin_headers)


def test_followups_tenant_isolated(client, admin_headers, alt_admin_headers):
    created = client.post(f"{API}/followups", json={
        "client": "Tenant1 Only", "activity": "Isolation check task",
        "date": TOMORROW, "task_type": "Call"
    }, headers=admin_headers).json()

    other = client.get(f"{API}/followups", headers=alt_admin_headers).json()
    assert not any(t["id"] == created["id"] and t["client"] == "Tenant1 Only" for t in other)
    client.delete(f"{API}/followups/{created['id']}", headers=admin_headers)


# ============================================================
# Reports & notifications (real aggregates)
# ============================================================

def test_report_summary_shape_and_consistency(client, admin_headers):
    resp = client.get(f"{API}/reports/summary", headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    for key in ("total_leads", "active_customers", "deals_closed", "deals_lost",
                "followups_today", "pending_site_visits", "monthly_sales_value",
                "booking_portfolio_value", "monthly_sales", "lead_sources",
                "executive_performance"):
        assert key in body

    # Cross-check the aggregates against the raw listings
    leads = client.get(f"{API}/leads", headers=admin_headers).json()
    customers = client.get(f"{API}/customers", headers=admin_headers).json()
    assert body["total_leads"] == len(leads)
    assert body["active_customers"] == len(customers)
    assert len(body["monthly_sales"]) == 6


def test_hirebuddha_is_default_provider():
    """New workspaces default to the HireBuddha voice provider (real calls),
    not the simulator. Verified at the schema/migration layer so it holds for
    freshly provisioned tenants regardless of persisted dev data."""
    from app.db.seed import SCHEMA_TABLES_DDL, QA2_COLUMN_MIGRATIONS
    ddl = " ".join(SCHEMA_TABLES_DDL)
    assert "ai_provider VARCHAR(50) DEFAULT 'hirebuddha'" in ddl
    assert any("ALTER COLUMN ai_provider SET DEFAULT 'hirebuddha'" in m for m in QA2_COLUMN_MIGRATIONS)


def test_inr_parser():
    from app.api.v1.reports import parse_inr
    assert parse_inr("₹85 Lakhs") == 8_500_000
    assert parse_inr("₹1.2 Crore") == 12_000_000
    assert parse_inr("1.5Cr") == 15_000_000
    assert parse_inr("₹90 Lakhs") == 9_000_000
    assert parse_inr("8500000") == 8_500_000
    assert parse_inr(None) == 0.0
    assert parse_inr("TBD") == 0.0


def test_notifications_feed(client, admin_headers):
    created = client.post(f"{API}/followups", json={
        "client": "Notify Client", "activity": "Due-today alert check",
        "date": TODAY, "task_type": "Call"
    }, headers=admin_headers).json()

    resp = client.get(f"{API}/reports/notifications", headers=admin_headers)
    assert resp.status_code == 200
    items = resp.json()
    assert any(n["type"] == "followup" and "Notify Client" in n["detail"] for n in items)
    client.delete(f"{API}/followups/{created['id']}", headers=admin_headers)


# ============================================================
# Workspace settings (real persistence)
# ============================================================

def test_workspace_settings_roundtrip(client, admin_headers):
    initial = client.get(f"{API}/settings/workspace", headers=admin_headers)
    assert initial.status_code == 200
    original_company = initial.json()["company"]

    updated = client.put(f"{API}/settings/workspace", json={
        "company": {"legal_name": "QA Estates Pvt Ltd", "gstin": "29QA0000A1Z5"}
    }, headers=admin_headers)
    assert updated.status_code == 200
    assert updated.json()["company"]["legal_name"] == "QA Estates Pvt Ltd"

    persisted = client.get(f"{API}/settings/workspace", headers=admin_headers).json()
    assert persisted["company"]["legal_name"] == "QA Estates Pvt Ltd"

    # restore
    client.put(f"{API}/settings/workspace", json={"company": original_company}, headers=admin_headers)


def test_workspace_settings_write_requires_admin(client, sales_headers):
    read = client.get(f"{API}/settings/workspace", headers=sales_headers)
    assert read.status_code == 200  # reads open to all roles
    write = client.put(f"{API}/settings/workspace",
                       json={"company": {"legal_name": "Sales Exec Takeover"}},
                       headers=sales_headers)
    assert write.status_code == 403


def test_executives_endpoint_open_to_all_roles(client, sales_headers):
    resp = client.get(f"{API}/users/executives", headers=sales_headers)
    assert resp.status_code == 200
    names = resp.json()
    assert "admin" in names and "priya" in names
