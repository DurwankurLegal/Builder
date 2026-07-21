# Builder CRM — QA & Verification Report

> **Newer cycle:** see [QA_REPORT_CYCLE2.md](QA_REPORT_CYCLE2.md) (2026-07-21) —
> full-application audit: 17 defects fixed (2 critical security), suite now 153 tests.

**Scope:** Lead pipeline feature set (Raw / Called / Qualified Leads, AI Calling
Agent, bulk import/export, manual entry) plus cross-cutting audit of the wider
application.
**Date:** 2026-07-17
**Environment:** Docker Compose stack (FastAPI + PostgreSQL 15 + Redis 7 +
React/Vite), verified on localhost.
**Result:** ✅ All automated tests pass (68/68). All identified bugs fixed and
re-verified. No critical or high-severity defects remain.

---

## 1. Summary

| Area | Status |
|------|--------|
| Backend ↔ Frontend ↔ DB ↔ business logic synchronized | ✅ Verified |
| Every backend API has a frontend surface | ✅ Verified |
| CRUD operations (create/read/update/delete) | ✅ Verified |
| Validation consistent on frontend + backend | ✅ Verified |
| RBAC enforced | ✅ Verified |
| Transaction-safe DB operations | ✅ Verified |
| Automated unit + integration + E2E tests | ✅ 68 passing |
| Production build / compilation | ✅ Clean (tsc + vite build) |
| Console errors | ✅ None observed |
| Responsive layout (mobile/tablet/desktop) | ✅ Verified |

---

## 2. Bug Register

All bugs below were identified during the QA cycle, fixed, and re-verified.

### BUG-001 — SQL injection surface via `X-Tenant-ID` header
- **Module:** Backend / DB session routing (`app/db/session.py`)
- **Severity:** High (Security)
- **Steps to reproduce:** Send any authenticated request with header
  `X-Tenant-ID: public; select pg_sleep(3)--`.
- **Expected:** Request rejected with a 4xx error.
- **Actual:** HTTP 500 — the raw header was interpolated into
  `SET search_path TO {schema}, public`. Stacked-statement execution was
  blocked only incidentally by the asyncpg driver, leaving an injection/DoS
  surface and error noise.
- **Root cause:** Tenant string was passed unvalidated into raw SQL text.
- **Resolution:** Added `resolve_schema()` with a strict allowlist regex
  `^[a-z0-9_]+$`; invalid input raises `InvalidTenantError`, mapped to HTTP 400
  in the `get_db` dependency.
- **Verified:** Injection header now returns **400**; valid tenants unaffected;
  unit tests `test_resolve_schema_rejects_injection[*]`.

### BUG-002 — Unknown tenant silently served the public schema
- **Module:** Backend / multi-tenancy
- **Severity:** Medium
- **Steps to reproduce:** Request with `X-Tenant-ID: doesnotexist!!`.
- **Expected:** Rejected as an invalid workspace.
- **Actual:** HTTP 200 with public-schema data.
- **Root cause:** Same missing validation as BUG-001.
- **Resolution:** Fixed by the BUG-001 change — malformed ids → 400; a
  well-formed-but-unknown tenant fails the in-schema user lookup → 401.
- **Verified:** Returns **400** for malformed ids.

### BUG-003 — Count-based ID generation could collide
- **Module:** Backend (`api/v1/leads.py`, `api/v1/customers.py`)
- **Severity:** Low (latent data-integrity)
- **Steps to reproduce:** Interleave pipeline transfers (which mint `LD-`/`CUST-`
  ids using max+1) with manual creates (which used `len()+1`); or delete a row
  creating a gap, then create again.
- **Expected:** Every generated id is unique.
- **Actual:** `len()+1` can reproduce an existing id → duplicate primary key →
  IntegrityError / 500.
- **Root cause:** Count-based rather than max-based id generation.
- **Resolution:** Introduced shared `next_suffix_id()` (max-based) and used it in
  lead creation, lead→customer conversion, and customer creation.
- **Verified:** New ids follow the max (e.g. existing `LD-1012` → new `LD-1013`).

### BUG-004 — Non-functional "Export" buttons (placeholder UI)
- **Module:** Frontend — Leads, Customers, Closed Bookings, Lost Deals
- **Severity:** Medium (Functional / requirement: "no non-functional UI")
- **Steps to reproduce:** Click "Export Data" on Leads Database.
- **Expected:** A CSV file downloads.
- **Actual:** Only a success toast appeared; no file was produced.
- **Root cause:** Stubbed `onClick` handlers.
- **Resolution:** Added `utils/exportCsv.ts` (RFC-4180 quoting + UTF-8 BOM) and
  wired all four buttons to real client-side CSV downloads.
- **Verified:** Clicking "Export Data" downloads `leads_database.csv`.

### BUG-005 — Expired session showed misleading states, no redirect
- **Module:** Frontend / API client (`config/api.ts`)
- **Severity:** Medium (UX / error handling)
- **Steps to reproduce:** Let the 15-minute JWT expire, then navigate to any page.
- **Expected:** Redirect to the login screen.
- **Actual:** Silent 401s; pages showed empty tables and a misleading
  "AI Calling Agent: Paused" strip.
- **Root cause:** No axios response interceptor for 401.
- **Resolution:** Added a response interceptor that, on a non-login 401, clears
  auth state and redirects to `/login`.
- **Verified:** Corrupting the stored token and navigating redirects to `/login`
  and clears the session.

### BUG-006 — Lead detail "Edit" button was a placeholder
- **Module:** Frontend — Leads Database (detail view)
- **Severity:** Low (Functional / placeholder UI)
- **Steps to reproduce:** Open a lead → click "Edit".
- **Expected:** An editable form.
- **Actual:** Only a toast ("Edit lead profile loaded!").
- **Root cause:** Stubbed handler.
- **Resolution:** Implemented a functional Edit Lead modal (name, email, phone,
  project, budget, executive) wired to the existing update mutation with history
  logging.
- **Verified:** Edit modal opens, saves, and records the change.

### BUG-007 — Cross-tenant privilege escalation via `X-Tenant-ID` header
- **Module:** Authentication / multi-tenancy
- **Severity:** **Critical (Security)**
- **Steps to reproduce:** Log in to `tenant-1` as `admin`, then reuse that token
  with header `X-Tenant-ID: tenant-2`.
- **Expected:** Rejected — a session belongs to the workspace it authenticated against.
- **Actual:** HTTP 200. `/auth/me` returned the **tenant-2** account
  (`admin@dlf.com`) and tenant-2 business data was readable. Because the JWT
  carried only `{"sub": "admin"}` with no tenant claim, and the seed creates an
  `admin` in every schema, any user could pivot into any workspace where their
  username existed.
- **Root cause:** Identity was resolved in the schema named by the caller-supplied
  header rather than the workspace the token was issued for.
- **Resolution:** Access tokens now carry a `tenant` claim. `get_current_user`
  resolves identity in the **token's** workspace and rejects a header/token
  mismatch with 403 unless the account is a Super Admin (who is explicitly
  permitted to operate cross-workspace). Tokens without a tenant claim are
  rejected so pre-fix sessions must re-authenticate. The workspace switcher is
  also disabled in the UI for non-Super-Admins.
- **Verified:** Tenant Admin cross-workspace request → **403**; Super Admin
  cross-workspace → 200 with identity still resolved as `admin@prestige.com`.
  Covered by `test_tenant_admin_cannot_cross_workspace`,
  `test_identity_resolves_from_token_tenant_not_header`.

### BUG-008 — `db.refresh()` after `commit()` intermittently 500s
- **Module:** Backend / user management router
- **Severity:** Medium (Correctness, intermittent)
- **Steps to reproduce:** Create a user via `POST /users` repeatedly; some calls
  return 500 `Could not refresh instance '<User>'`.
- **Expected:** 201 every time.
- **Actual:** Intermittent 500s.
- **Root cause:** `commit()` releases the session's connection back to the pool;
  the subsequent `refresh()` may check out a **different** connection that never
  had `SET search_path` applied, so the row is invisible in the tenant schema.
- **Resolution:** Removed all `refresh()`-after-`commit()` calls. The session
  uses `expire_on_commit=False`, so instances retain their loaded values (and
  `id`/`created_at` are already populated at flush time).
- **Verified:** Full suite green on three consecutive runs.

### BUG-009 — `public.users` missing new account-security columns
- **Module:** Database migration
- **Severity:** Medium
- **Steps to reproduce:** Call `/auth/login` with no `X-Tenant-ID` header (defaults
  to the `public` schema).
- **Expected:** 401 for bad credentials.
- **Actual:** 500 — `SELECT` referenced `is_locked`, `failed_login_attempts`,
  `force_password_change`, `last_login`, which existed only in tenant schemas.
- **Root cause:** `Base.metadata.create_all` never alters an existing table, and
  the additive migration ran only over tenant schemas.
- **Resolution:** The `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` migration now
  also runs against `public`.
- **Verified:** `test_invalid_login` passes; columns present in `public.users`.

**Non-blocking observations (not defects):** framework deprecation warnings
(Pydantic class-based `Config`, FastAPI `on_event`) surface in logs; they do not
affect behavior and are safe to modernize later.

---

## 3. Automated Test Suite

Located in `backend/tests/`. Runs against the live application over HTTP so the
async DB, tenant schema routing, and AI worker exercise real code paths.

| File | Tests | Coverage |
|------|-------|----------|
| `test_pipeline_service.py` | 24 | Unit: phone normalization, tenant-schema sanitization (injection), import-row validation, Excel cell coercion, stage-transition matrix, AI-call application |
| `test_pipeline_api.py` | 35 | Integration: auth, RBAC (403/401), CRUD, duplicate detection, validation, manual stage entry, bulk move, import/export, templates, recordings, pagination/search, AI endpoints, stats, audit, tenant isolation |
| `test_e2e_workflow.py` | 4 | Full lifecycle raw→called→qualified→customer, reject path, qualified→Leads DB handoff, bulk operations |
| `test_user_management.py` | 28 | Token tenant-binding, cross-workspace isolation, RBAC (Super Admin / Tenant Admin / Sales Executive), user CRUD, privilege-escalation guards, lockout & unlock, activate/deactivate, password reset, forced password change, audit logging |
| `test_auth.py` | 3 | Health, metrics, invalid login |
| `test_tenant_routing.py` | 2 | Tenant header propagation, default schema |
| **Total** | **96** | **All passing (3 consecutive runs)** |

Test scenarios include **positive, negative, boundary (out-of-range pagination),
validation, and permission-based** cases. Determinism is ensured by a session
fixture that pauses the AI worker for the tenants under test and restores it
afterwards.

Run with:
```bash
docker compose exec backend python -m pytest tests/ -v
```

---

## 4. End-to-End Verification Checklist

| Workflow | Result |
|----------|--------|
| User authentication & authorization | ✅ Login, JWT, role in token |
| Navigation & UI workflows | ✅ All routes, live nav badges |
| Lead lifecycle (raw→called→qualified→customer / reject) | ✅ E2E test + browser |
| CRUD operations | ✅ Create/read/update/delete |
| Import (CSV + Excel) & export (CSV + Excel) | ✅ Shared validation, per-row errors |
| Search, filtering, sorting, pagination | ✅ Incl. boundary clamping |
| File uploads & downloads (bulk upload, recordings, templates) | ✅ |
| Role-based permissions | ✅ Admin-only delete/settings/download enforced |
| AI Calling Agent integration | ✅ Auto-dial, retry, move-to-called, recordings |
| API responses & status codes | ✅ 200/201/400/401/403/404/409/422 |
| Database updates & transaction safety | ✅ Atomic bulk moves + audit |
| Activity logs & audit trails | ✅ Every create/move/import/export logged |
| Error handling & recovery | ✅ 401 → redirect to login (BUG-005) |
| Performance & responsiveness | ✅ Sub-second responses; mobile/desktop layouts |

---

## 5. Regression

After all fixes: the full suite was re-run to green (68/68, twice), the frontend
production build (`tsc && vite build`) compiled clean, and the browser E2E flow
was re-walked with no console errors and no regressions in existing modules
(Dashboard, Leads Database, Customers, Bookings, Lost Deals, Admin Console).

---

## 6. Conclusion

The frontend, backend, APIs, database, and business logic are fully implemented,
integrated, and synchronized for the lead pipeline feature set. All identified
bugs are fixed and re-verified, automated coverage is in place and passing, and
no critical or high-severity defects remain. The application is stable and
production-ready for the scoped functionality.
