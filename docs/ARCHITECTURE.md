# Architecture Specification

## Overview
AI CyberShield is an educational, prototype-grade Cyberattack Detection and Threat Analysis platform. It evaluates network flow records to classify security events, computes an explainable 0-100 threat score, records detected incidents, and streams events in real-time to a SOC monitoring dashboard.

```mermaid
flowchart TD
  subgraph Frontend ["Client Tier (React + Vite)"]
    UI["SOC Dashboard / Incident Triage / Evaluation UI"]
    WSClient["Socket.IO Client"]
    RESTClient["HTTP / Axios Client"]
  end

  subgraph Backend ["Backend API Tier (Node.js 22 + Express)"]
    API["Express REST API (Zod, Helmet, JWT)"]
    Scoring["scoringService (0-100 Threat Score)"]
    Baseline["baselineService (Rule-Based Heuristic)"]
    WSServer["Socket.IO Telemetry Gateway"]
  end

  subgraph MLService ["Machine Learning Tier (FastAPI + uv)"]
    FastAPIApp["FastAPI Model Microservice"]
    SklearnPipeline["scikit-learn Inference Pipeline"]
    Artifacts["Model Artifacts (joblib)"]
  end

  subgraph Storage ["Database Tier"]
    Mongo["MongoDB Atlas (Incidents, Users, Datasets)"]
  end

  RESTClient -->|Auth / Incidents / Evaluation| API
  WSClient <-->|Live Incident & Threat Stream| WSServer

  API -->|Persist & Query Incidents| Mongo
  API -->|Raw Flow Record Vectors (X-API-Key)| FastAPIApp
  FastAPIApp --> SklearnPipeline
  SklearnPipeline --> Artifacts
  FastAPIApp -->|Predicted Class & Probabilities| API

  API --> Scoring
  API --> Baseline
  Scoring --> WSServer
```

## System Components
1. **Client (`client/`)**: Modern Single Page Application (SPA) designed for security analysts. Visualizes live threats, incident breakdowns, historical trends, and ML vs. Baseline confusion matrices.
2. **Server (`server/`)**: Core business orchestration gateway:
   - Validates incoming network traffic records via Zod.
   - Delegates classification to the ML microservice over internal HTTP with API Key validation.
   - Computes normalized 0-100 severity threat scores based on predicted probabilities, protocol weights, and port sensitivity.
   - Evaluates the same record against a rule-based baseline for pedagogical comparison.
   - Persists incidents into MongoDB and broadcasts real-time alerts via Socket.IO.
3. **ML Microservice (`ml-service/`)**: Stateless prediction microservice exposing `/health`, `/predict`, and `/predict/batch` endpoints.
4. **ML Training (`ml-training/`)**: Offline dataset pipelines for data ingestion, cleaning, cross-validation, and artifact serialization.
