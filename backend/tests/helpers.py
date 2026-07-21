"""Shared constants and helpers for the test suite (safe to import anywhere)."""
import os
import random
import string

BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")
API = "/api/v1"

DEFAULT_TENANT = "tenant-1"
# A second real provisioned workspace for cross-tenant isolation tests.
# (The `public` schema is no longer a valid login surface: the QA security
# pass restricted authentication to workspaces in the tenant directory.)
ALT_TENANT = "tenant-2"
# A workspace that is never provisioned - used to assert unknown tenants are
# rejected instead of silently falling through to `public`.
REMOVED_TENANT = "tenant-99"


def rand_phone() -> str:
    return "9" + "".join(random.choices(string.digits, k=9))


def rand_email(prefix="qa") -> str:
    return f"{prefix}.{''.join(random.choices(string.ascii_lowercase, k=8))}@qa-test.com"
