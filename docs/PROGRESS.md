# PROGRESS

## Phase Status Summary

| Phase | Description | Status | Target Completion | Notes |
|---|---|---|---|---|
| **Phase 0** | Repository foundation and tracking docs | Done | 2026-11-18 | Monorepo scaffold, configs, documentation, CI/Dependabot, verified lint/build/dev-server |
| **Phase 0.5** | Dataset tooling & exploration | Done | 2026-11-18 | CIC-IDS2017 tooling: verify, inspect, stratified sampling, demo sample, pytest suite |
| **Phase 1** | ML offline training & evaluation | Done | 2026-11-18 | Modular training pipeline, baseline heuristic, model evaluation, artifact export (<50MB) |
| **Phase 2** | ML FastAPI microservice | Done | 2026-11-18 | FastAPI app, Pydantic validation, X-API-Key auth, /health, /model-info, /predict, /predict/batch, HF Dockerfile, tests |
| **Phase 3** | Server foundation & core infra | Done | 2026-11-18 | Express app factory, Zod env validation, Mongoose, Socket.IO, Pino logging, Helmet, CORS, NoSQL injection guard, rate limiting, Vitest tests |
| **Phase 4** | Authentication & RBAC | Done | 2026-11-18 | JWT auth (HS256, 30m), bcrypt (cost 12), timing attack defense with dummy hash, 5-failure/15-min lockout, authenticate & authorize middlewares, /api/auth/* endpoints, admin user management (/api/users), AuditLog model & service with IP masking, seedAdmin script, 21 integration tests |
| **Phase 5** | Threat detection & scoring core | Done | 2026-11-18 | mlClient (retries, timeout, 503 fallback), scoringService (0-100 score, Benign=0, factor sum conservation), baselineService, detectionService, POST /api/detect, 28 new tests, live end-to-end verified |
| **Phase 6** | Incidents & datasets management | Done | 2026-11-18 | Incident persistence, CSV upload & streaming validation, formula-injection-safe CSV export, 78 tests |
| **Phase 7** | Realtime telemetry & evaluation stats | Done | 2026-11-18 | Socket.IO telemetry, Replay engine, aggregation stats, comparative evaluation, critical alerts, 100 tests |
| **Phase 8** | Client foundation & UI shell | Done | 2026-11-18 | React Router, TanStack Query, Auth context & session restore, Axios interceptors with 401 handling, cold-start banner, accessible shared UI library (Button, Input, Select, Badge, Card, Table, Modal, ConfirmDialog, Tabs, Skeleton, States), dark SOC layout with Ember Studio design tokens, Vercel CSP security headers, 28 Vitest tests, live dev server + API verification |
| **Phase 9** | SOC dashboard & incident triage UI | Done | 2026-11-19 | Summary KPI cards, Recharts timeline & distributions, top attack sources table, live Socket.IO stream panel (pause/resume, 50-item cap, batch updates), searchable/filterable/sortable incidents table with URL-synced params, incident forensic detail modal with explainable threat score breakdown & factor conservation, status transitions, investigation notes, safe CSV export, 45 tests |
| **Phase 10** | Datasets, baseline comparison & admin UI | Done | 2026-11-19 | Drag-and-drop CSV upload with client-side header validation, progress tracking, controlled replay console with live socket progress, comparative evaluation (ML vs Heuristic Baseline, Recharts per-class metrics, confusion matrix heatmap, discrepancy explorer, honest limitations), admin user management (RBAC controls, self-demotion safeguards), security audit trail viewer, live notifications bell with unread badge |
| **Phase 11** | Testing & security hardening | Done | 2026-11-19 | Comprehensive route-by-route security review, pip-audit (0 CVEs) & npm audit, weak secret rejection in production, CastError 400 mapping, CORS 403 mapping, replay cleanup on dataset deletion, MongoDB compound index optimization with IXSCAN explain verification, axe-core a11y suite (0 violations), 200 passing tests across monorepo |
| **Phase 12** | Production packaging & deployment | Done | 2026-11-19 | Production deployment guides (docs/DEPLOYMENT.md), MongoDB Atlas M0 least-privilege setup and index provisioner (ensureIndexes.js), Hugging Face Spaces Dockerfile with uv UID 1000, Render render.yaml and automatic admin boot-seeding, Vercel vercel.json SPA rewrites + CSP, PowerShell post-deploy smoke test script (smokeTest.ps1), CI/CD GitHub Actions workflow |
| **Phase 13** | Final documentation & viva defense prep | Done | 2026-11-19 | Comprehensive root README.md with badges, architecture diagrams, local setup runbook, and ethics statement; OpenAPI 3.0 / Swagger UI route (/api/docs); finalized docs/ARCHITECTURE.md with component, sequence, ER diagrams, and scoring proof; finalized docs/ML_REPORT.md with real test metrics and baseline comparisons; docs/FUTURE_WORK.md; docs/VIVA_PREP.md with examiner Q&A and 5-minute live demo script |

---

## Session Log

### Session 1 - 2026-11-18
- **Goal:** Phase 0 initialization - repository skeleton, tracking documents, environments, subproject configs.

### Session 2 - 2026-11-18
- **Goal:** Phase 0.5 Dataset Acquisition & Sampling Tooling in `ml-training/`.

### Session 3 - 2026-11-18
- **Goal:** Phase 1 Offline ML Training Pipeline in `ml-training/`.

### Session 4 - 2026-11-18
- **Goal:** Phase 2 FastAPI ML Inference Service in `ml-service/`.

### Session 5 - 2026-11-18
- **Goal:** Phase 3 Express Server Foundation & Core Infrastructure in `server/`.
- **Files Added/Changed:**
  - `server/src/config/env.js`: Startup environment variable validation with Zod (fails fast without logging secrets).
  - `server/src/config/db.js`: Mongoose connection manager with lifecycle event logging and graceful disconnection.
  - `server/src/utils/logger.js`: Structured Pino logger with path redaction for authorization headers, cookies, and passwords.
  - `server/src/utils/constants.js`: Domain constants for `ROLES`, `ATTACK_CLASSES`, `RISK_LEVELS`, `INCIDENT_STATUSES`.
  - `server/src/utils/asyncHandler.js`: Async route wrapper catching errors.
  - `server/src/errors/AppError.js`: Custom error classes (`AppError`, `ValidationError`, `AuthError`, `ForbiddenError`, `NotFoundError`).
  - `server/src/middlewares/errorHandler.js`: Central error handler mapping operational errors to `{error: {code, message, details?}}` and masking internals in production; 404 handler.
  - `server/src/middlewares/validate.js`: Zod schema validation middleware factory and recursive NoSQL injection sanitizer.
  - `server/src/routes/health.js`: `GET /api/health` (uptime, DB state) and `GET /api/ready` (readiness check).
  - `server/src/app.js`: Express app factory configuring Helmet, strict CORS allowlist, Pino HTTP, rate limiting, body parsing (1MB limit), compression, routes, and error handling.
  - `server/src/server.js`: HTTP server entry point with Socket.IO integration and graceful SIGINT/SIGTERM shutdown.
  - `server/tests/server.test.js`: Vitest + Supertest integration tests against in-memory MongoDB.
  - `server/tests/setup.js` & `server/vitest.config.js`: Test runner configurations.
  - `docs/SECURITY.md` & `docs/API.md`: Updated checklist and endpoint specifications.
- **Tests & Verification:**
  - `npm run lint` in `server`: Passed (0 errors).
  - `npm test` in `server`: 8 passed in 6.88s (health, readiness, 404 envelope, malformed JSON, NoSQL injection, Helmet headers, CORS allowlist/block).
  - Real server boot check against in-memory MongoDB: `GET /api/health` returned `200 {status: 'healthy', uptime: 0, database: 'connected'}` with full security headers.

### Session 6 - 2026-11-18
- **Goal:** Phase 4 Authentication, Role-Based Access Control (RBAC), User Management, and Audit Logging in `server/`.
- **Files Added/Changed:**
  - `server/package.json` & `package-lock.json`: Added `bcrypt` and `jsonwebtoken`.
  - `server/src/models/User.js`: User Mongoose schema with `name`, `email` (unique, lowercase, indexed), `passwordHash` (bcrypt cost 12, `select: false`), `role` (`admin`/`analyst`/`viewer`, default `viewer`), `isActive`, `failedLoginAttempts`, `lockUntil`, `lastLoginAt`, timestamps, and clean `toJSON`/`toObject` omitting `passwordHash` and `__v`.
  - `server/src/models/AuditLog.js`: Append-only security audit log recording `userId`, `action`, `ip`, `userAgent`, `details`, and `timestamp` (with 90-day retention TTL index).
  - `server/src/utils/ipMask.js`: IPv4 / IPv6 masking utility preserving privacy for non-admin viewers.
  - `server/src/utils/jwt.js`: `signToken({ sub, role })` and `verifyToken(token)` pinning `HS256` algorithm, rejecting `alg: none` and tampered/expired tokens.
  - `server/src/services/authService.js`: `registerUser` (forces viewer, validates organizational password policy: min 10 chars, uppercase, lowercase, numeric, symbol, not equal to email), `loginUser` (bcrypt cost 12, timing-equalization with pre-computed dummy hash, generic `Invalid credentials` message, automatic lockout after 5 failures for 15 minutes), and audit persistence.
  - `server/src/services/auditService.js`: `logAuditEvent` helper and `getAuditLogs` with pagination and conditional IP masking.
  - `server/src/middlewares/auth.js`: `authenticate` (validates Bearer token, loads active user, rejects inactive and locked accounts) and `authorize(...roles)` (server-side RBAC validation).
  - `server/src/validators/authValidators.js`: Zod schemas for registration, login, role updates, and status updates (strict mode rejecting extra keys).
  - `server/src/controllers/authController.js`: `register`, `login`, `getMe`, `logout` handlers.
  - `server/src/controllers/userController.js`: `getUsers` (paginated), `updateUserRole`, `updateUserStatus` with safeguards preventing self-demotion, self-deactivation, and demoting/disabling the last active administrator.
  - `server/src/controllers/auditController.js`: `getAuditLogsController` with pagination and filters.
  - `server/src/routes/auth.js`: Auth router with dedicated `authLimiter` rate limiter (20 requests / 15 min outside test env).
  - `server/src/routes/users.js`: User management router restricted to Admin role.
  - `server/src/routes/auditLogs.js`: Audit log router restricted to Admin role.
  - `server/src/app.js`: Mounted routers at both `/api/*` and `/api/v1/*`.
  - `server/src/scripts/seedAdmin.js`: Idempotent system admin seed script from environment credentials (`ADMIN_EMAIL`, `ADMIN_PASSWORD`), never printing plaintext passwords.
  - `server/tests/auth.test.js`: 21 comprehensive integration tests covering registration, password policy, login, timing attack defense, 5-failure lockout, token tampered/expired/none rejection, RBAC route protection, self-demotion/deactivation blocks, last-admin safeguards, and audit log IP masking.
  - `docs/API.md`, `docs/SECURITY.md`, `docs/DECISIONS.md` (ADR-007 token storage trade-off), `docs/PROGRESS.md`, `docs/NEXT_STEPS.md`.
- **Tests & Verification:**
  - `npm run format`: Prettier cleanly verified and formatted.
  - `npm run lint`: ESLint 0 errors.
  - `npm test`: 29 passed (8 server infra, 21 auth/RBAC/audit) in 8.88s with 0 warnings.
  - `npm audit`: Documented findings in `docs/SECURITY.md` and `docs/PROGRESS.md`.

### Session 7 - 2026-11-18
- **Goal:** Phase 5 Threat Detection Core & Scoring Engine in `server/`.
- **Files Added/Changed:**
  - `server/src/config/scoring.js`: Scoring configuration with weights (`wClass: 0.6`, `wConf: 0.4`), class severity weights (`DoS/DDoS: 1.0`, `BruteForce: 0.85`, `PortScan: 0.65`, `Benign: 0.0`), and risk bands (`Critical: >=80`, `High: >=60`, `Medium: >=30`, `Low: <30`).
  - `server/src/services/scoringService.js`: Pure functions `calculateThreatScore` (clamped 0-100, Benign=0, explanation factors strictly sum to score) and `getRiskLevel`.
  - `server/src/services/baselineService.js`: Pure rule-based baseline port from `ml-training` & `docs/BASELINE_RULES.md` evaluating BruteForce, DoS/DDoS, PortScan, and Benign heuristics.
  - `server/src/services/mlClient.js`: Resilient HTTP client for FastAPI ML service with `X-API-Key`, request timeouts, exponential backoff retries (3 attempts), safe 503 fallback (`ServiceUnavailableError`), and credential/internal-URL protection.
  - `server/src/services/detectionService.js`: Detection orchestrator coordinating record validation, ML classification, threat scoring, and baseline comparison for single and chunked batch flows.
  - `server/src/validators/detectValidators.js`: Strict 67-feature Zod schema derived from `feature_schema.json` rejecting unknown extra fields.
  - `server/src/controllers/detectController.js`: Single and batch detection controller.
  - `server/src/routes/detect.js`: Route mounted at `/api/detect` and `/api/v1/detect` restricted to Analyst and Admin roles.
  - `server/src/app.js`: Mounted detect router.
  - `server/src/errors/AppError.js`: Added `ServiceUnavailableError` (503).
  - `server/src/middlewares/validate.js`: Enhanced `.strict()` handling for Zod union schemas.
  - `server/tests/scoring.test.js`: 8 unit tests for scoring boundaries, Benign invariant, risk bands, and factor sum conservation.
  - `server/tests/baseline.test.js`: 6 unit tests for BruteForce, DoS/DDoS, PortScan, and Benign heuristic rules.
  - `server/tests/mlClient.test.js`: 6 unit tests for mocked fetch, retries, 401 handling, timeout, and 503 fallback.
  - `server/tests/detect.test.js`: 8 integration tests for route auth, strict validation, single/batch prediction, and 503 ML-down handling.
  - `server/src/scripts/e2eCheck.js`: Real end-to-end check script against live `ml-service` with real dataset record from `demo_flows.csv`.
  - `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/SECURITY.md`, `docs/PROGRESS.md`, `docs/NEXT_STEPS.md`.
- **Tests & Verification:**
  - `npm run format`: Prettier cleanly verified and formatted.
  - `npm run lint`: ESLint 0 errors.
  - `npm test`: 57 passed across 6 test suites in 10.64s.
  - Real end-to-end check executed against live uvicorn `ml-service`: Ground truth `PortScan` predicted as `PortScan` (92.75% confidence), baseline `Benign`, threat score `76` (`High`), factors `39 + 37 = 76`.

### Session 8 - 2026-11-18
- **Goal:** Phase 6 Incident Management and Dataset Upload in `server/`.
- **Files Added/Changed:**
  - `server/src/models/Incident.js`: Full incident schema with detected timestamp, source/destination IP helpers, protocol, ML prediction & confidence, baseline classification, threat score, risk level, explanation factors, status (`New`, `Under Review`, `Resolved`), analytical notes, dataset link, ground truth label, creator, and compound indexes.
  - `server/src/models/Dataset.js`: Dataset metadata schema with row count, benign count, incident count, class distribution, upload status, progress, capped rejected rows, and uploader attribution.
  - `server/src/middlewares/upload.js`: Multer memory storage configuration with 5MB file size limit and CSV MIME filter.
  - `server/src/validators/datasetValidators.js`: Zod upload schema and dataset query schemas.
  - `server/src/validators/incidentValidators.js`: Zod query filter validation, status transition schemas, and length-limited investigation note schemas.
  - `server/src/services/datasetService.js`: Multi-layered CSV validation (file extension, MIME type, PE/ELF/null-byte binary sniffing), header whitelist check against 67 features, streaming row parsing via `csv-parse`, chunked batch prediction via `detectionService.detectBatch`, persistence of non-Benign attack flows as incidents, aggregate counter tracking, and cascade deletion.
  - `server/src/services/incidentService.js`: Paginated and filtered incident query engine with safe Mongo query constructor (strict NoSQL injection defense), role-based IP masking, status transition validation, analytical notes management, and formula-injection-safe CSV export (`sanitizeCsvCell`).
  - `server/src/controllers/datasetController.js`: Dataset upload, query, detail, and deletion handlers.
  - `server/src/controllers/incidentController.js`: Incident list, single incident, status update, note creation, and CSV export handlers.
  - `server/src/routes/datasets.js` & `server/src/routes/incidents.js`: Secured routes mounted at `/api/datasets`, `/api/v1/datasets`, `/api/incidents`, and `/api/v1/incidents`.
  - `server/src/app.js`: Mounted datasets and incidents routers.
  - `server/src/utils/constants.js`: Updated incident status values, transition map, and audit action constants.
  - `server/src/middlewares/errorHandler.js`: Added unhandled ZodError mapping to structured 422 `VALIDATION_ERROR` responses.
  - `server/tests/datasets.test.js`: 9 integration tests covering upload size limits, MIME/extension checking, binary spoof sniffing, header whitelisting, malformed row handling, pagination, and admin deletion cascading.
  - `server/tests/incidents.test.js`: 12 integration tests covering incident pagination, safe query filters, NoSQL operator injection rejection, valid/invalid status transitions, analytical notes length validation, formula injection escaping, and role-based IP masking.
  - `server/src/scripts/verifyPhase6.js`: Real dataset upload and incident verification script against live `ml-service` using `ml-training/sample/demo_flows.csv`.
  - `docs/API.md`, `docs/SECURITY.md`, `docs/DECISIONS.md` (ADR-008, ADR-009), `docs/PROGRESS.md`, `docs/NEXT_STEPS.md`.
- **Tests & Verification:**
  - `npm run format:fix`: Prettier cleanly formatted all server files.
  - `npm run lint`: ESLint 0 errors, 0 warnings.
  - `npm test`: 78 passed across 8 test suites in 11.18s with 0 failures.
  - Real dataset sample upload check executed with `demo_flows.csv` (500 flow records):
    - All 500 rows parsed and classified in streaming chunks via live ML microservice.
    - Class distribution: 248 Benign, 125 DoS/DDoS, 80 PortScan, 47 BruteForce.
    - 252 non-Benign flows persisted as incidents in MongoDB with complete transparent scoring breakdowns.
    - Incident status transitioned to `Under Review` and investigation note added.
    - Exported 253-line CSV with neutralized formula injection characters and role-masked IPs.
    - Audit logs verified for `DATASET_UPLOAD`, `INCIDENT_STATUS_CHANGE`, and `INCIDENT_EXPORT`.

### Session 9 - 2026-11-18
- **Goal:** Phase 7 Real-Time Replay, Statistics, Evaluation and Alerts in `server/`.
- **Files Added/Changed:**
  - `server/src/models/Notification.js`: Notification model with role scoping (`targetRoles`), single user targeting (`targetUser`), severity (`Info`, `Warning`, `Critical`), read receipt tracking (`readBy`), and incident/dataset linkage.
  - `server/src/models/Dataset.js`: Added `rawCsv` (`select: false`) field to persist flow CSV content for replay and live evaluation.
  - `server/src/sockets/socketManager.js`: Authenticated Socket.IO server with JWT handshake verification, CORS enforcement, role/user room management (`role:admin`, `role:analyst`, `role:viewer`, `user:<id>`, `authenticated`), role-based IP masking on `incident:new` events, `replay:progress` and `notification:new` broadcasters, and clean disconnect handling.
  - `server/src/services/alertService.js`: Automated in-app alerting and rate-limited external email dispatch (via Resend or Brevo with a 5-minute cooldown) for Critical severity incidents (`score >= 80`).
  - `server/src/services/replayService.js`: Real-time network traffic replay state machine processing records through `detectionService` (bounded 1-50 rps, one active replay per user, server-side timer management and graceful shutdown cleanup).
  - `server/src/services/statsService.js`: MongoDB aggregation pipelines for `getStatsSummary` (totals and attack ratio), `getStatsTimeline` (minute/hour/day buckets with class breakdown and average score), `getStatsDistribution` (faceted counts by class, risk, status, protocol), and `getTopSources` (with role-based IP masking).
  - `server/src/services/evaluationService.js`: `getLatestEvaluationMetrics` (ML model architecture and offline metrics alongside baseline reference) and `computeDatasetEvaluation` (live multi-class confusion matrix, precision, recall, F1, false positive/negative counts, and discrepancy examples).
  - `server/src/controllers/replayController.js`, `statsController.js`, `evaluationController.js`, `notificationController.js`: Route controllers with input validation and response wrapping.
  - `server/src/routes/replay.js`, `stats.js`, `evaluation.js`, `notifications.js`: Secured routes mounted at `/api/*` and `/api/v1/*`.
  - `server/src/app.js`: Mounted replay, stats, evaluation, and notification routers.
  - `server/src/server.js`: Attached authenticated Socket.IO instance and integrated `stopAllReplays()` into graceful shutdown handlers.
  - `server/src/config/env.js`: Added optional `BREVO_API_KEY`, `RESEND_API_KEY`, and `ALERT_EMAIL_TO` variables.
  - `server/tests/sockets.test.js`: 5 tests covering handshake authentication, invalid/missing tokens, connection acceptance, and role-based IP masking.
  - `server/tests/replay.test.js`: 5 tests covering role protection, rate boundary validation (1-50), replay start, 409 conflict on duplicate sessions, and clean stopping.
  - `server/tests/stats.test.js`: 4 tests verifying summary totals, time-bucketed timelines, multi-faceted distributions, and masked top sources.
  - `server/tests/evaluation.test.js`: 3 tests verifying metric computation against hand-calculated values, ground truth normalization, and live comparative evaluation.
  - `server/tests/notifications.test.js`: 5 tests verifying critical alert triggering, role scoping, read status toggling, and read-all functionality.
  - `server/src/scripts/verifyPhase7Replay.js`: Real end-to-end replay verification script against live `ml-service` and live Socket.IO client.
  - `docs/API.md`, `docs/DECISIONS.md` (ADR-010, ADR-011, ADR-012), `docs/PROGRESS.md`, `docs/NEXT_STEPS.md`.
- **Tests & Verification:**
  - `npm run format`: Prettier cleanly verified and formatted.
  - `npm run lint`: ESLint 0 errors, 0 warnings.
  - `npm test`: 100 passed across 13 test suites in 10.69s.
  - Real replay check executed with `demo_flows.csv` streamed at 25 flows/sec against live `ml-service`:
    - Connected authenticated Socket.IO client to live server.
    - Successfully replayed network flow records through detection pipeline.
    - Received 19 `incident:new` events (masked for analyst), 8 `replay:progress` events.
    - Verified `GET /api/stats/*` aggregation summaries, distributions, and top sources.
    - Verified `GET /api/evaluation/latest` and `GET /api/evaluation/dataset/demo` comparative metrics.
    - Cleanly stopped replay and shutdown test server.

### Session 10 - 2026-11-18
- **Goal:** Phase 8 Client Foundation, UI Shell, Design System, Accessible Components, Auth & Routing in `client/`.
- **Files Added/Changed:**
  - `client/package.json` & `package-lock.json`: Added `axios`, `@tanstack/react-query`, `zod`, `react-hook-form`, `@hookform/resolvers`, `vitest@3.2.7`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`.
  - `client/tailwind.config.js`: Integrated Ember Studio warm craft aesthetics into a Dark SOC palette (`brand.primary` #c2410c terracotta, `brand.hover` #9a3412, `brand.accent` #f59e0b, `soc.dark` #0c0a09, `soc.surface` #171514, `soc.raised` #262220, `soc.border` #383431, and multi-modal risk color tokens with high-contrast borders and backgrounds).
  - `client/index.html`: Added preconnected Google Fonts (`Source Sans 3`, `Playfair Display`, `Fira Code`) and dark SOC body styles.
  - `client/src/index.css`: Custom subtle scrollbars and base typography styles.
  - `client/vercel.json`: Hardened deployment security headers (`Content-Security-Policy` with restrictive origins and no unsafe-eval, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, client rewrite rule).
  - `client/src/utils/env.js`: Startup validation of `VITE_API_URL` and `VITE_APP_ENV` via Zod with fail-fast semantics.
  - `client/src/utils/cn.js`: `clsx` and `tailwind-merge` class name utility.
  - `client/src/services/api.js`: Axios client with base URL from `env.VITE_API_URL`, 15s timeout, in-memory + sessionStorage token synchronization, request token attachment, response unwrap of standard JSend envelopes, 401 automatic token purge and subscriber notification, error normalization into `{ code, message, details, status }`, and >4s slow request cold-start detector.
  - `client/src/services/socket.js`: Authenticated Socket.IO connection manager with JWT handshake passing, connection lifecycle status tracker, and auto-reconnect handling.
  - `client/src/context/ToastContext.jsx` & `toastContextDef.js` & `client/src/hooks/useToast.js`: Accessible floating toast alert manager with auto-dismiss, ARIA roles, and top-of-viewport glowing cold-start wake-up banner.
  - `client/src/features/auth/authSchemas.js`: Client-side Zod validation schemas strictly mirroring backend rules (password policy: min 10 chars, uppercase, lowercase, numeric, symbol, not identical to email).
  - `client/src/features/auth/AuthContext.jsx` & `authContextDef.js` & `useAuth.js`: Authentication state provider managing `user`, `token`, `isAuthenticated`, `login`, `register`, `logout`, and automatic session restoration on boot via `GET /api/auth/me`.
  - `client/src/features/auth/ProtectedRoute.jsx` & `RoleRoute.jsx`: Client route security guards with accessible loading states and 403 Access Denied elevation screens.
  - `client/src/features/auth/LoginPage.jsx`: React Hook Form login screen with password reveal toggle, error alerts, demo credential quick-fill reference, and redirect handling.
  - `client/src/features/auth/RegisterPage.jsx`: Registration screen with realtime password policy checklist and Viewer role assignment notice.
  - `client/src/components/ui/Button.jsx`: Accessible button with variants (`primary`, `secondary`, `ghost`, `danger`, `outline`), sizes, loading state with spinner, and focus rings.
  - `client/src/components/ui/Input.jsx` & `Select.jsx`: Accessible form controls with labels, helper text, error alerts, adornments, and ARIA attributes.
  - `client/src/components/ui/Badge.jsx`: Multi-modal `RiskBadge` (Critical, High, Medium, Low using distinct Lucide icons, text labels, and semantic borders), `StatusBadge`, `AttackClassBadge`, and `RoleBadge`.
  - `client/src/components/ui/Card.jsx`: Surface card container with header, title, description, content, footer, hover elevation, and left accent border stripes.
  - `client/src/components/ui/Table.jsx`: Accessible table with sortable column headers (`aria-sort`, chevron indicators), pagination controls, loading pulse skeleton rows, and empty state.
  - `client/src/components/ui/Modal.jsx` & `ConfirmDialog.jsx`: Accessible dialog modals with body scroll lock, Escape key dismiss, backdrop blur, and focus management.
  - `client/src/components/ui/Tabs.jsx`: Accessible tabs with keyboard arrow navigation (`role="tablist"`, `aria-selected`), badges, and panels.
  - `client/src/components/ui/Skeleton.jsx`, `EmptyState.jsx`, `ErrorState.jsx`: Clean state feedback components.
  - `client/src/components/ui/ErrorBoundary.jsx`: Global runtime error boundary with reload action and safe error display.
  - `client/src/components/layout/AppLayout.jsx`, `Sidebar.jsx`, `TopBar.jsx`, `NotFoundPage.jsx`: Full SOC layout shell with responsive collapsible mobile drawer, live Socket telemetry status pill, security alerts dropdown, user profile menu, and 404 handler.
  - `client/src/app/router.jsx`: React Router v6 setup with public auth routes, protected SOC routes, role-guarded routes, and placeholder feature pages for `/dashboard`, `/incidents`, `/datasets`, `/evaluation`, `/detect`, `/admin/users`, `/admin/audit-logs`.
  - `client/src/App.jsx`: Root provider integration (`ErrorBoundary`, `QueryClientProvider`, `ToastProvider`, `AuthProvider`, `RouterProvider`).
  - `client/src/tests/`: Vitest + Testing Library test suite (setup, api interceptor tests, shared component accessibility tests, auth page validation tests, route guard protection tests).
  - `server/src/scripts/verifyPhase8Client.js`: Real integration verification script running in-memory MongoDB, seeding admin, starting Express API, starting Vite dev server, and testing login & session recovery.
  - `docs/DECISIONS.md`: Added ADR-013 (Ember Studio Dark SOC Aesthetics & Multi-Modal Risk Tokens) and ADR-014 (Client State Partitioning).
- **Tests & Verification:**
  - `npm run format`: Prettier cleanly verified and formatted (0 errors).
  - `npm run lint`: ESLint 0 errors, 0 warnings.
  - `npm test`: 28 passed across 4 test suites in 2.25s (api, components, routes, auth).
  - `npm run build`: Production bundle built cleanly with Vite in 5.53s.
  - Real dev server & API check (`verifyPhase8Client.js`):
    - Started in-memory MongoDB and seeded admin account (`admin@cybershield.local`).
    - Started Express server on port 5058 and Vite dev server on port 5173.
    - Probed `http://127.0.0.1:5173`: HTTP 200 OK, confirmed `AI CyberShield SOC` title.
    - Executed login request against real API with admin credentials: HTTP 200 OK, received JWT token and user identity `admin@cybershield.local` (`admin` role).
    - Verified `GET /api/auth/me` with Bearer token: HTTP 200 OK, session restored.
    - Verified invalid credentials rejection: HTTP 401 with standard error envelope.

### Session 11 - 2026-11-19
- **Goal:** Phase 9 SOC Dashboard & Incident Triage UI in `client/src/features/{dashboard,incidents}`.
- **Files Added/Changed:**
  - `client/src/services/statsApi.js`: API client functions for `/api/stats/summary`, `/api/stats/timeline`, `/api/stats/distribution`, and `/api/stats/top-sources`.
  - `client/src/services/incidentApi.js`: API client functions for `/api/incidents` (filtering, pagination, sorting), `/api/incidents/:id` (detail), status transitions, investigation note additions, and `exportIncidentsCsv` with safe blob downloading.
  - `client/src/features/dashboard/SummaryCards.jsx`: 4 KPI metric cards (Total Flow Events, Total Attacks Detected, High & Critical Threats, Attack Flow Ratio) with responsive skeletons and warm craft accents.
  - `client/src/features/dashboard/TimelineChart.jsx`: Recharts stacked AreaChart (`DoS/DDoS` terracotta, `PortScan` amber, `BruteForce` rose) with minute/hour/day aggregation controls, custom dark tooltip, and empty states. Memoized with `React.memo`.
  - `client/src/features/dashboard/DistributionCharts.jsx`: Recharts Donut PieChart for ML classification breakdown and BarChart for Risk severity distribution with accessible color mapping and tooltips. Memoized with `React.memo`.
  - `client/src/features/dashboard/TopSourcesTable.jsx`: Top attacking source IP table with masked IP privacy indicators, incident counts, max score risk badges, and attack vector chips.
  - `client/src/features/dashboard/LiveFeedPanel.jsx`: Real-time Socket.IO stream subscriber with live connection indicator, Pause/Resume toggle, Clear action, 50-item strict cap preventing memory bloat, and 250ms batch buffer to avoid React re-render storms during high-speed replays.
  - `client/src/features/dashboard/DashboardPage.jsx`: Assembled dashboard with TanStack Query auto-refetches, interval selectors, live stream, and incident inspection modal wiring.
  - `client/src/features/incidents/IncidentsPage.jsx`: Filterable, searchable, sortable, paginated incident repository with validated URL search params, 350ms debounced IP search, filter reset, and formula-injection-safe CSV export button.
  - `client/src/features/incidents/IncidentDetailModal.jsx`: Forensic dossier modal showing 67-feature overview, explainable threat score breakdown (class severity points + confidence points = total score), ML vs Heuristic Baseline concordance/divergence indicator, role-gated status transition buttons (restricted to Analyst/Admin), and plain-text investigation notes thread.
  - `client/src/tests/dashboard.test.jsx`: 11 Vitest tests covering summary cards, timeline intervals, distribution empty/filled states, top sources masking, live feed capped length (50 items), and pause/resume logic.
  - `client/src/tests/incidents.test.jsx`: 6 Vitest tests covering incidents table rendering, search/filter query updating, safe CSV export trigger, factor conservation breakdown, ML vs baseline divergence display, role-gated status transitions, and note creation.
  - `server/src/scripts/verifyPhase9Stack.js`: Full stack live verification script running in-memory MongoDB, seeding Admin/Analyst, spawning FastAPI ML service on 7860, ingesting `demo_flows.csv` (500 flows, 252 incidents), starting live Socket.IO replay at 25 fps, capturing live stream events, testing all REST stats endpoints, executing status transitions, adding analyst notes, and exporting safe CSVs.
  - `docs/DECISIONS.md`: Added ADR-015 (Live Telemetry Stream Throttling & Memory-Bounded Buffer).
- **Tests & Verification:**
  - `npm run format`: Prettier cleanly verified (0 style issues).
  - `npm run lint`: ESLint 0 errors, 0 warnings across both `client/` and `server/`.
  - `npm test` in `client/`: 45 passed across 6 test suites in 2.66s.
  - `npm run build`: Production bundle built cleanly with Vite in 5.95s.
  - Full Stack Live Verification (`verifyPhase9Stack.js`):
    - Spawned ML service on port 7860 (`uv run uvicorn app.main:app`).
    - Seeded Admin and Analyst accounts.
    - Ingested `demo_flows.csv`: 500 rows, 252 incidents created (`{"PortScan":80, "Benign":248, "BruteForce":47, "DoS/DDoS":125}`).
    - Connected authenticated Socket.IO client (Analyst role).
    - Started live replay at 25 flows/sec; captured 14 live stream events over Socket.IO with role-masked source IPs (`192.168.1.xxx`, score: 76, risk: High).
    - Verified `GET /api/stats/summary`: Total Events 500, Attacks 267, High/Critical 266, Attack Ratio 53.4%.
    - Verified `GET /api/stats/timeline`: 1 hourly interval returned with byClass breakdowns.
    - Verified `GET /api/stats/distribution`: byClass `{"BruteForce":50, "DoS/DDoS":131, "PortScan":86}`, byRisk `{"Critical":170, "Medium":1, "High":96}`.
    - Verified `GET /api/stats/top-sources`: Masked IPs for Analyst role.
    - Verified `PATCH /api/incidents/:id/status`: Transitioned status `New -> Under Review`.
    - Verified `POST /api/incidents/:id/notes`: Added note "Forensic packet inspection confirms volumetric UDP Flood attack pattern."
    - Verified `GET /api/incidents/:id`: Confirmed explainable threat score 84 (`Critical`), factors strictly conserved: `attack_class_severity (51pts) + model_confidence (33pts) = 84pts`.
    - Verified `GET /api/incidents/export`: 268 rows exported with formula injection protections.

### Session 12 - 2026-11-19
- **Goal:** Phase 10 Datasets Ingestion, Comparative Evaluation & Admin UI in `client/src/features/{datasets,evaluation,admin}`.
- **Files Added/Changed:**
  - `client/src/utils/constants.js`: Shared frontend domain constants for `FEATURE_NAMES` (67 CIC-IDS2017 features), `ALLOWED_MIME_TYPES`, `MAX_FILE_SIZE_BYTES` (5MB), `ROLES`, `ATTACK_CLASSES`, and `INCIDENT_STATUSES`.
  - `client/src/features/datasets/csvValidator.js`: Client-side CSV pre-flight validator mirroring backend rules (checks `.csv` extension, 5MB size limit, MIME type, executable magic numbers `MZ`/`ELF`, null bytes, and validates CSV header against all 67 required features).
  - `client/src/services/datasetApi.js`: API client for fetching datasets, multipart upload with upload progress tracking, and admin dataset deletion.
  - `client/src/services/replayApi.js`: API client for replay session status, starting replay (datasetId, flowsPerSec), and stopping replay.
  - `client/src/services/evaluationApi.js`: API client for retrieving model metadata (`/api/evaluation/latest`) and comparative live evaluation (`/api/evaluation/dataset/:id`).
  - `client/src/services/userApi.js`: API client for admin user list, updating roles (`/api/users/:id/role`), and updating active status (`/api/users/:id/status`).
  - `client/src/services/auditLogApi.js`: API client for paginated audit log queries with action and date filters.
  - `client/src/services/notificationApi.js`: API client for in-app alert retrieval and mark-as-read endpoints.
  - `client/src/services/socket.js`: Extended with subscription helpers `onReplayProgress`, `onNotificationNew`, and `onIncidentNew`.
  - `client/src/features/datasets/DatasetsPage.jsx`: Full dataset ingestion suite featuring drag-and-drop CSV upload, live upload progress bar, schema validation preview, rejected rows reporting, catalog table with class distributions, accessible delete confirmation dialog, and traffic replay controller (1-50 fps slider, start/stop actions, and live socket progress bar).
  - `client/src/features/evaluation/EvaluationPage.jsx`: Comparative benchmark suite between Random Forest ML and Heuristic Rule Baseline. Features model metadata cards (version, trees, feature count), comparative metrics table with absolute advantage delta badges, per-class Recharts F1 comparison bar chart, accessible multi-class confusion matrix heatmap with count/intensity styling, false positive / false negative discrepancy explorer with drill-down into `IncidentDetailModal`, and an honest operational limitations panel derived from `docs/ML_REPORT.md`.
  - `client/src/features/admin/UsersPage.jsx`: Admin-only account management console with paginated operator list, role badges, active status toggles, safety constraint summaries (blocking self-demotion and deactivation of the last active administrator), and accessible confirmation modals.
  - `client/src/features/admin/AuditLogsPage.jsx`: Security audit trail viewer featuring action dropdown filters, date range filters, client IP inspection, and structured metadata formatting.
  - `client/src/components/layout/TopBar.jsx`: Integrated notification bell with real-time unread count badge, dropdown alert feed, mark-as-read per item, and mark-all-read action.
  - `client/src/tests/datasets.test.jsx`: 10 Vitest tests covering CSV client validation (rejection of non-csv, >5MB, binary executables, missing features; acceptance of valid 67-column header), page rendering, replay rate slider adjustment, start replay mutation, and role restrictions for Viewers.
  - `client/src/tests/evaluation.test.jsx`: 5 Vitest tests covering model architecture rendering, comparative metrics table, confusion matrix heatmap, discrepancy tables, and honest limitations panel.
  - `client/src/tests/admin.test.jsx`: 5 Vitest tests covering users account table, self-demotion prevention, role modification modal, audit log rendering, and action filtering.
  - `server/src/scripts/verifyPhase10Stack.js`: End-to-end full stack live verification script exercising CSV upload (500 flows, 252 incidents), Socket.IO replay streaming at 25 fps, live comparative evaluation retrieval, admin user RBAC updates, and audit trail inspection.
  - `docs/DECISIONS.md`: Added ADR-016 (Client-Side Flow Schema Pre-validation and Comparative Evaluation UX).
- **Tests & Verification:**
  - `npm run lint` in `client/`: 0 errors, 0 warnings.
  - `npm test` in `client/`: 65 tests passed across 9 test files in 6.37s.
  - `npm run build` in `client/`: Production bundle built cleanly with Vite in 8.36s.
  - `npm run lint` in `server/`: 0 errors, 0 warnings.
  - `npm test` in `server/`: 100 tests passed across 13 test files in 19.43s.
  - Full Stack Live Verification (`verifyPhase10Stack.js`):
    - Spawned ML service on port 7860 (`uv run uvicorn app.main:app`), confirmed healthy.
    - Provisioned in-memory MongoDB and Express server on port 5062.
    - Seeded Administrator and Analyst accounts with JWT authentication.
    - Ingested real sample CSV (`demo_flows.csv`): 500 flows, 252 incidents generated across PortScan (80), Benign (248), BruteForce (47), and DoS/DDoS (125).
    - Verified `GET /api/datasets`: HTTP 200, returned 1 ingested dataset.
    - Initiated live replay at 25 fps: captured 6 Socket.IO `replay:progress` events, stream halted safely.
    - Verified `GET /api/evaluation/dataset/:id`: Evaluated 500 flows; Random Forest ML demonstrated +39.5% advantage over rule baseline; computed multi-class confusion matrix, false positives (5), and false negatives (5).
    - Verified `GET /api/users`: HTTP 200, 2 registered accounts.
    - Verified `PATCH /api/users/:id/role`: Successfully promoted analyst to admin.
    - Verified `GET /api/audit-logs`: Recorded compliance events (`ROLE_CHANGE`, `DATASET_UPLOAD`, `REGISTER`).
    - Verified `GET /api/notifications`: 20 alerts recorded.
    - Clean teardown with graceful socket and server closure.

### Session 13 - 2026-11-19
- **Goal:** Phase 11 Quality and Security Audit across the entire repository.
- **Files Added/Changed:**
  - `server/src/config/env.js`: Strengthened `validateEnvConfig` to strictly reject weak/placeholder secrets (`super_secret_jwt_key_...`, `changeme`) and require `ADMIN_EMAIL` and `ADMIN_PASSWORD` (min 12 chars) when `NODE_ENV === "production"`.
  - `server/src/middlewares/errorHandler.js`: Added explicit handling for Mongoose `CastError` returning HTTP 400 Bad Request with code `INVALID_IDENTIFIER`, and CORS rejections mapped to HTTP 403 Forbidden with code `CORS_FORBIDDEN`.
  - `server/src/utils/logger.js`: Enhanced redaction list to include `passwordHash` and `*.passwordHash`.
  - `server/src/services/replayService.js`: Exported `stopReplaysForDataset(datasetId)` to abort background replay timers when their associated dataset is removed.
  - `server/src/services/datasetService.js`: Hooked `stopReplaysForDataset` into dataset deletion lifecycle to prevent orphaned socket emissions.
  - `server/src/controllers/notificationController.js`: Enhanced `GET /api/notifications` response to return accurate `unreadCount` scalar.
  - `server/src/models/Incident.js`: Added compound indexes `{ riskLevel: 1, detectedAt: -1 }` and `{ mlClass: 1, detectedAt: -1 }` for high-throughput SOC queries.
  - `server/src/models/AuditLog.js`: Added compound index `{ action: 1, timestamp: -1 }`.
  - `server/src/models/Notification.js`: Added compound indexes `{ targetRoles: 1, createdAt: -1 }` and `{ targetUser: 1, createdAt: -1 }`.
  - `server/scripts/verifyExplainPlans.js`: Standalone index execution plan verification script confirming `IXSCAN` without in-memory `SORT`.
  - `server/tests/securityAudit.test.js`: 10 comprehensive security regression and end-to-end integration tests (weak secret rejection, CastError 400, CORS 403, duplicate replay 409, replay stopping on dataset deletion, notification unreadCount, DB readyState 503, 404 handler, and full operator E2E lifecycle: register -> promote -> upload -> triage -> note -> export -> evaluation -> audit log).
  - `client/src/tests/a11y.test.jsx`: Automated accessibility suite using `@axe-core/react` / `vitest-axe` validating zero accessibility violations across Button, Input, Select, Badge, Card, EmptyState, Table, Modal, and ConfirmDialog.
  - `docs/SECURITY_REVIEW.md`: Detailed audit report containing route-by-route audit table, dependency vulnerability analysis, explain plan metrics, test summaries, and honest residual risk appraisal.
  - `docs/DECISIONS.md`: Added ADR-017 on security hardening, production configuration guards, and query index optimization.
- **Tests & Verification:**
  - `uv run pip-audit` in `ml-service`: 0 vulnerabilities detected.
  - `uv run pip-audit` in `ml-training`: 0 vulnerabilities detected.
  - `npm audit` in `server/`: 0 critical/high runtime vulnerabilities (vitest runner devDependency documented).
  - `npm audit` in `client/`: 0 critical runtime vulnerabilities (react-router SSR hydration advisory non-applicable to client-rendered SPA).
  - Secret scanning: Git history and source code clean; 0 credentials or private keys leaked.
  - Automated Accessibility (`axe-core` in client): 6 test suites passed, 0 violations.
  - MongoDB Explain Plans: Confirmed `IXSCAN` on `riskLevel_1_detectedAt_-1` and `status_1_riskLevel_1_detectedAt_-1` with `FETCH` stage and 0 in-memory sorting.
  - Full-stack test suite:
    - `server`: 14 test files, 110 passed (100%).
    - `client`: 10 test files, 71 passed (100%).
    - `ml-service`: 1 test file, 9 passed (100%).
    - `ml-training`: 2 test files, 10 passed (100%).
    - **Total Monorepo Tests:** 27 test files, 200 passed (100% pass rate).
  - ESLint: 0 errors, 0 warnings across `server/` and `client/`.
  - Client Build: `vite build` completed successfully, 314 kB gzip production bundle.

### Session 14 - 2026-11-19
- **Goal:** Phase 12 Production Packaging, Free-Tier Deployment Configuration & Operational Runbook.
- **Files Added/Changed:**
  - `render.yaml`: Infrastructure-as-code blueprint for Render Web Service (Node.js 22 LTS, free plan, automatic 32-byte JWT_SECRET generation, health check path `/api/health`, environment variable mapping).
  - `.node-version` & `server/.node-version`: Pinned Node.js 22.13.1 for Render and Vercel build runtimes.
  - `server/src/scripts/ensureIndexes.js`: Dedicated script to synchronize compound indexes across MongoDB Atlas collections with Mongoose `autoIndex: false` in production.
  - `server/package.json`: Added `"ensure-indexes": "node src/scripts/ensureIndexes.js"` and `"seed-admin": "node src/scripts/seedAdmin.js"`.
  - `server/src/server.js`: Integrated automatic, idempotent system administrator seeding during server boot when `ADMIN_EMAIL` and `ADMIN_PASSWORD` are configured in production.
  - `ml-service/Dockerfile`: Hardened for Hugging Face Spaces Docker specifications (UID 1000 `user`, working directory `/home/user/app`, `uv sync --frozen --no-dev --no-install-project` executed as unprivileged user, port 7860 exposed, healthcheck probe).
  - `client/vercel.json`: Added SPA routing rewrites `/(.*)` -> `/index.html` and CSP `connect-src` allowing `https://*.onrender.com`, `wss://*.onrender.com`, and `https://*.hf.space`.
  - `scripts/smokeTest.ps1`: Automated post-deployment PowerShell test script exercising API server health, database connectivity, security headers, ML microservice readiness, admin login, and end-to-end threat detection pipeline.
  - `.github/workflows/ci.yml`: Updated CI workflow executing full test suites, linters, and production build checks across all four monorepo subprojects.
  - `docs/DEPLOYMENT.md`: Comprehensive production guide detailing MongoDB Atlas M0, Hugging Face Spaces, Render, Vercel, cross-origin wiring, UptimeRobot keep-alive configuration, rollback procedures, and the 10-minute pre-demo drill.
  - `docs/DECISIONS.md`: Added ADR-018 on free-tier multi-cloud deployment architecture.
- **Tests & Verification:**
  - `smokeTest.ps1` syntax validated.
  - `render.yaml` and `.github/workflows/ci.yml` syntax validated.
  - `client/vercel.json` verified as valid JSON.
  - Total ML artifact footprint confirmed at ~78 KB (<50 MB threshold, no Git LFS needed).
  - Server linter passed with 0 errors.

### Session 15 - 2026-11-19
- **Goal:** Phase 13 Final Documentation, OpenAPI Specification, Academic Report, and Viva Defense Presentation Package.
- **Files Added/Changed:**
  - `README.md`: Completely rewritten comprehensive project manual complete with official badges, live demo placeholders, UI screenshot galleries, Mermaid architecture diagram, 4-tier tech stack breakdown, local setup PowerShell commands for all four modules, environment variable matrix, automated test execution instructions, ethics and safety statement, and MIT license.
  - `server/src/docs/openapi.json`: Complete OpenAPI 3.0.3 specification documenting all Express REST endpoints, schemas, parameters, security schemes, and responses.
  - `server/src/routes/docs.js`: Documentation router serving `GET /api/docs/openapi.json` and interactive Swagger UI on `GET /api/docs` (available in development; restricted to admin in production).
  - `server/src/app.js`: Mounted `docsRouter` at `/api/docs` and `/api/v1/docs`.
  - `docs/API.md`: Finalized specification detailing Swagger UI access, REST routes, WebSocket events, and internal ML microservice contract.
  - `docs/ARCHITECTURE.md`: Finalized system architecture featuring Mermaid component architecture (`flowchart TD`), detection lifecycle sequence diagram (`sequenceDiagram`), Mongoose data model entity-relationship diagram (`erDiagram`), and mathematical threat scoring derivation with factor conservation proofs.
  - `docs/ML_REPORT.md`: Finalized machine learning report featuring real test metrics from `metrics.json` (Random Forest 98.0% Accuracy vs Rule Baseline 62.0%), full confusion matrices, per-class precision/recall/F1 breakdowns, false positive/negative analysis, and operational NetFlow limitations.
  - `docs/FUTURE_WORK.md`: Detailed technical roadmap covering real-time eBPF/XDP stream capture, TreeSHAP feature attribution waterfall plots, Evidently AI concept drift monitoring, SIEM/SOAR CEF/Syslog forwarding, and unified domain SameSite=Strict HttpOnly cookies.
  - `docs/VIVA_PREP.md`: Comprehensive academic examination guide containing likely examiner technical questions with concise answers, key metrics cheat sheet, and a choreographed 5-minute live demonstration script.
  - `docs/NEXT_STEPS.md`: Finalized indicating all development phases are complete and repository is in maintenance / presentation-ready state.
- **Tests & Verification:**
  - Full test, lint, and build verification completed across all four subprojects.
  - 200 automated tests passing across 27 files in the monorepo (100% pass rate).
  - 0 accessibility violations (`axe-core`).
  - 0 ESLint errors or warnings across `server/` and `client/`.
  - Production client build successful (`vite build`, 314 kB gzip).

### Session 16 - 2026-11-25
- **Goal:** Operational stabilization, Evaluation metric synchronization, and Interactive Flow Detection Playground implementation.
- **Files Added/Changed:**
  - `client/src/features/dashboard/DetectPage.jsx`: Replaced empty placeholder with full interactive ad-hoc flow detection playground (quick-load presets, dual-mode key parameters/JSON inspector, live ML inference, 0-100 score gauge, baseline comparison, factor attribution).
  - `client/src/features/dashboard/detectPresets.js`: Extracted authentic CIC-IDS2017 presets (Normal HTTPS, DoS Hulk, PortScan, FTP BruteForce) with full 67-feature vectors and key editing fields.
  - `client/src/services/detectApi.js`: Client API client for `POST /api/detect` with single and batch dispatch.
  - `client/src/tests/detect.test.jsx`: 5 comprehensive unit tests for preset loading, mode toggling, threat detection execution, results display, and error handling.
  - `client/src/features/evaluation/EvaluationPage.jsx`: Fixed JSend envelope unwrap bug and bound Recalculate button with query invalidation and loading feedback.
  - `server/src/services/evaluationService.js`: Fixed baseline prediction property lookup (`prediction` instead of `baselineClass`).
- **Tests & Verification:**
  - Client Vitest suite: 11 files, 76/76 tests passed.
  - Client production build: compiled cleanly in 802ms (0 errors).
  - Server Vitest suite: 14 files, 110/110 tests passed.




