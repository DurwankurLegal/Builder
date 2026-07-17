"""
Unit tests for pure pipeline business logic (no DB / network).
Covers phone normalization, tenant-schema sanitization, import-row
validation, and stage-transition rules.
"""
import pytest
from app.services import pipeline_service as ps
from app.db.session import resolve_schema, InvalidTenantError
from app.api.v1.pipeline import _validate_import_row, _cell_to_text, EMAIL_RE


# ---------- phone normalization ----------

@pytest.mark.parametrize("raw,expected", [
    ("9876543210", "9876543210"),
    ("+91 98765 43210", "9876543210"),
    ("+91-98765-43210", "9876543210"),
    ("098765 43210", "9876543210"),   # leading zero, last 10 kept
    ("98765", "98765"),               # too short, returned as-is
    ("", ""),
])
def test_normalize_phone(raw, expected):
    assert ps.normalize_phone(raw) == expected


# ---------- tenant schema sanitization (security) ----------

def test_resolve_schema_valid():
    assert resolve_schema("tenant-1") == "tenant_1"
    assert resolve_schema("public") == "public"
    assert resolve_schema(None) == "public"


@pytest.mark.parametrize("hostile", [
    "public; select pg_sleep(3)--",
    "tenant-1, pg_catalog",
    "tenant-1 OR 1=1",
    "tenant$1",
    "'; DROP SCHEMA public--",
])
def test_resolve_schema_rejects_injection(hostile):
    with pytest.raises(InvalidTenantError):
        resolve_schema(hostile)


# ---------- import row validation (shared CSV/Excel) ----------

def test_validate_row_ok():
    fields, err = _validate_import_row(
        {"name": "Asha Verma", "phone": "9876543210", "email": "asha@x.com"})
    assert err is None
    assert fields["name"] == "Asha Verma"


def test_validate_row_missing_name():
    _, err = _validate_import_row({"name": "", "phone": "9876543210"})
    assert "missing name" in err


def test_validate_row_short_name():
    _, err = _validate_import_row({"name": "Al", "phone": "9876543210"})
    assert "too short" in err


def test_validate_row_missing_phone():
    _, err = _validate_import_row({"name": "Valid Name", "phone": ""})
    assert "missing phone" in err


def test_validate_row_invalid_phone():
    _, err = _validate_import_row({"name": "Valid Name", "phone": "12345"})
    assert "invalid phone" in err


def test_validate_row_invalid_email():
    _, err = _validate_import_row(
        {"name": "Valid Name", "phone": "9876543210", "email": "not-an-email"})
    assert "invalid email" in err


def test_validate_row_email_optional():
    fields, err = _validate_import_row({"name": "Valid Name", "phone": "9876543210"})
    assert err is None
    assert fields["email"] == ""


# ---------- Excel cell coercion (leading zeros / no sci-notation) ----------

def test_cell_to_text_integral_float():
    # Excel stores typed numbers as floats; must not become "9876543210.0"
    assert _cell_to_text(9876543210.0) == "9876543210"


def test_cell_to_text_none_and_str():
    assert _cell_to_text(None) == ""
    assert _cell_to_text("  hi  ") == "hi"


def test_email_regex():
    assert EMAIL_RE.match("a@b.com")
    assert not EMAIL_RE.match("a@b")
    assert not EMAIL_RE.match("plainstring")


# ---------- stage transition matrix ----------

def test_allowed_transitions():
    assert "called" in ps.ALLOWED_TRANSITIONS["raw"]
    assert "qualified" in ps.ALLOWED_TRANSITIONS["called"]
    assert "database" in ps.ALLOWED_TRANSITIONS["qualified"]
    # rejected/database/customer are terminal - no onward transitions
    assert "rejected" not in ps.ALLOWED_TRANSITIONS
    assert "customer" not in ps.ALLOWED_TRANSITIONS


def test_apply_call_success_advances_to_called():
    class Fake:
        pass
    lead = Fake()
    lead.history = []
    lead.call_attempts = 0
    lead.budget = "₹1 Cr"
    ps.apply_call_success(lead, {
        "interest_status": "Interested", "duration_seconds": 125,
        "outcome": "Interested - Site Visit", "summary": "Keen", "confidence": 0.9
    })
    assert lead.stage == "called"
    assert lead.recording_available is True
    assert lead.call_duration == "2m 05s"
    assert lead.call_attempts == 1
