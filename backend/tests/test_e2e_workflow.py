"""
End-to-end workflow tests exercising complete user journeys across the
lead lifecycle, from acquisition through qualification to conversion,
asserting database state and audit trails at each hop.
"""
from tests.helpers import API, rand_phone, rand_email


def _create_raw(client, headers, **kw):
    payload = {
        "name": kw.get("name", "E2E Lead"),
        "phone": kw.get("phone", rand_phone()),
        "email": kw.get("email", rand_email()),
        "source": kw.get("source", "Website Form"),
        "project": kw.get("project", "Sunrise Heights"),
        "budget": kw.get("budget", "₹90 Lakhs"),
    }
    resp = client.post(f"{API}/pipeline/leads", json=payload, headers=headers)
    resp.raise_for_status()
    return resp.json()


def test_full_lifecycle_raw_to_customer(client, admin_headers):
    """Raw -> AI call -> Called -> Qualified -> Active Customer, with history preserved."""
    lead = _create_raw(client, admin_headers, name="Lifecycle Prospect")
    lead_id = lead["id"]
    assert lead["stage"] == "raw"

    # AI completes a call -> Called
    r = client.post(f"{API}/pipeline/ai/call-result", headers=admin_headers, json={
        "lead_id": lead_id, "success": True, "interest_status": "Interested",
        "duration_seconds": 140, "outcome": "Interested - Site Visit",
        "summary": "Very keen", "confidence": 0.93})
    assert r.status_code == 200 and r.json()["stage"] == "called"

    # Sales qualifies the lead
    client.post(f"{API}/pipeline/leads/bulk-move", headers=admin_headers,
                json={"ids": [lead_id], "target": "qualified"})

    # Enrich qualification details
    client.put(f"{API}/pipeline/leads/{lead_id}", headers=admin_headers, json={
        "site_visit_status": "Completed", "loan_requirement": "Pre-Approved",
        "next_followup_date": "2026-08-01", "remarks": "Ready to book"})

    # Convert to customer
    mv = client.post(f"{API}/pipeline/leads/bulk-move", headers=admin_headers,
                     json={"ids": [lead_id], "target": "customer"})
    assert mv.json()["moved"] == 1

    final = client.get(f"{API}/pipeline/leads/{lead_id}", headers=admin_headers).json()
    assert final["stage"] == "customer"
    assert final["linked_record_id"].startswith("CUST-")

    # History captured every stage transition (preserved through lifecycle)
    actions = " ".join(h["action"] for h in final["history"])
    assert "Raw" in actions
    assert "AI call" in actions
    assert "Called Leads -> Qualified Leads" in actions
    assert "Active Customers" in actions

    # Customer exists in the customers registry
    cust = client.get(f"{API}/customers", headers=admin_headers).json()
    assert any(c["id"] == final["linked_record_id"] for c in cust)


def test_lifecycle_reject_path(client, admin_headers):
    lead = _create_raw(client, admin_headers, name="Reject Path")
    client.post(f"{API}/pipeline/ai/call-result", headers=admin_headers, json={
        "lead_id": lead["id"], "success": True, "interest_status": "Not Interested",
        "duration_seconds": 40, "outcome": "Not Interested", "summary": "no", "confidence": 0.8})
    mv = client.post(f"{API}/pipeline/leads/bulk-move", headers=admin_headers,
                     json={"ids": [lead["id"]], "target": "rejected"})
    assert mv.json()["moved"] == 1
    assert client.get(f"{API}/pipeline/leads/{lead['id']}", headers=admin_headers).json()["stage"] == "rejected"


def test_qualified_to_leads_database_continues_sales_flow(client, admin_headers):
    """Qualified lead handed to the existing CRM sales workflow (Leads Database)."""
    lead = _create_raw(client, admin_headers, name="Handoff Lead", stage=None)
    # move raw -> qualified -> database
    client.post(f"{API}/pipeline/leads/bulk-move", headers=admin_headers,
                json={"ids": [lead["id"]], "target": "qualified"})
    client.post(f"{API}/pipeline/leads/bulk-move", headers=admin_headers,
                json={"ids": [lead["id"]], "target": "database"})
    pl = client.get(f"{API}/pipeline/leads/{lead['id']}", headers=admin_headers).json()
    ld_id = pl["linked_record_id"]
    assert ld_id.startswith("LD-")
    # The lead now lives in the classic Leads Database and is updatable there
    got = client.get(f"{API}/leads/{ld_id}", headers=admin_headers)
    assert got.status_code == 200
    assert got.json()["status"] == "Qualified"


def test_bulk_operations_end_to_end(client, admin_headers):
    ids = [_create_raw(client, admin_headers, name=f"Bulk {i}")["id"] for i in range(3)]
    mv = client.post(f"{API}/pipeline/leads/bulk-move", headers=admin_headers,
                     json={"ids": ids, "target": "qualified"})
    assert mv.json()["moved"] == 3
    for lid in ids:
        assert client.get(f"{API}/pipeline/leads/{lid}", headers=admin_headers).json()["stage"] == "qualified"
