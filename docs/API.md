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

### Evaluation (`/api/evaluation`, `/api/v1/evaluation`)
| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| POST | `/api/v1/evaluation/run` | Analyst, Admin | Run evaluation comparing ML model vs. rule-based baseline. |
| GET | `/api/v1/evaluation/stats` | Authenticated | Fetch model vs. baseline accuracy, confusion matrices, and metrics. |

---

## 2. ML Microservice API (`ml-service/`, FastAPI)
Internal server-to-server microservice; requires `X-API-Key: <ML_API_KEY>` header (constant-time verification).

| Method | Endpoint | Auth | Request Body | Description | Response Code |
|---|---|---|---|---|---|
| GET | `/health` | Public | None | Health check & model load status probe. | 200 OK |
| GET | `/model-info` | `X-API-Key` | None | Active model algorithm, version, features, and offline metrics. | 200 OK / 401 Unauthorized |
| POST | `/predict` | `X-API-Key` | `{"flow": { ... }}` | Classify single flow; returns class, confidence, and class probabilities. | 200 OK / 401 / 422 Unprocessable |
| POST | `/predict/batch` | `X-API-Key` | `{"flows": [ ... ]}` | Classify bounded batch (max 500 records). | 200 OK / 401 / 413 Too Large / 422 |
