# AI CyberShield

Intelligent Cyberattack Detection and Threat Analysis System.
An educational cybersecurity prototype developed as a B.Tech major project at Dev Bhoomi Uttarakhand University.

## Overview
AI CyberShield analyzes network-flow traffic records (CIC-IDS2017 / UNSW-NB15) to identify malicious patterns across common threat vectors (DoS/DDoS, PortScan, BruteForce) versus Benign activity. The platform computes a transparent 0-100 severity threat score, records detected security incidents, streams telemetry to a live Security Operations Center (SOC) dashboard, and evaluates the trained ML classifier against a rule-based baseline.

## Project Architecture
- `client/`: React 18, Vite, Tailwind CSS, Recharts, Socket.IO client (ES Modules)
- `server/`: Node.js 22 LTS, Express, MongoDB Atlas via Mongoose, Socket.IO, Zod, Helmet, Pino
- `ml-service/`: Python 3.11, FastAPI, scikit-learn, joblib, pytest, uv
- `ml-training/`: Python 3.11 offline dataset preprocessing and model training pipelines, uv
- `docs/`: System documentation, phase tracking, architecture diagrams, decision records, and API contracts

## Monorepo Layout
```text
ai-cybershield/
|-- client/               # React + Vite frontend
|-- server/               # Node.js + Express backend API
|-- ml-service/           # FastAPI microservice for ML inferences
|-- ml-training/          # Offline dataset processing & model training
|-- docs/                 # Architectural specifications & project tracking
`-- .github/workflows/    # Continuous integration pipelines
```

## Setup & Quickstart
Detailed setup and environment instructions will be expanded as respective services are scaffolded.
Refer to `docs/PROGRESS.md` for project status and `docs/ARCHITECTURE.md` for system design.
