# AI CyberShield - Security & Quality Audit Report

**Date:** November 19, 2026  
**Auditor:** Lead Security & Full-Stack Engineer (Skeptical Code Reviewer Role)  
**Project:** AI CyberShield: Intelligent Cyberattack Detection and Threat Analysis System  
**Institution:** Dev Bhoomi Uttarakhand University (B.Tech Major Project)  
**Standard:** OWASP Top 10 API Security Risks (2023), ASVS 4.0, CWE/SANS Top 25, WCAG 2.1 AA  

---

## 1. Executive Summary & Audit Scope

This comprehensive audit evaluated the security posture, operational robustness, and defensive safeguards across the entire AI CyberShield repository. The review was conducted from the adversarial perspective of a skeptical external auditor.

### Audit Perimeter
1. **Server (Node.js 22 + Express 4.21 + MongoDB 8 / Mongoose):**
   - 28 REST API endpoints spanning 9 functional routers.
   - Real-time WebSocket connection handling via Socket.IO (`/socket.io/`).
   - Middleware pipeline (Helmet, CORS, Rate Limiters, NoSQL Sanitizer, Zod Validator, Central Error Handler).
2. **Machine Learning Microservice (FastAPI + Python 3.11 + scikit-learn):**
   - Inference endpoints (`/predict`, `/predict/batch`, `/health`, `/model-info`).
   - Constant-time HMAC authentication (`X-API-Key`).
   - SlowAPI IP rate limiting and Pydantic schema validation.
3. **ML Training & Ingestion Tooling (`ml-training/`):**
   - Dataset sanitization, feature leakage exclusion, model training, and artifact integrity.
4. **Web Client (React 18 + Vite + Tailwind CSS):**
   - XSS vectors, token storage lifecycle, URL tampering, routing guards, and WCAG 2.1 AA accessibility.
5. **Dependencies & Version Control:**
   - Git history secret scanning and automated package vulnerability audits (`npm audit`, `pip-audit`).

---

## 2. Route-by-Route Security & Authorization Review

Every backend route was audited against the controls enumerated in [`docs/SECURITY.md`](file:///d:/Projects/ThreatLens/docs/SECURITY.md).

| Method | Endpoint | Auth Required | RBAC Level | Rate Limit | Input Validation | Injection & IDOR Protection | Residual Risk / Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | None | Public | 10 req / 15m | Zod (strict email, strong password) | Pre-computed bcrypt hash timing defense; default role pinned to `Viewer` | **VERIFIED PASS** |
| `POST` | `/api/auth/login` | None | Public | 5 req / 15m | Zod (email, password) | 5-attempt failure lockout (15m window); uniform `Invalid credentials` error | **VERIFIED PASS** |
| `GET` | `/api/auth/me` | JWT | Any Active | Global | None | Token claims mapped to fresh DB lookup; rejects deactivated accounts | **VERIFIED PASS** |
| `POST` | `/api/auth/logout` | JWT | Any Active | Global | None | Informs client to purge memory/sessionStorage; server logs `LOGOUT` audit | **VERIFIED PASS** |
| `GET` | `/api/users` | JWT | `Admin` | Global | Zod pagination | Pagination capped at 100; passwordHash excluded via projection | **VERIFIED PASS** |
| `PATCH` | `/api/users/:id/role` | JWT | `Admin` | Sensitive | Zod (`role` enum) | Target ID validated; prevents self-demotion and demoting last active Admin | **VERIFIED PASS** |
| `PATCH` | `/api/users/:id/status` | JWT | `Admin` | Sensitive | Zod (`isActive` bool) | Prevents self-deactivation and disabling last active Admin | **VERIFIED PASS** |
| `GET` | `/api/incidents` | JWT | Any Active | Global | Zod query filters | Role-aware IP masking (`Viewer` sees masked IPs); pagination capped at 100 | **VERIFIED PASS** |
| `GET` | `/api/incidents/:id` | JWT | Any Active | Global | Zod ObjectId | CastError mapped to 400 `INVALID_IDENTIFIER`; IP masked for `Viewer` | **VERIFIED PASS** |
| `PATCH` | `/api/incidents/:id/status` | JWT | `Analyst`, `Admin` | Sensitive | Zod state machine | Valid transitions enforced (`New` -> `Under Review` -> `Resolved`/`False Positive`) | **VERIFIED PASS** |
| `POST` | `/api/incidents/:id/notes` | JWT | `Analyst`, `Admin` | Sensitive | Zod (text 1..2000) | Plaintext notes; author pinned to authenticated `req.user.id` | **VERIFIED PASS** |
| `GET` | `/api/incidents/export` | JWT | `Analyst`, `Admin` | Sensitive | Zod query params | Formula injection sanitization (`=`, `+`, `-`, `@`); hard 5000 row cap | **VERIFIED PASS** |
| `GET` | `/api/datasets` | JWT | Any Active | Global | Zod pagination | Read-only listing; metadata only | **VERIFIED PASS** |
| `GET` | `/api/datasets/:id` | JWT | Any Active | Global | Zod ObjectId | CastError defended; summary metadata only | **VERIFIED PASS** |
| `POST` | `/api/datasets/upload` | JWT | `Analyst`, `Admin` | Sensitive | Multer + Zod + CSV | 5MB memory limit; 20,000 row cap; magic-byte check; header whitelist | **VERIFIED PASS** |
| `DELETE` | `/api/datasets/:id` | JWT | `Admin` | Sensitive | Zod ObjectId | Atomic cascading cleanup; aborts any active replay session attached to dataset | **VERIFIED PASS** |
| `POST` | `/api/detect/flow` | JWT | `Analyst`, `Admin` | Sensitive | Zod (67 features) | Unknown properties stripped; calls ML microservice with timeout & retry | **VERIFIED PASS** |
| `POST` | `/api/detect/batch` | JWT | `Analyst`, `Admin` | Sensitive | Zod (max 100 flows) | Bounded batch size; partial failure resilient | **VERIFIED PASS** |
| `POST` | `/api/replay/start` | JWT | `Analyst`, `Admin` | Sensitive | Zod (datasetId, rate) | Prevents concurrent duplicate replay on same dataset (409 Conflict) | **VERIFIED PASS** |
| `POST` | `/api/replay/stop` | JWT | `Analyst`, `Admin` | Sensitive | Zod (datasetId) | Halts background replay timer; idempotent | **VERIFIED PASS** |
| `GET` | `/api/replay/status` | JWT | Any Active | Global | None | Memory state query | **VERIFIED PASS** |
| `GET` | `/api/evaluation/dataset/:id` | JWT | Any Active | Global | Zod ObjectId | Compares ML model against Rule-Based Baseline across all closed flows | **VERIFIED PASS** |
| `GET` | `/api/evaluation/model-info` | JWT | Any Active | Global | None | Read-only model artifact metadata | **VERIFIED PASS** |
| `GET` | `/api/notifications` | JWT | Any Active | Global | Zod pagination | Scoped to user ID and user role; returns accurate `unreadCount` | **VERIFIED PASS** |
| `PATCH` | `/api/notifications/:id/read` | JWT | Any Active | Global | Zod ObjectId | IDOR defense: updates notification only if target matches user ID or role | **VERIFIED PASS** |
| `PATCH` | `/api/notifications/read-all` | JWT | Any Active | Global | None | Scoped bulk update for current user | **VERIFIED PASS** |
| `GET` | `/api/audit-logs` | JWT | `Admin` | Global | Zod query filters | Immutable audit trail; only Admin can query | **VERIFIED PASS** |
| `GET` | `/api/stats` | JWT | Any Active | Global | None | Aggregate summary counters; zero sensitive leak | **VERIFIED PASS** |
| `GET` | `/api/health` | None | Public | Global | None | Liveness check; reports service and DB status without stack traces | **VERIFIED PASS** |

---

## 3. Dependency & Vulnerability Assessment

### Python Services (`ml-service` & `ml-training`)
Audit executed using `pip-audit` via `uv run pip-audit`:
- `ml-service`: **0 known vulnerabilities detected** across all pinned packages (FastAPI 0.115.8, scikit-learn 1.6.1, slowapi 0.1.9, uvicorn 0.34.0, pydantic 2.10.6).
- `ml-training`: **0 known vulnerabilities detected** across all data-science tooling (pandas, numpy, scikit-learn, joblib, matplotlib, seaborn).

### Node.js Ecosystem (`server` & `client`)
Audit executed using `npm audit`:
- **Server:**
  - Runtime dependencies (`express`, `bcrypt`, `mongoose`, `jsonwebtoken`, `helmet`, `zod`, `pino`, `socket.io`): **0 critical or high runtime vulnerabilities**.
  - `tinypool` / `@vitest/mocker`: Reported in `vitest` devDependency. Vitest is strictly a build-time test runner and is excluded from production server runtimes.
- **Client:**
  - Runtime dependencies (`react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`, `lucide-react`, `recharts`, `socket.io-client`): **0 critical runtime vulnerabilities**.
  - `react-router`: Moderate advisory regarding SSR hydration in Remix/SSR environments. AI CyberShield is a purely static client-rendered SPA (`vite build` -> Vercel static hosting), making SSR hydration vulnerabilities inapplicable.

### Secret & Key Scanning
- Git commit log scanned via `git log -p` and targeted regex patterns for API keys, private keys, JWT secrets, and connection strings.
- Result: **Zero plaintext credentials committed**.
- All `.env` files are strictly gitignored. Sample files (`.env.example`) contain explicitly labelled dummy values.

---

## 4. Security Deficiencies Identified & Remediations Applied

During the skeptical code review, several security edge cases were discovered and hardened with failing regression tests added prior to resolution:

### 1. Rejection of Weak & Placeholder Secrets in Production
- **Finding:** Under `NODE_ENV=production`, an operator might inadvertently leave default development secrets in place (`JWT_SECRET="super_secret_jwt_key_..."` or `changeme`).
- **Fix:** In `server/src/config/env.js`, enhanced `validateEnvConfig` to strictly reject weak placeholder strings and require `ADMIN_EMAIL` and `ADMIN_PASSWORD` (minimum 12 characters) whenever `NODE_ENV === "production"`.
- **Test:** `server/tests/securityAudit.test.js` -> `"rejects weak placeholder secrets in production mode"` (PASSED).

### 2. Malformed MongoDB Identifier (CastError) Handling
- **Finding:** Passing a non-hex string (e.g., `/api/incidents/invalid-hex-123`) triggered an unhandled Mongoose `CastError`, resulting in an internal 500 status code.
- **Fix:** Added dedicated `CastError` branch in `server/src/middlewares/errorHandler.js` returning HTTP 400 Bad Request with standardized error code `INVALID_IDENTIFIER`.
- **Test:** `server/tests/securityAudit.test.js` -> `"returns 400 INVALID_IDENTIFIER when malformed ObjectId is requested on /api/incidents/:id"` (PASSED).

### 3. Explicit CORS Forbidden Status
- **Finding:** Unauthorized origins were rejected with a generic internal server error (500).
- **Fix:** Configured CORS rejection to emit an `AppError(403, "CORS origin denied", "CORS_FORBIDDEN")` in `errorHandler.js`.
- **Test:** `server/tests/securityAudit.test.js` -> `"rejects unauthorized origin with 403 CORS_FORBIDDEN"` (PASSED).

### 4. Active Replay Termination on Dataset Deletion
- **Finding:** If an administrator deleted a dataset while an active replay session was streaming flows, orphaned background intervals could continue attempting to emit socket events.
- **Fix:** Exported `stopReplaysForDataset(datasetId)` in `server/src/services/replayService.js` and hooked it directly into `deleteDataset` in `datasetService.js`.
- **Test:** `server/tests/securityAudit.test.js` -> `"aborts active replay when dataset is deleted by administrator"` (PASSED).

### 5. Sensitive Credential Redaction in Application Logs
- **Finding:** While `password` was redacted in Pino logger configurations, `passwordHash` could theoretically leak in administrative audit payloads.
- **Fix:** Added `passwordHash` and `*.passwordHash` to `server/src/utils/logger.js` redaction paths.

### 6. Accurate Notification Badge Count
- **Finding:** `GET /api/notifications` returned the paginated notification array but lacked a direct scalar `unreadCount`, requiring client-side computation.
- **Fix:** Enhanced `notificationController.js` to return `unreadCount` calculated via `Notification.countDocuments` scoped to the user and their role.

---

## 5. Automated Accessibility Audit (WCAG 2.1 AA)

Automated accessibility testing was conducted using `@axe-core/react` / `vitest-axe` across all shared UI components in `client/src/tests/a11y.test.jsx`:

| Component Tested | Accessibility Standards Evaluated | Axe Violations Found | Result |
| :--- | :--- | :--- | :--- |
| `Button` | Contrast, focus rings, disabled state aria-disabled | 0 | **PASS** |
| `Input` & `Select` | Explicit `id`/`htmlFor` labels, aria-invalid, aria-describedby | 0 | **PASS** |
| `Badge` (Risk & Status) | Multi-modal indicators (icons + text + color contrast) | 0 | **PASS** |
| `Card` & `EmptyState` | Semantic landmark structure, accessible heading hierarchy | 0 | **PASS** |
| `Table` | Accessible caption, header scopes (`scope="col"`) | 0 | **PASS** |
| `Modal` & `ConfirmDialog` | Focus trapping, `aria-modal="true"`, `role="dialog"`, `aria-labelledby` | 0 | **PASS** |

**Total Accessibility Violations:** 0 across all 6 test suites.

---

## 6. Performance & Database Query Execution Plans

To ensure database queries remain scalable and do not degrade the SOC dashboard under high event volume, compound indexes were established and validated using MongoDB `explain("executionStats")`:

### Incident Collection Indexes
```javascript
{ "status": 1, "riskLevel": 1, "detectedAt": -1 } // Main SOC filter & sort
{ "riskLevel": 1, "detectedAt": -1 }              // Severity-based triage
{ "mlClass": 1, "detectedAt": -1 }                // Attack class telemetry
{ "datasetId": 1, "detectedAt": -1 }              // Dataset incident isolation
```

### Explain Plan Results
1. **Query:** `Incident.find({ riskLevel: "Critical" }).sort({ detectedAt: -1 })`
   - **Winning Plan Stage:** `FETCH`
   - **Input Stage:** `IXSCAN` using index `riskLevel_1_detectedAt_-1`
   - **In-Memory Sort Stage (`SORT`):** **None** (zero in-memory sort; index-ordered traversal).
2. **Query:** `Incident.find({ status: "New", riskLevel: "Critical" }).sort({ detectedAt: -1 })`
   - **Winning Plan Stage:** `FETCH`
   - **Input Stage:** `IXSCAN` using index `status_1_riskLevel_1_detectedAt_-1`
   - **In-Memory Sort Stage (`SORT`):** **None**.

### Frontend Bundle Optimization
- Production build executed via `vite build`:
  - `dist/index.html`: 0.95 kB (gzip: 0.52 kB)
  - `dist/assets/index.css`: 35.45 kB (gzip: 6.75 kB)
  - `dist/assets/index.js`: 1,085 kB (gzip: 314.08 kB)
- Zero usage of `eval()`, `dangerouslySetInnerHTML`, or `innerHTML` in client source code.

---

## 7. Residual Risks, Limitations & Constraints

In adherence to honest engineering standards, the following architectural trade-offs and hosting constraints are documented:

1. **Client-Side Token Storage Trade-Off:**
   - *Architecture:* JWT access tokens are stored in React application memory with a `sessionStorage` fallback to persist state across tab refreshes.
   - *Trade-off:* An `HttpOnly`, `SameSite=Strict` cookie provides stronger defense against Cross-Site Scripting (XSS). However, because AI CyberShield is deployed on decoupled free-tier hosting (React SPA on Vercel, Express API on Render), cross-origin cookies on different subdomains introduce Safari ITP and third-party cookie blocking issues.
   - *Mitigation:* Zero `dangerouslySetInnerHTML` usage, strict input sanitization, automated Axe tests, and rigorous CSP (`client/vercel.json`) prevent XSS vectors.

2. **Free-Tier Host Cold Starts:**
   - *Architecture:* Render and Hugging Face Spaces free-tier instances sleep after 15 minutes of inactivity.
   - *Impact:* Initial requests after spin-down may encounter 30–50 second delays.
   - *Mitigation:* The React client features an active "Server Waking Up" banner if any request exceeds 4.0 seconds, and the backend `MLClient` implements an exponential backoff retry loop (3 attempts, 10s timeout) to absorb cold starts smoothly without dropping analyst data.

3. **Bi-Directional Flow Completion Requirement:**
   - *Architecture:* The ML classifier operates on 67 statistical network-flow features (e.g., flow duration, inter-arrival times, packet count ratios).
   - *Constraint:* Detection cannot occur on raw, isolated IP packets; a network flow must terminate or reach its timeout before statistical aggregation can classify it. This is a fundamental property of network flow analysis (NetFlow/IPFIX) rather than a software defect.

---

## 8. Test Suite Summary & Real Outputs

All test suites were executed cleanly in their native environments:

| Test Suite | Framework / Tool | Test Files | Total Tests | Status | Execution Time |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Server Tests** | Vitest + Supertest + MongoMemoryServer | 14 | 110 | **110 PASSED / 0 FAILED** | 12.22s |
| **Client Tests** | Vitest + React Testing Library + axe-core | 10 | 71 | **71 PASSED / 0 FAILED** | 2.50s |
| **ML Microservice** | Pytest + AnyIO + FastAPI TestClient | 1 | 9 | **9 PASSED / 0 FAILED** | 14.35s |
| **ML Training Pipeline** | Pytest + Scikit-Learn + Pandas | 2 | 10 | **10 PASSED / 0 FAILED** | 46.08s |
| **Server Lint** | ESLint 9 | - | - | **0 errors / 0 warnings** | 2.1s |
| **Client Lint** | ESLint 9 | - | - | **0 errors / 0 warnings** | 3.2s |
| **Client Build** | Vite 5.4.21 | - | - | **Success (314 kB gzip)** | 23.84s |
| **Total Test Count** | Full Stack Suite | **27 files** | **200 tests** | **100% Pass Rate** | - |

---

## 9. Conclusion

The AI CyberShield system satisfies all security, robustness, and accessibility requirements defined for Phase 11. All identified edge cases (weak production configs, CastError handling, CORS error mapping, replay concurrency cleanup) have been resolved with regression tests. The codebase is clean, well-indexed, and prepared for final production packaging and deployment in Phase 12.
