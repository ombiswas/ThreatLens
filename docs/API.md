# API Specification

## Overview
All Express API endpoints are mounted under `/api` and `/api/v1`.
Protected endpoints require an `Authorization: Bearer <token>` header containing an HS256-signed JWT token issued by `/api/auth/login`.

An interactive **OpenAPI 3.0 (Swagger UI)** interface is accessible at:
- **Interactive UI:** `GET /api/docs` (available in development; restricted to `admin` in production)
- **OpenAPI 3.0 Spec:** `GET /api/docs/openapi.json`

---

## 1. Express API Directory

### Infrastructure & Health (`/api`)
| Method | Endpoint | Access Role | Description | Response Shape |
|---|---|---|---|---|
| GET | `/api/health` | Public | System uptime, timestamp, and MongoDB connection state. | `{"status":"healthy","uptime":120,"database":"connected"}` |
| GET | `/api/ready` | Public | Readiness probe (returns 200 if DB connected, 503 if disconnected). | `{"status":"ready","database":"connected"}` |
| GET | `/api/docs` | Public (Dev) / Admin (Prod) | Interactive Swagger UI API documentation explorer. | `text/html` |
| GET | `/api/docs/openapi.json` | Public (Dev) / Admin (Prod) | Machine-readable OpenAPI 3.0 specification. | `application/json` |

### Authentication & User Management (`/api/auth`, `/api/users`, `/api/audit-logs`)
*Mounted at both `/api/*` and `/api/v1/*`.*

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register new user (forces Viewer role). Strict password policy (min 10 chars, uppercase, lowercase, number, symbol, not equal to email). Response (201): `{"status":"success","data":{"user":{...},"token":"..."}}` |
| POST | `/api/auth/login` | Public | Authenticate credentials. Includes timing defense and account lockout after 5 failures (15 min). Response (200): `{"status":"success","data":{"user":{...},"token":"..."}}` |
| GET | `/api/auth/me` | Authenticated | Retrieve current user profile. Headers: `Authorization: Bearer <token>`. Response (200): `{"status":"success","data":{"user":{...}}}` |
| POST | `/api/auth/logout` | Authenticated | Client-side token discard with server-side audit logging. Response (200): `{"status":"success","message":"Logged out successfully"}` |
| GET | `/api/users` | Admin | List registered users with pagination (`page`, `limit`). Response (200): `{"status":"success","data":{"users":[...],"pagination":{...}}}` |
| PATCH | `/api/users/:id/role` | Admin | Update user role (`admin`, `analyst`, `viewer`). Self-demotion and demoting the last active administrator are blocked. |
| PATCH | `/api/users/:id/status` | Admin | Update user active status (`isActive: boolean`). Self-deactivation and disabling the last active administrator are blocked. |
| GET | `/api/audit-logs` | Admin | Retrieve paginated audit logs with filters (`action`, `userId`, `startDate`, `endDate`). IP is masked for non-admin viewers. |

### Threat Detection & Scoring (`/api/detect`)
*Mounted at both `/api/detect` and `/api/v1/detect`.*

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| POST | `/api/detect/flow` | Analyst, Admin | Classify single flow (`{"flow":{...}, "flowSummary":{...}}`). Validates all 67 features with strict Zod schema (unknown keys rejected). Returns `{status:"success", data:{mlClass, confidence, probabilities, baselineClass, baselineRule, threatScore, riskLevel, explanation}}`. |
| POST | `/api/detect/batch` | Analyst, Admin | Classify batch of flows (`{"flows":[{...}]}`, max 100). Returns array of evaluated flows with threat scores. |

### Incidents (`/api/incidents`)
*Mounted at both `/api/incidents` and `/api/v1/incidents`.*

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| GET | `/api/incidents` | Authenticated | Paginated query of recorded security incidents. Query params: `page`, `limit` (max 100), `sortBy`, `sortOrder`, `riskLevel`, `mlClass`, `status`, `datasetId`, `startDate`, `endDate`, `search`. IPs are masked for non-admin viewers. |
| GET | `/api/incidents/:id` | Authenticated | Fetch specific incident details and scoring breakdown. Malformed IDs return 400 `INVALID_IDENTIFIER`. IPs are masked for non-admin viewers. |
| PATCH | `/api/incidents/:id/status` | Analyst, Admin | Update incident triage status (`New`, `Under Review`, `Resolved`, `False Positive`). Enforces valid state transitions. Logs audit entry. |
| POST | `/api/incidents/:id/notes` | Analyst, Admin | Append an analytical investigation note (`text`: 1-2000 chars, plain text sanitized). Includes author attribution. |
| GET | `/api/incidents/export` | Analyst, Admin | Export incidents to CSV format with spreadsheet formula injection protection (`'`, `+`, `-`, `@` escaped). IPs masked for non-admins. Capped at 5,000 records. Logs audit entry. |

### Datasets (`/api/datasets`)
*Mounted at both `/api/datasets` and `/api/v1/datasets`.*

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| POST | `/api/datasets/upload` | Analyst, Admin | Upload network flow CSV file (multipart/form-data, 5MB limit, 20,000 row cap). Validates MIME type, file extension, and binary signatures (PE/ELF/null-byte sniff). Features whitelist validated against 67 CIC-IDS2017 features. Chunked batch detection via ML microservice creates incidents for non-Benign flows and computes class distributions. Logs audit entry. |
| GET | `/api/datasets` | Authenticated | List uploaded datasets with pagination (`page`, `limit`). |
| GET | `/api/datasets/:id` | Authenticated | Fetch dataset summary: row count, benign count, incident count, class distribution, progress, and rejected rows (capped at 100). |
| DELETE | `/api/datasets/:id` | Admin | Delete dataset record and cascade-deletes all associated incident records; halts any running replay session on this dataset. Logs audit entry. |

### Replay (`/api/replay`)
*Mounted at both `/api/replay` and `/api/v1/replay`.*

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| POST | `/api/replay/start` | Analyst, Admin | Start simulated network traffic replay from an uploaded dataset or demo sample (`{"datasetId": "demo" | ObjectId, "flowsPerSec": 1-50}`). Emits live flow telemetry and creates real incidents. Enforces one active replay per user. Returns 409 Conflict if already running. |
| POST | `/api/replay/stop` | Analyst, Admin | Stop active replay session and clean up server-side background timers. |
| GET | `/api/replay/status` | Authenticated | Retrieve active replay status, elapsed time, current rate, processed rows, and incident count. |

### Analytics & Statistics (`/api/stats`)
*Mounted at both `/api/stats` and `/api/v1/stats`.*

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| GET | `/api/stats/summary` | Authenticated | High-level SOC telemetry summary: total events evaluated, attack count, high+critical count, critical count, active incidents, and attack ratio. |
| GET | `/api/stats/timeline` | Authenticated | Time-bucketed incident counts and threat scores (`interval`: `minute`, `hour`, `day`; optional `startDate`, `endDate`). Grouped by class and risk level. |
| GET | `/api/stats/distribution` | Authenticated | Multi-faceted distribution breakdown across attack class, risk level, triage status, and transport protocol. |
| GET | `/api/stats/top-sources` | Authenticated | Top source IP addresses ranked by incident volume with average and max threat scores. IP addresses are masked for non-admin viewers. Query param: `limit` (1-20, default 5). |

### Comparative Evaluation (`/api/evaluation`)
*Mounted at both `/api/evaluation` and `/api/v1/evaluation`.*

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| GET | `/api/evaluation/latest` | Authenticated | Retrieve ML model architecture and offline training metrics alongside calibrated rule-based baseline reference metrics. |
| GET | `/api/evaluation/dataset/:id` | Authenticated | Compute live multi-class confusion matrices, precision, recall, macro F1, and weighted F1 comparing the ML model against the rule-based baseline on datasets with ground truth labels. Includes false positive/negative counts and discrepancy examples. |

### Alerts & Notifications (`/api/notifications`)
*Mounted at both `/api/notifications` and `/api/v1/notifications`.*

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| GET | `/api/notifications` | Authenticated | Paginated query of notifications scoped to the user's role and user ID (`unreadOnly`: boolean, `page`, `limit`). Returns scalar `unreadCount`. |
| PATCH | `/api/notifications/:id/read` | Authenticated | Mark a single notification as read by the current user. |
| PATCH | `/api/notifications/read-all` | Authenticated | Mark all visible unread notifications as read. |

---

## 2. WebSocket Real-Time Telemetry (Socket.IO)

### Connection & Authentication
- **Endpoint:** `/socket.io/`
- **Handshake Authentication:** JWT token provided in `auth.token` or `Authorization: Bearer <token>` header. Missing, expired, or tampered tokens are rejected with `Authentication error`.
- **CORS:** Strict origin match against `env.CLIENT_URL`.
- **Rooms Joined on Connect:**
  - `role:<user.role>` (`role:admin`, `role:analyst`, `role:viewer`)
  - `user:<user._id>` (private user notification and replay feed)
  - `authenticated` (general broadcast channel)

### Server-to-Client Events
| Event Name | Target Room | Payload | Description |
|---|---|---|---|
| `incident:new` | `role:admin` | Raw Incident Document | Emitted when a new security incident is detected. Contains unmasked IP addresses for administrators. |
| `incident:new` | `role:analyst`, `role:viewer` | Sanitized Incident Document | Emitted when a new security incident is detected. Source and destination IPs are masked (`192.168.1.xxx`). |
| `replay:progress` | `user:<userId>` | `{"datasetId", "progress", "processedRows", "totalRows", "incidentsCount", "status"}` | Live streaming progress updates for the user running the replay. |
| `notification:new` | `role:admin`, `role:analyst` | Notification Document | Instant alert broadcast when a Critical incident (`score >= 80`) is detected. |

---

## 3. Machine Learning Microservice API (`ml-service/`, FastAPI)

Internal service-to-service microservice listening on port 7860; requires `X-API-Key: <ML_API_KEY>` header with constant-time string comparison (`hmac.compare_digest`).

| Method | Endpoint | Auth | Request Body | Description | Response Code |
|---|---|---|---|---|---|
| GET | `/health` | Public | None | Health check & model load status probe. | 200 OK |
| GET | `/model-info` | `X-API-Key` | None | Active model algorithm, version, features, and offline metrics. | 200 OK / 401 Unauthorized |
| POST | `/predict` | `X-API-Key` | `{"flow": { ... }}` | Classify single flow; returns class, confidence, and class probabilities. | 200 OK / 401 / 422 Unprocessable |
| POST | `/predict/batch` | `X-API-Key` | `{"flows": [ ... ]}` | Classify bounded batch (max 100 records). | 200 OK / 401 / 413 Too Large / 422 |
