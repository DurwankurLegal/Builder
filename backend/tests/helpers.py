"""Shared constants and helpers for the test suite (safe to import anywhere)."""
import os
import random
import string

BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")
API = "/api/v1"

DEFAULT_TENANT = "tenant-1"
ALT_TENANT = "tenant-5"


def rand_phone() -> str:
    return "9" + "".join(random.choices(string.digits, k=9))


def rand_email(prefix="qa") -> str:
    return f"{prefix}.{''.join(random.choices(string.ascii_lowercase, k=8))}@qa-test.com"
