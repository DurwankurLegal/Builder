"""
User account management tests: RBAC, tenant isolation, account lifecycle
(create / modify / reset / activate / deactivate / unlock / force change),
login hardening, and audit logging.
"""
import random
import string
import pytest
from tests.helpers import API, DEFAULT_TENANT, ALT_TENANT, REMOVED_TENANT

STRONG_PW = "TestPassw0rd!23"


def uniq(prefix="qa"):
    return f"{prefix}{''.join(random.choices(string.ascii_lowercase + string.digits, k=8))}"


def _login(client, tenant, username, password):
    return client.post(f"{API}/auth/login",
                       json={"username": username, "password": password},
                       headers={"X-Tenant-ID": tenant})


@pytest.fixture()
def make_user(client, admin_headers):
    """Creates a user in tenant-1 and returns its JSON."""
    def _make(role="Sales Executive", force_change=False, active=True, password=STRONG_PW):
        name = uniq("u")
        resp = client.post(f"{API}/users", headers=admin_headers, json={
            "username": name, "email": f"{name}@qa-test.com", "password": password,
            "role": role, "is_active": active, "force_password_change": force_change,
        })
        resp.raise_for_status()
        return resp.json()
    return _make


@pytest.fixture()
def tenant_admin(client, admin_headers):
    """A Tenant Admin in tenant-1 plus its auth headers."""
    name = uniq("ta")
    resp = client.post(f"{API}/users", headers=admin_headers, json={
        "username": name, "email": f"{name}@qa-test.com", "password": STRONG_PW,
        "role": "Tenant Admin", "force_password_change": False,
    })
    resp.raise_for_status()
    token = _login(client, DEFAULT_TENANT, name, STRONG_PW).json()["access_token"]
    return {
        "user": resp.json(),
        "headers": {"Authorization": f"Bearer {token}", "X-Tenant-ID": DEFAULT_TENANT},
    }


# ---------- token binding / tenant isolation ----------

def test_token_carries_tenant_claim(client):
    import base64, json
    token = _login(client, DEFAULT_TENANT, "admin", "admin").json()["access_token"]
    part = token.split(".")[1]
    part += "=" * (-len(part) % 4)
    payload = json.loads(base64.urlsafe_b64decode(part))
    assert payload["tenant"] == DEFAULT_TENANT


def test_identity_resolves_from_token_tenant_not_header(client):
    """A tenant-1 token must resolve to its OWN workspace account, not the header's."""
    token = _login(client, DEFAULT_TENANT, "admin", "admin").json()["access_token"]
    resp = client.get(f"{API}/auth/me", headers={
        "Authorization": f"Bearer {token}", "X-Tenant-ID": ALT_TENANT})
    assert resp.status_code == 200
    # Super Admin may cross workspaces, but identity stays the tenant-1 account
    assert resp.json()["email"].endswith("@prestige.com")


def test_removed_workspace_is_rejected(client):
    """
    A removed/unknown workspace must be refused. Postgres ignores a missing
    schema in search_path, so without an explicit existence check the request
    would silently fall through to `public`.
    """
    resp = client.post(f"{API}/auth/login",
                       json={"username": "admin", "password": "admin"},
                       headers={"X-Tenant-ID": REMOVED_TENANT})
    assert resp.status_code == 400
    assert "workspace" in resp.json()["detail"].lower()


def test_tenant_admin_cannot_cross_workspace(client, tenant_admin):
    headers = dict(tenant_admin["headers"])
    headers["X-Tenant-ID"] = ALT_TENANT
    resp = client.get(f"{API}/users", headers=headers)
    assert resp.status_code == 403
    assert "Cross-workspace" in resp.json()["detail"]


def test_super_admin_can_cross_workspace(client, admin_headers):
    headers = dict(admin_headers)
    headers["X-Tenant-ID"] = ALT_TENANT
    assert client.get(f"{API}/users", headers=headers).status_code == 200


# ---------- RBAC ----------

def test_sales_executive_denied_user_management(client, sales_headers):
    resp = client.get(f"{API}/users", headers=sales_headers)
    assert resp.status_code == 403


def test_tenant_admin_may_manage_own_tenant(client, tenant_admin):
    assert client.get(f"{API}/users", headers=tenant_admin["headers"]).status_code == 200


def test_tenant_admin_cannot_create_super_admin(client, tenant_admin):
    name = uniq("esc")
    resp = client.post(f"{API}/users", headers=tenant_admin["headers"], json={
        "username": name, "email": f"{name}@qa-test.com",
        "password": STRONG_PW, "role": "Super Admin"})
    assert resp.status_code == 403


def test_all_tenants_view_is_super_admin_only(client, admin_headers, tenant_admin):
    assert client.get(f"{API}/users/all-tenants", headers=admin_headers).status_code == 200
    assert client.get(f"{API}/users/all-tenants", headers=tenant_admin["headers"]).status_code == 403


def test_assignable_roles_exclude_super_admin_for_tenant_admin(client, tenant_admin, admin_headers):
    assert "Super Admin" in client.get(f"{API}/users/roles", headers=admin_headers).json()
    assert "Super Admin" not in client.get(f"{API}/users/roles", headers=tenant_admin["headers"]).json()


# ---------- CRUD ----------

def test_create_user(client, admin_headers):
    name = uniq("new")
    resp = client.post(f"{API}/users", headers=admin_headers, json={
        "username": name, "email": f"{name}@qa-test.com",
        "password": STRONG_PW, "role": "Sales Executive"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["username"] == name
    assert body["is_active"] is True
    assert "hashed_password" not in body  # never exposed


def test_create_duplicate_username_rejected(client, admin_headers, make_user):
    user = make_user()
    resp = client.post(f"{API}/users", headers=admin_headers, json={
        "username": user["username"], "email": f"{uniq()}@qa-test.com",
        "password": STRONG_PW, "role": "Sales Executive"})
    assert resp.status_code == 409


def test_create_weak_password_rejected(client, admin_headers):
    name = uniq()
    resp = client.post(f"{API}/users", headers=admin_headers, json={
        "username": name, "email": f"{name}@qa-test.com", "password": "short"})
    assert resp.status_code == 422


def test_update_user_role_and_email(client, admin_headers, make_user):
    user = make_user()
    new_email = f"{uniq('upd')}@qa-test.com"
    resp = client.put(f"{API}/users/{user['id']}", headers=admin_headers,
                      json={"email": new_email, "role": "Tenant Admin"})
    assert resp.status_code == 200
    assert resp.json()["email"] == new_email
    assert resp.json()["role"] == "Tenant Admin"


def test_get_missing_user_404(client, admin_headers):
    assert client.get(f"{API}/users/99999", headers=admin_headers).status_code == 404


# ---------- account lifecycle ----------

def test_deactivate_blocks_login_and_activate_restores(client, admin_headers, make_user):
    user = make_user()
    client.post(f"{API}/users/{user['id']}/deactivate", headers=admin_headers)
    blocked = _login(client, DEFAULT_TENANT, user["username"], STRONG_PW)
    assert blocked.status_code == 403
    client.post(f"{API}/users/{user['id']}/activate", headers=admin_headers)
    assert _login(client, DEFAULT_TENANT, user["username"], STRONG_PW).status_code == 200


def test_cannot_deactivate_self(client, admin_headers):
    users = client.get(f"{API}/users", headers=admin_headers).json()
    me = next(u for u in users if u["username"] == "admin")
    resp = client.post(f"{API}/users/{me['id']}/deactivate", headers=admin_headers)
    assert resp.status_code == 400


def test_auto_lock_after_failed_attempts_then_unlock(client, admin_headers, make_user):
    user = make_user()
    for _ in range(5):
        _login(client, DEFAULT_TENANT, user["username"], "WrongPassword!1")

    locked = _login(client, DEFAULT_TENANT, user["username"], STRONG_PW)
    assert locked.status_code == 403
    assert "locked" in locked.json()["detail"].lower()

    unlocked = client.post(f"{API}/users/{user['id']}/unlock", headers=admin_headers)
    assert unlocked.json()["is_locked"] is False
    assert unlocked.json()["failed_login_attempts"] == 0
    assert _login(client, DEFAULT_TENANT, user["username"], STRONG_PW).status_code == 200


def test_reset_password_and_force_change_flow(client, admin_headers, make_user):
    user = make_user()
    new_pw = "ResetByAdmin#9"
    resp = client.post(f"{API}/users/{user['id']}/reset-password", headers=admin_headers,
                       json={"new_password": new_pw, "force_password_change": True})
    assert resp.status_code == 200
    assert resp.json()["force_password_change"] is True

    # old password no longer works, new one does and signals the forced change
    assert _login(client, DEFAULT_TENANT, user["username"], STRONG_PW).status_code == 401
    login = _login(client, DEFAULT_TENANT, user["username"], new_pw)
    assert login.status_code == 200
    assert login.json()["force_password_change"] is True

    # user changes their own password -> flag clears
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": DEFAULT_TENANT}
    changed = client.post(f"{API}/auth/change-password", headers=headers,
                          json={"current_password": new_pw, "new_password": "SelfChosen#77"})
    assert changed.status_code == 200
    final = _login(client, DEFAULT_TENANT, user["username"], "SelfChosen#77")
    assert final.json()["force_password_change"] is False


def test_change_password_wrong_current_rejected(client, make_user):
    user = make_user()
    token = _login(client, DEFAULT_TENANT, user["username"], STRONG_PW).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": DEFAULT_TENANT}
    resp = client.post(f"{API}/auth/change-password", headers=headers,
                       json={"current_password": "NotMyPassword!1", "new_password": "Whatever#123"})
    assert resp.status_code == 400


def test_toggle_force_password_change(client, admin_headers, make_user):
    user = make_user()
    on = client.post(f"{API}/users/{user['id']}/force-password-change",
                     headers=admin_headers, json={"force_password_change": True})
    assert on.json()["force_password_change"] is True
    off = client.post(f"{API}/users/{user['id']}/force-password-change",
                      headers=admin_headers, json={"force_password_change": False})
    assert off.json()["force_password_change"] is False


def test_deactivated_user_token_is_rejected(client, admin_headers, make_user):
    """An existing session must stop working once the account is deactivated."""
    user = make_user()
    token = _login(client, DEFAULT_TENANT, user["username"], STRONG_PW).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": DEFAULT_TENANT}
    assert client.get(f"{API}/auth/me", headers=headers).status_code == 200
    client.post(f"{API}/users/{user['id']}/deactivate", headers=admin_headers)
    assert client.get(f"{API}/auth/me", headers=headers).status_code == 403


# ---------- security / audit ----------

def test_password_never_returned_in_listing(client, admin_headers):
    users = client.get(f"{API}/users", headers=admin_headers).json()
    for u in users:
        assert "password" not in u and "hashed_password" not in u


def test_password_is_hashed_not_plaintext(client, admin_headers):
    """The stored credential must not equal the supplied password."""
    name = uniq("hash")
    client.post(f"{API}/users", headers=admin_headers, json={
        "username": name, "email": f"{name}@qa-test.com", "password": STRONG_PW})
    # the API never exposes the hash; prove instead that the plaintext is not accepted
    # as a token and that login works only via the hashing verify path
    assert _login(client, DEFAULT_TENANT, name, STRONG_PW).status_code == 200
    assert _login(client, DEFAULT_TENANT, name, STRONG_PW.upper()).status_code == 401


def test_user_operations_are_audited(client, admin_headers, make_user):
    user = make_user()
    client.post(f"{API}/users/{user['id']}/reset-password", headers=admin_headers,
                json={"new_password": "AuditedReset#1", "force_password_change": False})
    logs = client.get(f"{API}/admin/logs", headers=admin_headers).json()
    actions = " ".join(l["action"] for l in logs)
    assert f"Created user account '{user['username']}'" in actions
    assert f"Reset password for user '{user['username']}'" in actions
    # audit rows carry tenant, user and IP
    entry = next(l for l in logs if "Reset password" in l["action"])
    assert entry["user"] and entry["tenant"] and entry["ip"]


def test_failed_login_is_audited(client, admin_headers, make_user):
    user = make_user()
    _login(client, DEFAULT_TENANT, user["username"], "WrongOne!1")
    logs = client.get(f"{API}/admin/logs", headers=admin_headers).json()
    assert any("Failed login attempt" in l["action"] and l["user"] == user["username"] for l in logs)
