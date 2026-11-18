# API Specification

## Overview
All Express API endpoints are mounted under `/api/v1`.
Protected endpoints require an `Authorization: Bearer <token>` header.

## Endpoint Directory

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

## ML Microservice API (`FastAPI`)
Internal microservice; requires `X-API-Key: <ML_API_KEY>` header.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Service health status and loaded model metadata. |
| POST | `/predict` | Classify a single feature vector. |
| POST | `/predict/batch` | Classify a batch of feature vectors (bounded batch limit). |
