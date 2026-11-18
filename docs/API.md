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

### Incidents (`/api/v1/incidents`)
| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| GET | `/api/v1/incidents` | Authenticated | Paginated query of recorded security incidents. |
| GET | `/api/v1/incidents/:id` | Authenticated | Fetch specific incident details and scoring breakdown. |
| PATCH | `/api/v1/incidents/:id/status` | Analyst, Admin | Update incident triage status (Open, Investigating, Resolved). |
| GET | `/api/v1/incidents/export` | Analyst, Admin | Export sanitized incident logs to CSV. |

### Datasets & Evaluation (`/api/v1/datasets`, `/api/v1/evaluation`)
| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| POST | `/api/v1/datasets/upload` | Analyst, Admin | Upload validated test dataset CSV for evaluation. |
| GET | `/api/v1/datasets` | Authenticated | List uploaded datasets. |
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
