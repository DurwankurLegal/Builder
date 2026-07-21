# Builder CRM — QA & Verification Report (Cycle 2)

**Scope:** Full-application audit — frontend ↔ backend ↔ API ↔ database ↔ business-logic
synchronization, security, RBAC, validations, audit trails, and the HireBuddha
AI-calling integration.
**Date:** 2026-07-21
**Environment:** Docker Compose stack (FastAPI + PostgreSQL 15 + Redis 7 + React/Vite), localhost.
**Result:** ✅ All automated tests pass (**153/153**, up from 132). All identified bugs fixed
and re-verified. No critical or high-severity defects remain.

---

## 1. Method

1. **API ↔ UI coverage audit** — every backend route cross-referenced against every
   frontend `apiClient` call; pages ranked by connectivity.
2. **Code inspection** — all 11 backend routers, services, session/auth layers, and all
   16 frontend pages/layouts reviewed.
3. **Live E2E** — login, dashboard, follow-ups scheduling, reports, settings persistence,
   pipeline, notifications, mobile viewport, console-error sweep on the running stack.
4. **Fix → test → regress** — every fix landed with automated coverage, then the full
   suite + production build + browser smoke were re-run to green.

## 2. Summary of verification

| Area | Status |
|------|--------|
| Every backend API has a frontend surface (or is a documented integration API) | ✅ |
| Every screen/button/form wired to a real API — no placeholder UI remains | ✅ |
| CRUD verified across leads, pipeline, customers, bookings, users, follow-ups, settings | ✅ |
| Validations consistent frontend + backend (incl. past-date, dup-check, enum rules) | ✅ |
| RBAC enforced server-side per the SRS role matrix | ✅ |
| DB operations tenant-isolated, transaction-safe, injection-hardened | ✅ |
| Audit trail on all state-changing operations | ✅ |
| AI Calling Agent (simulation + HireBuddha) end-to-end | ✅ |
| Automated unit + integration + E2E tests | ✅ 153 passing |
| Production build (tsc + vite) | ✅ Clean |
| Console errors | ✅ None |
| Responsive layout (mobile 375px / desktop) | ✅ Verified |

---

## 3. Bug Register

### QA2-001 — Super Admin backdoor via `public` pseudo-workspace *(Critical / Security)*
- **Module:** Backend / Authentication (`app/api/v1/auth.py`)
- **Steps to reproduce:** `POST /api/v1/auth/login` with `X-Tenant-ID: public` (or no
  header) and `admin`/`admin` on a deployment where `public.users` is empty.
- **Expected:** Authentication rejected — `public` is not a workspace.
- **Actual:** The login handler **auto-seeded** an `admin/admin` account with the
  **Super Admin** role into any empty users table, then authenticated it. Because
  Super Admin tokens may cross workspaces, this granted full cross-tenant control of an
  internet-facing system to anyone.
- **Root cause:** A "quick safety seed" convenience block left in the login path, plus no
  restriction of logins to provisioned workspaces.
- **Resolution:** Auto-seed removed entirely; logins now validate the workspace against
  the tenant directory (`public`/unknown → 401, audit-logged).
- **Verified:** `test_login_rejected_for_public_pseudo_workspace`,
  `test_login_without_workspace_header_rejected`, `test_login_rejected_for_unprovisioned_workspace`.

### QA2-002 — Unauthenticated registration with arbitrary role *(Critical / Security)*
- **Module:** Backend / Authentication
- **Steps to reproduce:** `POST /api/v1/auth/register` with `{"role": "Super Admin", ...}` — no token required.
- **Expected:** Account creation restricted to administrators.
- **Actual:** Anyone could mint accounts of any role, including Super Admin.
- **Root cause:** Legacy endpoint predating the admin-gated User Management API; never removed.
- **Resolution:** Endpoint deleted. Account creation happens only via `POST /users` (admin-gated).
- **Verified:** `test_register_endpoint_removed`.

### QA2-003 — Audit-trail forgery via unauthenticated log writer *(High / Security)*
- **Module:** Backend / Super Admin (`app/api/v1/admin.py`)
- **Actual:** `POST /admin/logs` accepted unauthenticated writes into the global audit
  trail (integrity + spam risk).
- **Resolution:** Endpoint deleted; audit records are written exclusively server-side.
- **Verified:** `test_admin_log_injection_removed`.

### QA2-004 — Tenant provisioning creates a broken workspace *(High / Functional + Security)*
- **Module:** Backend / Super Admin, tenant provisioning
- **Steps to reproduce:** Admin Console → Add Tenant; open Raw Leads in the new workspace.
- **Expected:** Fully functional workspace.
- **Actual:** The inline DDL created only 4 of 10 tables (no pipeline, follow-ups,
  settings, or integration tables → 500s across half the app). The tenant id went
  unvalidated into `CREATE SCHEMA`/`INSERT` SQL strings (injection surface), and a
  malformed id ("Testing Company") could be committed with **no schema at all**.
- **Root cause:** Provisioning drifted from the seed's DDL; no id validation; string-built SQL.
- **Resolution:** Provisioning now shares the seed's `SCHEMA_TABLES_DDL` + migrations
  (single source of truth), validates ids via the strict schema regex (400 on failure),
  uses parameterized SQL, commits atomically, and audit-logs the provisioning event.
- **Verified:** `test_tenant_create_rejects_hostile_id`, `test_provisioning_ddl_covers_all_tables`.

### QA2-005 — One bad tenant row halts AI calling for every workspace *(High / Reliability)*
- **Module:** Backend / AI worker (`app/services/ai_agent.py`)
- **Steps to reproduce:** With the "Testing Company" row present (see QA2-004), watch the
  worker logs: `syntax error at or near "company"` every 15 seconds; **no tenant** was swept.
- **Root cause:** Worker interpolated unvalidated tenant ids into `SET search_path`, and a
  single exception aborted the whole sweep loop.
- **Resolution:** Worker validates ids (`resolve_schema`) and schema existence before use,
  and wraps each tenant in its own error boundary. Junk directory row removed.
- **Verified:** Worker logs clean post-fix; sweep processes leads again (observed live).

### QA2-006 — Follow-ups module was browser-local make-believe *(High / Functional)*
- **Module:** Follow-ups (frontend + missing backend)
- **Actual:** Tasks lived in `localStorage` only: invisible to teammates, **shared across
  workspaces on the same browser** (tenant leakage), lost on cache clear; calendar
  hardcoded to July 2026; executive list hardcoded; the SRS "no past dates" rule unenforced.
- **Resolution:** New `followups` table + API (`GET/POST /followups`, `/toggle`, admin
  `DELETE`), tenant-scoped, audit-logged, past-date rejected server-side (422) and
  `min=` on the date input client-side. UI fully rewired: live list/calendar (dynamic
  month navigation)/timeline, executive dropdown fed by `GET /users/executives`.
- **Verified:** 4 new API tests incl. tenant isolation + past-date rejection; live E2E.

### QA2-007 — Analytical Reports were 100% fabricated *(High / Functional)*
- **Module:** Reports (frontend + missing backend)
- **Actual:** All three charts hardcoded sample arrays; "Export PDF/CSV" buttons showed a
  success toast **without downloading anything**.
- **Resolution:** New `GET /reports/summary` aggregates live tenant data (monthly sales
  from bookings, channel distribution from leads+pipeline, executive performance from
  customers/leads). Exports now produce real CSV files from the live datasets.
- **Verified:** `test_report_summary_shape_and_consistency` cross-checks aggregates
  against raw listings; live E2E shows real charts.

### QA2-008 — Dashboard metrics fabricated / wrong currency math *(Medium / Functional)*
- **Module:** Dashboard
- **Actual:** Booking-value parser treated every amount as Crores (₹80 Lakhs → ₹80 Cr) with
  a `|| 12000000` fallback inventing revenue; follow-ups "3", site visits "14", monthly
  sales "₹2.45 Cr", all trend percentages, the source pie, and the upcoming-tasks list
  were hardcoded.
- **Resolution:** Dashboard now renders exclusively from `/reports/summary` +
  `/followups`; a server-side INR parser handles Lakhs/Crores correctly; fabricated
  trend badges replaced with factual captions; honest empty states.
- **Verified:** `test_inr_parser` (7 cases); live E2E shows real values (incl. honest ₹0).

### QA2-009 — System Settings screen persisted nothing *(Medium / Functional)*
- **Module:** System Settings
- **Actual:** Company profile, projects, executives, and channels were local component
  state; "saved successfully!" toasts lied; every reload reset the data; the executives
  tab showed three fictional employees.
- **Resolution:** New `workspace_settings` table + `GET/PUT /settings/workspace`
  (reads all-roles, writes admin-only, audit-logged). UI rewired with real persistence;
  the executives tab now mirrors the live user directory and links to User Management
  (single source of truth); non-admins get a read-only view.
- **Verified:** `test_workspace_settings_roundtrip`, `test_workspace_settings_write_requires_admin`;
  live E2E save → reload → persisted.

### QA2-010 — Lead conversion skipped duplicate validation and audit *(Medium / Business rule)*
- **Module:** Backend / Leads
- **Actual:** SRS 4.1 requires checking the lead's email/mobile against existing customers
  before conversion, and an audit event; neither happened — duplicate customers possible.
- **Resolution:** Conversion now returns 409 with the clashing customer id on a phone or
  email match (normalized comparison) and writes an audit record on success.
- **Verified:** `test_convert_blocks_duplicate_customer`, `test_convert_success_and_audited`.

### QA2-011 — Sales Executives could create customer profiles *(Medium / RBAC)*
- **Module:** Backend / Customers
- **Actual:** `POST /customers` accepted any authenticated role; the SRS matrix reserves
  "Add Customer Profile" for admins.
- **Resolution:** Endpoint now requires Super Admin / Tenant Admin (403 otherwise).
- **Verified:** `test_sales_executive_cannot_create_customer`, `test_admin_can_create_customer`.

### QA2-012 — Core-module mutations bypassed the audit trail *(Medium / Compliance)*
- **Module:** Backend / Leads, Customers, Bookings
- **Actual:** Creating/updating leads and customers and progressing a booking's legal
  stages (the SRS 4.2 key workflow) wrote no audit entries — only pipeline operations did.
- **Resolution:** All state-changing operations in the three routers now write audit
  records (legal-stage changes logged with the specific status transition).
- **Verified:** Audit assertions in the conversion test; manual log inspection.

### QA2-013 — Notification bell showed three fake alerts forever *(Medium / UI truthfulness)*
- **Module:** App shell (MainLayout)
- **Resolution:** New `GET /reports/notifications` feed — overdue payment milestones,
  follow-ups due/overdue, fresh interested AI-called leads — with a real badge count and
  an all-caught-up empty state.
- **Verified:** `test_notifications_feed`; badge shows live count in E2E.

### QA2-014 — HireBuddha admin surfaces had no UI *(Medium / API-UI parity)*
- **Module:** Raw Leads / Integrations
- **Actual:** `GET /integrations/hirebuddha/logs` and `POST .../dispatch/{id}` (added in
  the integration cycle) had no frontend.
- **Resolution:** Raw Leads gains an admin **AI Logs** modal (direction, outcome, HTTP
  status, payload detail per exchange) and a per-lead **Send to AI now** action when the
  workspace provider is HireBuddha.
- **Verified:** UI smoke; logs RBAC test (`test_integration_logs_require_admin`).

### QA2-015 — Lost Deals invented reasons and competitors *(Low / Data integrity)*
- **Module:** Lost Deals
- **Actual:** Rows without mark-lost metadata displayed fabricated "Budget Constraint" /
  "Direct competitor" defaults.
- **Resolution:** Missing values render as "—".

### QA2-016 — Follow-up creation 500 after commit *(Medium / New-code defect, caught in-cycle)*
- **Module:** Backend / Follow-ups (introduced during this cycle, caught by its tests)
- **Actual:** `db.refresh()` after `commit()` ran on a fresh pooled connection **without
  the tenant search_path**, failing to find the row → 500.
- **Root cause:** Connection-scoped `SET search_path` does not survive the post-commit
  pool checkout.
- **Resolution:** Flush inside the transaction to obtain the id; no post-commit refresh
  (`expire_on_commit=False` keeps attributes valid). Pattern documented in-code.
- **Verified:** `test_followup_crud_and_toggle` green; noted as a review rule for future handlers.

### QA2-017 — Dev-data hygiene *(Low)*
- Junk "Testing Company" tenant row (no schema) and orphaned test follow-up rows removed
  from the development database.

---

## 4. Test suite

| Layer | Coverage |
|---|---|
| Unit | schema sanitization, phone/INR normalization, import validation, stage transitions, HireBuddha payload/outcome mapping, provisioning DDL completeness |
| Integration (live HTTP) | auth (lockout, tenant binding, workspace restriction), user management RBAC, pipeline CRUD/import/export/bulk-move, HireBuddha callback (auth, idempotency, outcome mapping), follow-ups (CRUD, validation, RBAC, isolation), reports consistency, settings persistence + RBAC, customers RBAC, conversion rules |
| E2E | full lead lifecycle raw→called→qualified→customer, cross-tenant isolation, browser workflows (login, scheduling, settings persistence, live charts, notifications, mobile layout) |

**Regression:** full suite re-run after every fix; final state **153/153 passing**,
`tsc + vite build` clean, zero browser console errors.

## 5. Production notes

- Deploying this cycle requires the standard update path (`git pull` → rebuild → re-run
  seed). The seed idempotently adds the new tables/columns (`followups`,
  `workspace_settings`, `bookings.created_at`).
- **Security follow-up for production:** verify no `public.users` rows exist from the
  QA2-001 window (`SELECT * FROM public.users;` — delete any) and rotate all seeded
  workspace passwords if not already done per the runbook.
