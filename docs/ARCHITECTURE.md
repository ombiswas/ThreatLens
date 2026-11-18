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

## Threat Scoring Architecture

The threat scoring engine (`server/src/services/scoringService.js`, configured in `server/src/config/scoring.js`) computes a deterministic, explainable 0–100 integer score:

### 1. Mathematical Formulation
$$\text{Score} = \min\left(100, \max\left(0, \operatorname{round}\left(100 \times \left(w_{\text{class}} \times S_{\text{class}} + w_{\text{conf}} \times C\right)\right)\right)\right)$$

Where:
- $w_{\text{class}} = 0.6$ (weight assigned to attack category severity)
- $w_{\text{conf}} = 0.4$ (weight assigned to model confidence probability $C \in [0.0, 1.0]$)
- $S_{\text{class}}$ is the normalized class severity:
  - `DoS/DDoS`: $1.00$
  - `BruteForce`: $0.85$
  - `PortScan`: $0.65$
  - `Benign`: $0.00$

### 2. Invariant Rules
- **Benign Invariant:** Any flow classified as `Benign` unconditionally evaluates to $\text{Score} = 0$ with `Low` risk and zero factor penalty.
- **Explainability Conservation:** The factor contribution scores returned in the `explanation` array strictly sum to the final calculated $\text{Score}$.

### 3. Risk Bands
| Band | Score Range | Operational Meaning |
|---|---|---|
| **Critical** | $80 - 100$ | Severe threat detected with high model confidence (immediate incident triage required). |
| **High** | $60 - 79$ | High-severity anomaly or moderate-confidence targeted attack probe. |
| **Medium** | $30 - 59$ | Reconnaissance or anomalous traffic requiring observation. |
| **Low** | $0 - 29$ | Benign network traffic or low-confidence anomaly. |
