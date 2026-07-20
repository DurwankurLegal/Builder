"""
HireBuddha voice-integration tests.

Unit layer: payload building, E.164 normalization, and callback outcome
mapping — pure logic, no network or database.

HTTP layer: exercises the CRM Update API (callback endpoint), its
authentication, idempotency, and the integration log/audit surfaces against
the live application. No test ever contacts the real HireBuddha platform:
the workspace provider stays on 'simulation' (and the worker is paused by
conftest), so only the inbound callback path runs.
"""
import os
import pytest

from app.services import hirebuddha
from app.models.models import PipelineLead
from app.schemas.schemas import HireBuddhaCallback
from tests.helpers import API, DEFAULT_TENANT, REMOVED_TENANT

# Must match the HIREBUDDHA_CALLBACK_TOKEN the server under test runs with
# (docker-compose.yml sets this dev-only value; override via env for other rigs).
CALLBACK_TOKEN = os.getenv("TEST_HB_CALLBACK_TOKEN", "dev-hirebuddha-callback-token")


def callback_url(lead_id: str, tenant: str = DEFAULT_TENANT) -> str:
    return f"{API}/integrations/hirebuddha/{tenant}/leads/{lead_id}/update"


def auth_headers() -> dict:
    return {"Authorization": f"Bearer {CALLBACK_TOKEN}"}


def _skip_if_token_unconfigured(resp) -> None:
    if resp.status_code == 503:
        pytest.skip("HIREBUDDHA_CALLBACK_TOKEN not configured on the server under test")


# ============================================================
# Unit: payload building
# ============================================================

@pytest.mark.parametrize("raw,expected", [
    ("9876543210", "+919876543210"),
    ("+91 98765 43210", "+919876543210"),
    ("098765 43210", "+919876543210"),
    ("91-98765-43210", "+919876543210"),
    ("12345", None),
    ("", None),
])
def test_to_e164(raw, expected):
    assert hirebuddha.to_e164(raw) == expected


def test_split_name():
    assert hirebuddha.split_name("Rahul Sharma") == ("Rahul", "Sharma")
    assert hirebuddha.split_name("Asha Rani Verma") == ("Asha", "Rani Verma")
    assert hirebuddha.split_name("Priya") == ("Priya", "")
    assert hirebuddha.split_name("") == ("Lead", "")


def _lead(**overrides) -> PipelineLead:
    fields = dict(
        id="PL-9001", date="2026-07-20", name="Rahul Sharma",
        phone="9876543210", email="rahul@example.com", source="Google Ads",
        project="Sunrise Heights", budget="₹90 Lakhs", stage="raw",
        status="Pending Call", call_attempts=0, history=[],
    )
    fields.update(overrides)
    return PipelineLead(**fields)


def test_build_lead_payload_matches_guide_contract():
    payload = hirebuddha.build_lead_payload(_lead())
    assert payload["crm_event"] == "lead.created"
    assert payload["id"] == "PL-9001"
    props = payload["properties"]
    assert props["first_name"] == "Rahul"
    assert props["last_name"] == "Sharma"
    assert props["phone"] == "+919876543210"
    assert props["project_interested"] == "Sunrise Heights"
    assert props["ad_source"] == "Google Ads"
    assert props["budget_range"] == "₹90 Lakhs"


def test_build_lead_payload_omits_empty_fields():
    props = hirebuddha.build_lead_payload(_lead(budget=None))["properties"]
    assert "budget_range" not in props


@pytest.mark.parametrize("value,expected", [
    (200, "3m 20s"), (45, "0m 45s"), (0, None), (None, None), ("4m 05s", "4m 05s"),
])
def test_format_duration(value, expected):
    if value == 0:
        # 0 seconds is falsy input treated as absent by apply_callback
        assert hirebuddha.format_duration(value) == "0m 00s"
    else:
        assert hirebuddha.format_duration(value) == expected


# ============================================================
# Unit: callback outcome mapping
# ============================================================

def _callback(**overrides) -> HireBuddhaCallback:
    fields = dict(
        call_outcome="interested",
        call_summary="Lead keen on a 2BHK, site visit agreed.",
        ai_notes="Prefers east-facing. Discuss EMI options on the visit.",
        call_duration=185,
        call_recording_url="https://recordings.hirebuddha.com/abc123.mp3",
        next_action="site_visit_scheduled",
        next_action_date="2026-07-25T11:00:00+05:30",
        lead_temperature="hot",
        updated_at="2026-07-20T10:05:00+05:30",
    )
    fields.update(overrides)
    return HireBuddhaCallback(**fields)


def test_callback_interested_advances_to_called():
    lead = _lead(status=hirebuddha.STATUS_IN_PROGRESS, call_attempts=1)
    action = hirebuddha.apply_callback(lead, _callback(), retry_limit=3)
    assert action == "advanced"
    assert lead.stage == "called"
    assert lead.status == "AI Call Completed"
    assert lead.interest_status == "Interested"
    assert lead.disposition == "interested"
    assert lead.lead_temperature == "hot"
    assert lead.call_duration == "3m 05s"
    assert lead.call_recording_url == "https://recordings.hirebuddha.com/abc123.mp3"
    assert lead.recording_available is True
    assert lead.ai_notes.startswith("Prefers east-facing")
    assert lead.next_followup_date == "2026-07-25 11:00"
    assert lead.callback_received_at
    # dispatch already counted the attempt - the callback must not double-count
    assert lead.call_attempts == 1


def test_callback_not_interested_maps_interest():
    lead = _lead(status=hirebuddha.STATUS_IN_PROGRESS, call_attempts=1)
    action = hirebuddha.apply_callback(
        lead, _callback(call_outcome="not_interested", lead_temperature="cold"), retry_limit=3)
    assert action == "advanced"
    assert lead.interest_status == "Not Interested"


def test_callback_no_answer_schedules_retry():
    lead = _lead(status=hirebuddha.STATUS_IN_PROGRESS, call_attempts=1)
    action = hirebuddha.apply_callback(
        lead, _callback(call_outcome="no_answer", call_recording_url=None,
                        call_duration=None, lead_temperature=None), retry_limit=3)
    assert action == "retry"
    assert lead.stage == "raw"
    assert lead.status == "Call Failed - Retry Scheduled"


def test_callback_no_answer_exhausts_retry_budget():
    lead = _lead(status=hirebuddha.STATUS_IN_PROGRESS, call_attempts=3)
    action = hirebuddha.apply_callback(
        lead, _callback(call_outcome="no_answer"), retry_limit=3)
    assert action == "halted"
    assert lead.status == "Max Call Attempts Reached"


def test_callback_invalid_number_halts():
    lead = _lead(status=hirebuddha.STATUS_IN_PROGRESS, call_attempts=1)
    action = hirebuddha.apply_callback(
        lead, _callback(call_outcome="invalid_number"), retry_limit=3)
    assert action == "halted"
    assert lead.status == hirebuddha.STATUS_INVALID_NUMBER
    assert lead.stage == "raw"


def test_callback_counts_attempt_for_externally_dialled_lead():
    lead = _lead(status="Pending Call", call_attempts=0)
    hirebuddha.apply_callback(lead, _callback(), retry_limit=3)
    assert lead.call_attempts == 1


def test_callback_schema_rejects_undocumented_enums():
    with pytest.raises(ValueError):
        HireBuddhaCallback(call_outcome="exploded")
    with pytest.raises(ValueError):
        HireBuddhaCallback(call_outcome="interested", lead_temperature="volcanic")


# ============================================================
# HTTP: CRM Update API (callback endpoint)
# ============================================================

def test_callback_requires_token(client, make_raw_lead):
    lead = make_raw_lead()
    resp = client.post(callback_url(lead["id"]), json={"call_outcome": "interested"})
    _skip_if_token_unconfigured(resp)
    assert resp.status_code == 401


def test_callback_rejects_wrong_token(client, make_raw_lead):
    lead = make_raw_lead()
    resp = client.post(callback_url(lead["id"]), json={"call_outcome": "interested"},
                       headers={"Authorization": "Bearer wrong-token"})
    _skip_if_token_unconfigured(resp)
    assert resp.status_code == 401


def test_callback_unknown_workspace(client):
    resp = client.post(callback_url("PL-1", tenant=REMOVED_TENANT),
                       json={"call_outcome": "interested"}, headers=auth_headers())
    _skip_if_token_unconfigured(resp)
    assert resp.status_code == 404


def test_callback_unknown_lead(client):
    resp = client.post(callback_url("PL-DOES-NOT-EXIST"),
                       json={"call_outcome": "interested"}, headers=auth_headers())
    _skip_if_token_unconfigured(resp)
    assert resp.status_code == 404


def test_callback_body_lead_mismatch(client, make_raw_lead):
    lead = make_raw_lead()
    resp = client.post(callback_url(lead["id"]),
                       json={"lead_id": "PL-OTHER", "call_outcome": "interested"},
                       headers=auth_headers())
    _skip_if_token_unconfigured(resp)
    assert resp.status_code == 400


def test_callback_full_flow_updates_lead_and_audit(client, admin_headers, make_raw_lead):
    lead = make_raw_lead(name="HB Flow Lead")
    payload = {
        "lead_id": lead["id"],
        "call_status": "completed",
        "call_outcome": "interested",
        "call_summary": "Confirmed budget, wants a weekend site visit.",
        "ai_notes": "Send brochure on WhatsApp before the visit.",
        "call_duration": 245,
        "call_recording_url": "https://recordings.hirebuddha.com/test-rec.mp3",
        "next_action": "site_visit_scheduled",
        "next_action_date": "2026-07-26T11:00:00+05:30",
        "lead_temperature": "hot",
        "updated_at": "2026-07-20T12:00:00+05:30",
        "updated_by": "hirebuddha_agent",
    }
    resp = client.post(callback_url(lead["id"]), json=payload, headers=auth_headers())
    _skip_if_token_unconfigured(resp)
    assert resp.status_code == 200
    assert resp.json()["action"] == "advanced"

    # The lead advanced Raw -> Called with every call detail stored
    detail = client.get(f"{API}/pipeline/leads/{lead['id']}", headers=admin_headers).json()
    assert detail["stage"] == "called"
    assert detail["status"] == "AI Call Completed"
    assert detail["interest_status"] == "Interested"
    assert detail["disposition"] == "interested"
    assert detail["lead_temperature"] == "hot"
    assert detail["call_duration"] == "4m 05s"
    assert detail["call_recording_url"] == "https://recordings.hirebuddha.com/test-rec.mp3"
    assert detail["ai_notes"] == "Send brochure on WhatsApp before the visit."
    assert detail["ai_summary"].startswith("Confirmed budget")
    assert detail["next_followup_date"] == "2026-07-26 11:00"
    assert detail["callback_received_at"]
    assert any("HireBuddha" in h.get("action", "") for h in detail["history"])

    # The exchange is recorded in the integration log (admin surface)
    logs = client.get(f"{API}/integrations/hirebuddha/logs",
                      params={"lead_id": lead["id"]}, headers=admin_headers).json()
    assert any(l["direction"] == "inbound" and l["outcome"] == "Success" for l in logs)

    # A duplicate/late callback is acknowledged but ignored (idempotent)
    resp2 = client.post(callback_url(lead["id"]), json=payload, headers=auth_headers())
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "ignored"
    detail2 = client.get(f"{API}/pipeline/leads/{lead['id']}", headers=admin_headers).json()
    assert detail2["stage"] == "called"


def test_callback_no_answer_keeps_lead_raw(client, admin_headers, make_raw_lead):
    lead = make_raw_lead(name="HB NoAnswer Lead")
    resp = client.post(callback_url(lead["id"]),
                       json={"call_outcome": "no_answer"}, headers=auth_headers())
    _skip_if_token_unconfigured(resp)
    assert resp.status_code == 200
    assert resp.json()["action"] == "retry"

    detail = client.get(f"{API}/pipeline/leads/{lead['id']}", headers=admin_headers).json()
    assert detail["stage"] == "raw"
    assert detail["status"] == "Call Failed - Retry Scheduled"
    assert detail["disposition"] == "no_answer"


def test_callback_rejects_undocumented_outcome(client, make_raw_lead):
    lead = make_raw_lead()
    resp = client.post(callback_url(lead["id"]),
                       json={"call_outcome": "quantum_entangled"}, headers=auth_headers())
    _skip_if_token_unconfigured(resp)
    assert resp.status_code == 422


# ============================================================
# HTTP: admin surfaces (logs + settings RBAC)
# ============================================================

def test_integration_logs_require_admin(client, sales_headers):
    resp = client.get(f"{API}/integrations/hirebuddha/logs", headers=sales_headers)
    assert resp.status_code == 403


def test_settings_expose_provider_config(client, admin_headers):
    resp = client.get(f"{API}/pipeline/settings", headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["ai_provider"] in ("simulation", "hirebuddha")

    # Provider must be one of the supported values
    bad = client.put(f"{API}/pipeline/settings",
                     json={"ai_provider": "carrier-pigeon"}, headers=admin_headers)
    assert bad.status_code == 422
