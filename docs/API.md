# API Specification

## Overview
All Express API endpoints are mounted under `/api` or `/api/v1`.
Protected endpoints require an `Authorization: Bearer <token>` header.

---

## 1. Express API Directory

### Infrastructure & Health (`/api`)
| Method | Endpoint | Access Role | Description | Response Shape |
|---|---|---|---|---|
| GET | `/api/health` | Public | System uptime, timestamp, and MongoDB connection state. | `{"status":"healthy","uptime":120,"database":"connected"}` |
| GET | `/api/ready` | Public | Readiness probe (returns 200 if DB connected, 503 if disconnected). | `{"status":"ready","database":"connected"}` |

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

### Detection, Scoring & Telemetry (`/api/detect`)
*Mounted at both `/api/detect` and `/api/v1/detect`.*

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| POST | `/api/detect` | Analyst, Admin | Classify single flow (`{"flow":{...}}`) or batch (`{"flows":[{...}]}`, max 100). Validates all 67 features with strict Zod schema (unknown keys rejected). Returns `{status:"success", data:{mlClass, confidence, probabilities, baselineClass, baselineRule, score, riskLevel, explanation}}`. |

### Incidents (`/api/incidents`, `/api/v1/incidents`)
*Mounted at both `/api/incidents` and `/api/v1/incidents`.*

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| GET | `/api/incidents` | Authenticated | Paginated query of recorded security incidents. Query params: `page`, `limit` (max 100), `sortBy`, `sortOrder`, `riskLevel`, `mlClass`, `status`, `datasetId`, `startDate`, `endDate`, `search`. IPs are masked for non-admin viewers. |
| GET | `/api/incidents/:id` | Authenticated | Fetch specific incident details and scoring breakdown. IPs are masked for non-admin viewers. |
| PATCH | `/api/incidents/:id/status` | Analyst, Admin | Update incident triage status (`New`, `Under Review`, `Resolved`). Enforces valid state transitions. Logs audit entry. |
| POST | `/api/incidents/:id/notes` | Analyst, Admin | Append an analytical investigation note (`text`: 1-2000 chars, plain text sanitized). Includes author attribution. |
| GET | `/api/incidents/export` | Authenticated | Export incidents to CSV format with spreadsheet formula injection protection (`'`, `+`, `-`, `@` escaped). IPs masked for non-admins. Capped at 5,000 records. Logs audit entry. |

### Datasets (`/api/datasets`, `/api/v1/datasets`)
*Mounted at both `/api/datasets` and `/api/v1/datasets`.*

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| POST | `/api/datasets/upload` | Analyst, Admin | Upload network flow CSV file (multipart/form-data, 5MB limit, 20,000 row cap). Validates MIME type, file extension, and binary signatures (PE/ELF/null-byte sniff). Features whitelist validated against 67 CIC-IDS2017 features. Chunked batch detection via ML microservice creates incidents for non-Benign flows and computes class distributions. Logs audit entry. |
| GET | `/api/datasets` | Authenticated | List uploaded datasets with pagination (`page`, `limit`). |
| GET | `/api/datasets/:id` | Authenticated | Fetch dataset summary: row count, benign count, incident count, class distribution, progress, and rejected rows (capped at 100). |
| DELETE | `/api/datasets/:id` | Admin | Delete dataset record and cascade-deletes all associated incident records. Logs audit entry. |

### Replay (`/api/replay`, `/api/v1/replay`)
*Mounted at both `/api/replay` and `/api/v1/replay`.*

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| POST | `/api/replay/start` | Analyst, Admin | Start simulated network traffic replay from an uploaded dataset or demo sample (`{"datasetId": "demo" | ObjectId, "ratePerSecond": 1-50}`). Emits live flow telemetry and creates real incidents. Enforces one active replay per user. |
| POST | `/api/replay/stop` | Analyst, Admin | Stop current user's active replay session and clean up server-side timers. |
| GET | `/api/replay/status` | Analyst, Admin | Retrieve active replay status, elapsed time, current rate, processed rows, and incident count. |

### Analytics & Statistics (`/api/stats`, `/api/v1/stats`)
*Mounted at both `/api/stats` and `/api/v1/stats`.*

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| GET | `/api/stats/summary` | Authenticated | High-level SOC telemetry summary: total events evaluated, attack count, high+critical count, critical count, active incidents, and attack ratio. |
| GET | `/api/stats/timeline` | Authenticated | Time-bucketed incident counts and threat scores (`interval`: `minute`, `hour`, `day`; optional `startDate`, `endDate`). Grouped by class and risk level. |
| GET | `/api/stats/distribution` | Authenticated | Multi-faceted distribution breakdown across attack class, risk level, triage status, and transport protocol. |
| GET | `/api/stats/top-sources` | Authenticated | Top source IP addresses ranked by incident volume with average and max threat scores. IP addresses are masked for non-admin viewers. Query param: `limit` (1-20, default 5). |

### Comparative Evaluation (`/api/evaluation`, `/api/v1/evaluation`)
*Mounted at both `/api/evaluation` and `/api/v1/evaluation`.*

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| GET | `/api/evaluation/latest` | Authenticated | Retrieve ML model architecture and offline training metrics alongside calibrated rule-based baseline reference metrics. |
| GET | `/api/evaluation/dataset/:id` | Authenticated | Compute live multi-class confusion matrices, precision, recall, macro F1, and weighted F1 comparing the ML model against the rule-based baseline on datasets with ground truth labels. Includes false positive/negative counts and discrepancy examples. |

### Alerts & Notifications (`/api/notifications`, `/api/v1/notifications`)
*Mounted at both `/api/notifications` and `/api/v1/notifications`.*

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| GET | `/api/notifications` | Authenticated | Paginated query of notifications scoped to the user's role (`unreadOnly`: boolean, `page`, `limit`). |
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
| `replay:feed` | `role:admin`, `role:analyst` | `{"userId", ...progress}` | Real-time replay feed broadcast for SOC analysts monitoring active sessions. |
| `notification:new` | `role:admin`, `role:analyst` | Notification Document | Instant alert broadcast when a Critical incident (`score >= 80`) is detected. |

---

## 3. ML Microservice API (`ml-service/`, FastAPI)
Internal server-to-server microservice; requires `X-API-Key: <ML_API_KEY>` header (constant-time verification).

| Method | Endpoint | Auth | Request Body | Description | Response Code |
|---|---|---|---|---|---|
| GET | `/health` | Public | None | Health check & model load status probe. | 200 OK |
| GET | `/model-info` | `X-API-Key` | None | Active model algorithm, version, features, and offline metrics. | 200 OK / 401 Unauthorized |
| POST | `/predict` | `X-API-Key` | `{"flow": { ... }}` | Classify single flow; returns class, confidence, and class probabilities. | 200 OK / 401 / 422 Unprocessable |
| POST | `/predict/batch` | `X-API-Key` | `{"flows": [ ... ]}` | Classify bounded batch (max 500 records). | 200 OK / 401 / 413 Too Large / 422 |
