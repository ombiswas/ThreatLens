# API Specification

## Overview
All Express API endpoints are mounted under `/api/v1`.
Protected endpoints require an `Authorization: Bearer <token>` header.

---

## 1. Express API Directory

### Authentication & User Management (`/api/v1/auth`, `/api/v1/users`)
| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Public | Register a new user account (defaults to Viewer role). |
| POST | `/api/v1/auth/login` | Public | Authenticate user credentials and return JWT token. |
| GET | `/api/v1/auth/me` | Authenticated | Retrieve current user profile and permissions. |
| GET | `/api/v1/users` | Admin | List all registered users. |
| PATCH | `/api/v1/users/:id/role` | Admin | Update a user's assigned role. |

### Detection, Scoring & Telemetry (`/api/v1/detect`)
| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| POST | `/api/v1/detect/flow` | Analyst, Admin | Submit single network flow record for real-time scoring. |
| POST | `/api/v1/detect/batch` | Analyst, Admin | Submit a batch of records for batch classification and scoring. |

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
