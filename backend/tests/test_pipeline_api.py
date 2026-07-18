"""
Integration tests for the lead pipeline API (live server).
Covers CRUD, duplicate detection, validation, RBAC, stage movement,
import/export, recordings, settings, pagination, and audit logging.
"""
import io
import csv
import pytest
from tests.helpers import API, rand_phone, rand_email


# ---------- auth & RBAC ----------

def test_login_success(client):
    resp = client.post(f"{API}/auth/login",
                       json={"username": "admin", "password": "admin"},
                       headers={"X-Tenant-ID": "tenant-1"})
    assert resp.status_code == 200
    assert resp.json()["user"]["role"] == "Super Admin"


def test_protected_endpoint_requires_auth(client):
    resp = client.get(f"{API}/pipeline/stats", headers={"X-Tenant-ID": "tenant-1"})
    assert resp.status_code == 401


def test_invalid_tenant_header_rejected(client, admin_headers):
    headers = dict(admin_headers)
    headers["X-Tenant-ID"] = "tenant-1; select pg_sleep(2)--"
    resp = client.get(f"{API}/pipeline/stats", headers=headers)
    assert resp.status_code == 400


def test_settings_update_forbidden_for_sales(client, sales_headers):
    resp = client.put(f"{API}/pipeline/settings",
                      json={"ai_retry_limit": 5}, headers=sales_headers)
    assert resp.status_code == 403


def test_delete_forbidden_for_sales(client, sales_headers, make_raw_lead):
    lead = make_raw_lead()
    resp = client.delete(f"{API}/pipeline/leads/{lead['id']}", headers=sales_headers)
    assert resp.status_code == 403


# ---------- CRUD ----------

def test_create_raw_lead(client, admin_headers):
    payload = {"name": "CRUD Lead", "phone": rand_phone(), "email": rand_email(),
               "source": "Referral", "project": "Green Meadows", "budget": "₹1 Cr"}
    resp = client.post(f"{API}/pipeline/leads", json=payload, headers=admin_headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["stage"] == "raw"
    assert body["status"] == "Raw Lead"
    assert body["id"].startswith("PL-")


def test_read_lead(client, make_raw_lead, admin_headers):
    lead = make_raw_lead()
    resp = client.get(f"{API}/pipeline/leads/{lead['id']}", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == lead["id"]


def test_update_lead_records_history(client, make_raw_lead, admin_headers):
    lead = make_raw_lead()
    resp = client.put(f"{API}/pipeline/leads/{lead['id']}",
                      json={"budget": "₹2 Cr"}, headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["budget"] == "₹2 Cr"
    assert any("updated" in h["action"].lower() for h in resp.json()["history"])


def test_delete_lead(client, make_raw_lead, admin_headers):
    lead = make_raw_lead()
    resp = client.delete(f"{API}/pipeline/leads/{lead['id']}", headers=admin_headers)
    assert resp.status_code == 200
    # subsequent read is 404
    assert client.get(f"{API}/pipeline/leads/{lead['id']}", headers=admin_headers).status_code == 404


def test_read_missing_lead_404(client, admin_headers):
    resp = client.get(f"{API}/pipeline/leads/PL-DOES-NOT-EXIST", headers=admin_headers)
    assert resp.status_code == 404


# ---------- duplicate detection ----------

def test_duplicate_phone_rejected(client, make_raw_lead, admin_headers):
    lead = make_raw_lead()
    dup = {"name": "Dup Person", "phone": lead["phone"], "email": rand_email(),
           "source": "Referral", "project": "Green Meadows"}
    resp = client.post(f"{API}/pipeline/leads", json=dup, headers=admin_headers)
    assert resp.status_code == 409
    assert "uplicate" in resp.json()["detail"]


def test_duplicate_email_rejected(client, make_raw_lead, admin_headers):
    lead = make_raw_lead()
    dup = {"name": "Dup Email", "phone": rand_phone(), "email": lead["email"],
           "source": "Referral", "project": "Green Meadows"}
    resp = client.post(f"{API}/pipeline/leads", json=dup, headers=admin_headers)
    assert resp.status_code == 409


# ---------- validation ----------

def test_create_rejects_bad_email(client, admin_headers):
    payload = {"name": "Bad Email", "phone": rand_phone(), "email": "notanemail",
               "source": "Referral", "project": "Green Meadows"}
    resp = client.post(f"{API}/pipeline/leads", json=payload, headers=admin_headers)
    assert resp.status_code == 422  # pydantic EmailStr


# ---------- manual entry into specific stages ----------

def test_manual_entry_called_stage(client, admin_headers):
    payload = {"name": "Manual Called", "phone": rand_phone(), "email": rand_email(),
               "source": "Direct Visit", "project": "Sunrise Heights",
               "stage": "called", "interest_status": "Interested"}
    resp = client.post(f"{API}/pipeline/leads", json=payload, headers=admin_headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["stage"] == "called"
    assert body["status"] == "Called Lead"
    assert body["called_at"] is not None


def test_manual_entry_qualified_stage(client, admin_headers):
    payload = {"name": "Manual Qualified", "phone": rand_phone(), "email": rand_email(),
               "source": "Referral", "project": "Green Meadows",
               "stage": "qualified", "site_visit_status": "Scheduled"}
    resp = client.post(f"{API}/pipeline/leads", json=payload, headers=admin_headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["stage"] == "qualified"
    assert body["status"] == "Qualified Lead"
    assert body["contacted_by"]  # defaulted to acting user


def test_manual_entry_invalid_stage_rejected(client, admin_headers):
    payload = {"name": "Bad Stage", "phone": rand_phone(), "email": rand_email(),
               "source": "Referral", "project": "Green Meadows", "stage": "rejected"}
    resp = client.post(f"{API}/pipeline/leads", json=payload, headers=admin_headers)
    assert resp.status_code == 400


# ---------- stage movement ----------

def test_bulk_move_raw_to_qualified(client, make_raw_lead, admin_headers):
    lead = make_raw_lead()
    resp = client.post(f"{API}/pipeline/leads/bulk-move",
                       json={"ids": [lead["id"]], "target": "qualified"},
                       headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["moved"] == 1
    moved = client.get(f"{API}/pipeline/leads/{lead['id']}", headers=admin_headers).json()
    assert moved["stage"] == "qualified"


def test_move_to_database_creates_lead(client, make_raw_lead, admin_headers):
    lead = make_raw_lead()
    # raw -> qualified -> database
    client.post(f"{API}/pipeline/leads/bulk-move",
                json={"ids": [lead["id"]], "target": "qualified"}, headers=admin_headers)
    resp = client.post(f"{API}/pipeline/leads/bulk-move",
                       json={"ids": [lead["id"]], "target": "database"}, headers=admin_headers)
    assert resp.json()["moved"] == 1
    pl = client.get(f"{API}/pipeline/leads/{lead['id']}", headers=admin_headers).json()
    assert pl["stage"] == "database"
    assert pl["linked_record_id"].startswith("LD-")
    # the linked lead exists in the leads DB
    found = client.get(f"{API}/leads?search={lead['phone']}", headers=admin_headers).json()
    assert any(l["id"] == pl["linked_record_id"] for l in found)


def test_move_to_customer_creates_customer(client, make_raw_lead, admin_headers):
    lead = make_raw_lead()
    resp = client.post(f"{API}/pipeline/leads/bulk-move",
                       json={"ids": [lead["id"]], "target": "customer"}, headers=admin_headers)
    assert resp.json()["moved"] == 1
    pl = client.get(f"{API}/pipeline/leads/{lead['id']}", headers=admin_headers).json()
    assert pl["linked_record_id"].startswith("CUST-")


def test_invalid_bulk_move_target(client, make_raw_lead, admin_headers):
    lead = make_raw_lead()
    resp = client.post(f"{API}/pipeline/leads/bulk-move",
                       json={"ids": [lead["id"]], "target": "bogus"}, headers=admin_headers)
    assert resp.status_code == 400


# ---------- import / export ----------

def test_csv_import_validation_and_dupes(client, admin_headers):
    phone_ok = rand_phone()
    rows = [
        ["name", "phone", "email", "source", "project", "budget"],
        ["Import One", phone_ok, rand_email(), "Bulk Import", "Sunrise Heights", "₹80 L"],
        ["Al", rand_phone(), rand_email(), "Bulk Import", "Sunrise Heights", ""],       # short name OK now
        ["No Phone", "", rand_email(), "Bulk Import", "Sunrise Heights", ""],           # missing mobile -> error
        ["Dup Row", phone_ok, rand_email(), "Bulk Import", "Sunrise Heights", ""],      # dup within batch
    ]
    buf = io.StringIO()
    csv.writer(buf).writerows(rows)
    files = {"file": ("import.csv", buf.getvalue(), "text/csv")}
    resp = client.post(f"{API}/pipeline/import", files=files, headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    # Import One + short-name "Al" both import; missing-mobile errors; dup blocked
    assert body["imported"] == 2
    assert body["errors"] == 1
    assert body["duplicates"] == 1
    assert "mobile number" in body["error_details"][0]


def test_csv_import_mobile_only(client, admin_headers):
    """A row with ONLY a mobile number imports successfully; blanks get defaults."""
    phone = rand_phone()
    rows = [
        ["name", "phone", "email", "source", "project", "budget"],
        ["", phone, "", "", "", ""],
    ]
    buf = io.StringIO()
    csv.writer(buf).writerows(rows)
    files = {"file": ("mobile_only.csv", buf.getvalue(), "text/csv")}
    resp = client.post(f"{API}/pipeline/import", files=files, headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["imported"] == 1
    # the imported lead is findable by its mobile number and has placeholder defaults
    found = client.get(f"{API}/pipeline/leads?stage=raw&search={phone}", headers=admin_headers).json()
    assert found["total"] == 1
    lead = found["items"][0]
    assert lead["phone"] == phone
    assert lead["name"]  # non-empty placeholder (NOT NULL column)


def test_import_history_records_batch(client, admin_headers):
    resp = client.get(f"{API}/pipeline/imports", headers=admin_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_template_csv_and_xlsx_match(client, admin_headers):
    csv_resp = client.get(f"{API}/pipeline/import-template?format=csv", headers=admin_headers)
    xlsx_resp = client.get(f"{API}/pipeline/import-template?format=xlsx", headers=admin_headers)
    assert csv_resp.status_code == 200
    assert xlsx_resp.status_code == 200
    assert "text/csv" in csv_resp.headers["content-type"]
    assert "spreadsheetml" in xlsx_resp.headers["content-type"]
    # CSV header row has the canonical column order
    header = csv_resp.text.splitlines()[0].strip()
    assert header == "name,phone,email,source,project,budget"


def test_export_csv(client, admin_headers):
    resp = client.get(f"{API}/pipeline/export?stage=raw&format=csv", headers=admin_headers)
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]


def test_export_xlsx(client, admin_headers):
    resp = client.get(f"{API}/pipeline/export?stage=called&format=xlsx", headers=admin_headers)
    assert resp.status_code == 200
    assert "spreadsheetml" in resp.headers["content-type"]


# ---------- search / filter / sort / pagination ----------

def test_list_pagination_shape(client, admin_headers):
    resp = client.get(f"{API}/pipeline/leads?stage=called&page=1&limit=5", headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert set(body.keys()) == {"items", "total", "page", "pages"}
    assert len(body["items"]) <= 5


def test_list_search_filter(client, make_raw_lead, admin_headers):
    unique = "ZZQAUNIQUE"
    make_raw_lead(name=f"{unique} Person")
    resp = client.get(f"{API}/pipeline/leads?stage=raw&search={unique}", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1
    assert all(unique in i["name"] for i in resp.json()["items"])


def test_pagination_out_of_range_clamped(client, admin_headers):
    resp = client.get(f"{API}/pipeline/leads?stage=raw&page=9999&limit=10", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["page"] <= resp.json()["pages"]


# ---------- AI agent integration ----------

def test_ai_pending_queue(client, admin_headers):
    resp = client.get(f"{API}/pipeline/ai/pending", headers=admin_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_ai_call_result_moves_to_called(client, make_raw_lead, admin_headers):
    lead = make_raw_lead()
    resp = client.post(f"{API}/pipeline/ai/call-result", headers=admin_headers, json={
        "lead_id": lead["id"], "success": True, "interest_status": "Interested",
        "duration_seconds": 90, "outcome": "Interested - test", "summary": "ok", "confidence": 0.88
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["stage"] == "called"
    assert body["recording_available"] is True


def test_recording_available_after_call(client, make_raw_lead, admin_headers):
    lead = make_raw_lead()
    client.post(f"{API}/pipeline/ai/call-result", headers=admin_headers, json={
        "lead_id": lead["id"], "success": True, "duration_seconds": 60,
        "outcome": "x", "summary": "y", "confidence": 0.7})
    resp = client.get(f"{API}/pipeline/leads/{lead['id']}/recording", headers=admin_headers)
    assert resp.status_code == 200
    assert "audio/wav" in resp.headers["content-type"]


def test_recording_download_forbidden_for_sales(client, make_raw_lead, admin_headers, sales_headers):
    lead = make_raw_lead()
    client.post(f"{API}/pipeline/ai/call-result", headers=admin_headers, json={
        "lead_id": lead["id"], "success": True, "duration_seconds": 60,
        "outcome": "x", "summary": "y", "confidence": 0.7})
    # sales can stream (play) but not download
    play = client.get(f"{API}/pipeline/leads/{lead['id']}/recording", headers=sales_headers)
    assert play.status_code == 200
    dl = client.get(f"{API}/pipeline/leads/{lead['id']}/recording?download=true", headers=sales_headers)
    assert dl.status_code == 403


# ---------- stats / audit ----------

def test_stats_endpoint(client, admin_headers):
    resp = client.get(f"{API}/pipeline/stats", headers=admin_headers)
    assert resp.status_code == 200
    assert set(resp.json().keys()) == {"raw", "called", "qualified"}


def test_audit_log_records_manual_create(client, admin_headers):
    phone = rand_phone()
    client.post(f"{API}/pipeline/leads", headers=admin_headers, json={
        "name": "Audit Trace", "phone": phone, "email": rand_email(),
        "source": "Referral", "project": "Green Meadows"})
    logs = client.get(f"{API}/admin/logs", headers=admin_headers).json()
    assert any("created manually" in l["action"] for l in logs)


# ---------- tenant isolation ----------

def test_tenant_isolation(client, admin_headers, alt_admin_headers):
    unique_phone = rand_phone()
    client.post(f"{API}/pipeline/leads", headers=admin_headers, json={
        "name": "Isolation Lead", "phone": unique_phone, "email": rand_email(),
        "source": "Referral", "project": "Green Meadows"})
    # the alternate tenant must not see it
    resp = client.get(f"{API}/pipeline/leads?stage=raw&search={unique_phone}",
                      headers=alt_admin_headers)
    assert resp.json()["total"] == 0
