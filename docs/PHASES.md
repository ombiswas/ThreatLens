# Project Phases & Roadmap

This document outlines the sequential phases of development for the AI CyberShield platform.

### Phase 0: Repository Foundation & Tracking Docs
- **Goal:** Set up monorepo skeleton, dependency tooling (`uv` & npm), linting/formatting configs, architecture documentation, tracking records, and CI workflows.
- **Target Deliverable:** Clean, passing builds across client, server, and ML projects with complete documentation.

### Phase 0.5: Dataset Tooling & Exploration
- **Goal:** Acquire and explore public benchmark datasets (CIC-IDS2017 / UNSW-NB15).
- **Target Deliverable:** Automated sampling scripts, feature definitions, class mappings (DoS/DDoS, PortScan, BruteForce, Benign), and dataset profiling reports.

### Phase 1: Machine Learning Offline Training & Evaluation
- **Goal:** Train, validate, and serialize production-grade intrusion detection classifiers using scikit-learn.
- **Target Deliverable:** Validated model pipelines, hyperparameter tuning, evaluation metrics (accuracy, F1, confusion matrix), and serialized artifacts (`.joblib`).

### Phase 2: FastAPI Machine Learning Microservice
- **Goal:** Implement the stateless ML prediction microservice.
- **Target Deliverable:** FastAPI app with Pydantic validation, `/predict` and `/predict/batch` endpoints, `X-API-Key` security, and unit tests.

### Phase 3: Server Foundation & Core Infrastructure
- **Goal:** Build the Node.js Express API framework.
- **Target Deliverable:** Database connectivity with Mongoose, centralized error handling, Zod validation middleware, Pino logging, Helmet, and rate limiting.

### Phase 4: Authentication & Role-Based Access Control
- **Goal:** Implement secure user management.
- **Target Deliverable:** JWT issuance/verification, bcrypt password hashing, seed scripts for system admin, and role middleware (`Viewer`, `Analyst`, `Admin`).

### Phase 5: Threat Detection Core & Scoring Engine
- **Goal:** Implement detection orchestration, ML client integration, explainable threat scoring, and rule-based baseline.
- **Target Deliverable:** `scoringService` (0-100 score), `baselineService`, and ML microservice integration with fallback resilience.

### Phase 6: Incidents & Datasets Management
- **Goal:** Implement incident persistence, query APIs, CSV dataset ingestion, and safe CSV export.
- **Target Deliverable:** MongoDB models, pagination, sanitization against formula injection, and file upload validation.

### Phase 7: Real-Time Telemetry & Evaluation Analytics
- **Goal:** Establish real-time WebSocket communication and comparative evaluation metrics.
- **Target Deliverable:** Socket.IO event broadcasting for live detections and server-side ML vs. baseline comparative calculations.

### Phase 8: Client Foundation & Shell Architecture
- **Goal:** Construct the frontend application shell and state management.
- **Target Deliverable:** React Router setup, authentication context, dark SOC theme, responsive layout, and navigation.

### Phase 9: SOC Dashboard & Incident Triage UI
- **Goal:** Build operational interfaces for live detection monitoring.
- **Target Deliverable:** Real-time threat feed, severity KPI cards, interactive Recharts telemetry charts, and incident detail modals.

### Phase 10: Datasets, Baseline Comparison & Admin UI
- **Goal:** Build dataset management and comparative evaluation screens.
- **Target Deliverable:** CSV upload interface, side-by-side ML vs. baseline metric visualizers, and user role administration.

### Phase 11: Comprehensive Testing & Security Hardening
- **Goal:** Verify end-to-end reliability and enforce security safeguards.
- **Target Deliverable:** Backend integration tests, ML service tests, UI component tests, security audit, and zero critical vulnerabilities.

### Phase 12: Production Packaging & Free-Tier Deployment
- **Goal:** Prepare production deployment configurations across target hosting providers.
- **Target Deliverable:** Container definitions, Vercel configuration for frontend, Render configuration for backend, and Hugging Face Spaces Docker setup for ML service.

### Phase 13: Final Documentation & Viva Defense Preparation
- **Goal:** Compile project report, user guides, and demonstration scripts for B.Tech project evaluation.
- **Target Deliverable:** Comprehensive project documentation, presentation slides guide, and step-by-step viva defense walkthrough.
