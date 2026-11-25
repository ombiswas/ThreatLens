# AI CyberShield: Intelligent Cyberattack Detection and Threat Analysis System

[![Node.js](https://img.shields.io/badge/Node.js-22%20LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://python.org/)
[![uv](https://img.shields.io/badge/uv-Package%20Manager-DE5FE9?logo=astral&logoColor=white)](https://github.com/astral-sh/uv)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20M0-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-200%20Passed-brightgreen)](https://github.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **B.Tech Major Project** in Computer Science & Engineering  
> **Institution:** Dev Bhoomi Uttarakhand University  
> **Academic Session:** 2026-2027  

AI CyberShield is an end-to-end cybersecurity intelligence platform designed to classify network-flow traffic records into attack categories (`DoS/DDoS`, `PortScan`, `BruteForce`) versus `Benign` traffic. The platform calculates a transparent, mathematically explainable 0–100 threat severity score, records security incidents, streams telemetry to a live Security Operations Center (SOC) dashboard, and benchmarks the machine learning classifier against a domain-standard rule-based heuristic baseline on identical test data.

---

## Live Deployments & Demo Links

| Service | Hosting Platform | URL | Status |
| :--- | :--- | :--- | :--- |
| **SOC Web Client** | Vercel (Edge CDN) | `https://ai-cybershield.vercel.app` *(Placeholder)* | Production Ready |
| **Express API Server**| Render (Free Tier) | `https://ai-cybershield-server.onrender.com` *(Placeholder)* | Production Ready |
| **ML Inference Service**| Hugging Face Spaces | `https://<user>-ai-cybershield-ml.hf.space` *(Placeholder)* | Production Ready |
| **Interactive API Docs**| Render / Express | `https://ai-cybershield-server.onrender.com/api/docs` | OpenAPI 3.0 (Admin) |

---

## User Interface & Screenshots

| SOC Monitoring Dashboard | Forensic Incident Triage |
| :---: | :---: |
| ![SOC Dashboard](docs/screenshots/dashboard.png) *(Real-time KPI cards, timeline, distributions, throttled live feed)* | ![Incident Forensic Triage](docs/screenshots/incident_modal.png) *(Explainable 0-100 threat score, factor breakdown, notes)* |

| Comparative Evaluation (ML vs Baseline) | Ingestion & Traffic Replay |
| :---: | :---: |
| ![Evaluation Benchmarks](docs/screenshots/evaluation.png) *(Accuracy delta, confusion matrix heatmap, discrepancy analysis)* | ![Traffic Replay Console](docs/screenshots/replay.png) *(Drag-and-drop CSV validation, 1-50 fps traffic simulator)* |

---

## System Architecture

```mermaid
flowchart TD
  subgraph Client ["Client Tier (React 18 + Vite)"]
    UI["SOC Dashboard & Incident Triage UI"]
    SocketClient["Socket.IO Client (Auto-Reconnect)"]
    AxiosClient["Axios HTTP Client (4s Wake-up Detector)"]
  end

  subgraph Gateway ["Backend API Tier (Node.js 22 LTS + Express)"]
    ExpressApp["Express REST API (Zod, Helmet, NoSQL Sanitizer)"]
    ScoringService["scoringService (0-100 Threat Score Engine)"]
    BaselineService["baselineService (Rule-Based Heuristic)"]
    ReplayEngine["replayService (Traffic Simulator)"]
    SocketGateway["Socket.IO Telemetry Gateway"]
    MLClient["MLClient (HTTP, Retries, Exponential Backoff)"]
  end

  subgraph MLService ["Machine Learning Tier (FastAPI + uv)"]
    FastAPIApp["FastAPI Microservice (Port 7860)"]
    PydanticModel["Pydantic Validator (67 Features)"]
    RFClassifier["Random Forest Classifier (joblib)"]
  end

  subgraph Storage ["Database Tier (MongoDB Atlas M0)"]
    Mongo[("MongoDB Atlas Collections")]
  end

  AxiosClient -->|Bearer JWT REST| ExpressApp
  SocketClient <-->|Live Telemetry Feed| SocketGateway

  ExpressApp --> Mongo
  ExpressApp --> ScoringService
  ExpressApp --> BaselineService
  ExpressApp --> ReplayEngine

  ExpressApp -->|X-API-Key /predict| MLClient
  MLClient --> FastAPIApp
  FastAPIApp --> PydanticModel
  PydanticModel --> RFClassifier
  RFClassifier -->|Class & Probabilities| MLClient

  ScoringService --> SocketGateway
  ReplayEngine --> SocketGateway
```

---

## Key Features

1. **Machine Learning Attack Classification:**
   - Classifies 67 bidirectional flow features into `DoS/DDoS`, `PortScan`, `BruteForce`, or `Benign`.
   - Selected Champion: **Random Forest Ensemble** achieving **98.00% Accuracy** and **0.9802 Macro F1** on held-out CIC-IDS2017 test splits.
2. **Transparent 0–100 Threat Severity Scoring:**
   - Pure, deterministic calculation: $\text{Score} = \operatorname{round}(100 \times (0.6 \times S_{\text{class}} + 0.4 \times C))$.
   - Satisfies the *Factor Conservation Invariant*: severity contribution + confidence contribution strictly sum to the final score.
   - Categorized into operational risk bands: `Low` (0–29), `Medium` (30–59), `High` (60–79), `Critical` (80–100).
3. **Interactive Single Flow Detection Playground (`/detect`):**
   - On-demand manual flow inspection and testing console for security analysts.
   - Quick-loads 4 authentic CIC-IDS2017 attack presets (`DoS Hulk Flood`, `PortScan Sweep`, `FTP Brute Force`, `Normal HTTPS`).
   - Live dual-mode feature inspector (12 Key Parameters vs. Raw 67-feature JSON) with real-time ML inference, threat dial, rule baseline comparison, and explainability factors.
4. **Objective Baseline Benchmark & Comparative Evaluation (`/evaluation`):**
   - Implements a domain-calibrated Rule-Based Heuristic baseline evaluating identical flow records.
   - Demonstrates empirical proof of ML superiority: **+36.00% Accuracy gain** and **+51.07% Macro F1 advantage** over static rules.
   - Interactive Recharts visualization with multi-class confusion matrix heatmap and discrepancy analysis.
5. **Live SOC Telemetry & Throttled Streaming (`/dashboard`):**
   - Real-time event broadcasting over Socket.IO with auto-reconnection and role-based channels.
   - Live stream panel with 250ms batch rendering and a 50-item buffer cap to prevent browser re-render storms during high-speed traffic.
6. **Interactive Network Traffic Replay & Ingestion (`/datasets`):**
   - Built-in traffic simulator streaming flows at 1–50 flows/sec from real ingested CSV datasets without executing offensive network scans.
   - Multi-layer CSV security: file extension, MIME type, PE/ELF executable binary sniffing, and header whitelist against 67 features.
7. **Forensic Incident Triage & Safety (`/incidents`):**
   - Searchable, filterable incident lifecycle management (`New`, `Under Review`, `Resolved`) with analyst notes, formula-injection-safe CSV export, and role-based access control (Admin, Analyst, Viewer).
8. **Enterprise Defensive Security & RBAC:**
   - Passwords hashed with bcrypt (cost 12), pre-computed dummy hash timing defense, 5-failure lockout (15 min).
   - Role-Based Access Control (`Admin`, `Analyst`, `Viewer`) with self-demotion prevention and role-based IP masking.
   - Strict Zod validation, NoSQL injection prevention, CSV executable magic-byte sniffing, and formula injection escaping in CSV exports.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite 5, Tailwind CSS 3.4, Recharts, Lucide Icons, Socket.IO Client, TanStack Query, React Hook Form + Zod |
| **Backend API** | Node.js 22 LTS, Express 4.21, Mongoose 8, Socket.IO 4.8, Zod, Helmet, Pino, Bcrypt, JsonWebToken |
| **ML Microservice** | Python 3.11, FastAPI, Uvicorn, Scikit-Learn 1.6, Pydantic 2, Joblib, SlowAPI, managed with `uv` |
| **ML Training** | Python 3.11, Pandas, NumPy, Scikit-Learn, Matplotlib, Seaborn, Pip-Audit, managed with `uv` |
| **Database** | MongoDB Atlas M0 Shared Sandbox (512MB) with Compound Index Optimization (`IXSCAN`) |
| **Testing** | Vitest, Supertest, MongoMemoryServer, React Testing Library, Axe-Core, Pytest |
| **Cloud Hosting** | Vercel (Client SPA), Render (API Web Service), Hugging Face Spaces (Dockerized ML Microservice) |

---

## Monorepo Layout

```text
ai-cybershield/
├── client/                 # React 18 + Vite frontend SPA
│   ├── src/
│   │   ├── components/     # Accessible shared UI library (Button, Modal, Table, Badges)
│   │   ├── features/       # Feature modules: auth, dashboard, incidents, datasets, evaluation, admin
│   │   ├── services/       # Axios API client, Socket.IO manager
│   │   └── tests/          # Vitest + React Testing Library + axe-core tests
│   └── vercel.json         # SPA rewrites & Content Security Policy
├── server/                 # Node.js 22 + Express API server
│   ├── src/
│   │   ├── config/         # Zod environment validation, Mongoose connection
│   │   ├── controllers/    # Route controllers (auth, incidents, datasets, replay, eval)
│   │   ├── middlewares/    # Helmet, CORS, NoSQL sanitizer, RBAC, error handling
│   │   ├── models/         # Mongoose schemas: User, Incident, Dataset, AuditLog, Notification
│   │   ├── routes/         # REST routers (/api/auth, /api/detect, /api/incidents, /api/docs)
│   │   ├── scripts/        # ensureIndexes.js, seedAdmin.js, verifyPhase10Stack.js
│   │   ├── services/       # scoringService, baselineService, detectionService, replayService
│   │   └── sockets/        # Socket.IO connection manager & role rooms
│   └── tests/              # 14 Vitest integration test suites (110 tests)
├── ml-service/             # FastAPI ML inference microservice
│   ├── app/                # FastAPI application, Pydantic schemas, inference routes
│   ├── artifacts/          # Serialized Random Forest model & feature schema (78 KB)
│   ├── tests/              # Pytest test suite
│   ├── Dockerfile          # Hugging Face Spaces Docker container specification
│   └── pyproject.toml      # Python dependencies pinned via uv.lock
├── ml-training/            # Offline model training & dataset tooling
│   ├── sample/             # Demo dataset (demo_flows.csv)
│   ├── scripts/            # Dataset sampler and offline trainer
│   └── src/                # Modular training pipeline, feature cleaning, baseline heuristic
├── docs/                   # Comprehensive technical documentation & runbooks
├── scripts/                # smokeTest.ps1 post-deployment automation
├── render.yaml             # Render Blueprint Infrastructure-as-Code specification
└── .github/workflows/ci.yml # GitHub Actions Continuous Integration pipeline
```

---

## Local Development Setup

### System Prerequisites
- **Node.js:** `v22.x LTS` installed (check with `node -v`)
- **Python:** `3.11.x` installed (check with `python --version`)
- **uv:** Astral `uv` Python package manager installed:
  - *Windows (PowerShell)*: `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`
  - *macOS / Linux*: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- **MongoDB:** A running MongoDB instance (either a free MongoDB Atlas M0 cluster connection URI or local MongoDB on `mongodb://127.0.0.1:27017/threatlens`).

---

### Step-by-Step Execution (Three Terminals)

#### Terminal 1: Machine Learning Inference Microservice (`ml-service`)
```powershell
cd ml-service

# Create local environment file
Copy-Item .env.example .env    # Linux/macOS: cp .env.example .env

# Install exact locked dependencies and launch FastAPI on port 7860
uv sync --frozen
uv run uvicorn app.main:app --host 127.0.0.1 --port 7860 --reload
```
- **Health Verification:** Open `http://127.0.0.1:7860/health` (returns `{"status":"healthy","model_loaded":true,"version":"0.1.0"}`).

#### Terminal 2: Backend Express API Server (`server`)
```powershell
cd server
npm install

# Create local environment file
Copy-Item .env.example .env    # Linux/macOS: cp .env.example .env
```

> [!TIP]
> **Windows Port 5000 Conflict Notice:** On Windows systems, port `5000` is frequently reserved by system services (`winnat`/Hyper-V). We configure `PORT=5001` in `server/.env` and `VITE_API_URL=http://localhost:5001` in `client/.env`.

Update `server/.env` with your settings:
```env
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/threatlens?retryWrites=true&w=majority
JWT_SECRET=super_secure_development_jwt_secret_key_minimum_32_chars_2026!
ML_SERVICE_URL=http://127.0.0.1:7860
ML_API_KEY=cybershield_internal_secret_ml_key_2026
ADMIN_EMAIL=admin@cybershield.local
ADMIN_PASSWORD=AdminP@ssw0rdSecure!2026
```

Now provision the database and start the server:
```powershell
# 1. Build compound database indexes (Incident, User, AuditLog, Dataset)
npm run ensure-indexes

# 2. Seed initial administrator account
npm run seed-admin

# 3. Start development server with file watching
npm run dev
```
- **Health Verification:** Open `http://localhost:5001/api/health` (returns `{"status":"healthy","database":"connected"}`).
- **Interactive Swagger Docs:** Open `http://localhost:5001/api/docs`.

#### Terminal 3: Frontend Web Client (`client`)
```powershell
cd client
npm install

# Create local environment file
Copy-Item .env.example .env    # Linux/macOS: cp .env.example .env
```
Ensure `client/.env` points to the server port:
```env
VITE_API_URL=http://localhost:5001
VITE_APP_ENV=development
```

Start the Vite development server:
```powershell
npm run dev
```
- **Application URL:** Open your browser at **`http://localhost:5173`**.

---

### Step 4: First-Time Login & Data Population Runbook

Once all three services are running:

1. **Log in to the SOC Console:**
   - URL: `http://localhost:5173/login`
   - **Email:** `admin@cybershield.local`
   - **Password:** `AdminP@ssw0rdSecure!2026` (or the credentials set in `server/.env`)

2. **Ingest the Demonstration Dataset:**
   - Navigate to the **"Datasets & Replay"** tab (`/datasets`).
   - In the **Upload Network Traffic Dataset** card, drag and drop the bundled CIC-IDS2017 stratified sample:
     `ml-training/sample/demo_flows.csv`
   - Set a dataset name (e.g., `CIC-IDS2017 Demo Sample`) and click **"Upload & Ingest"**.
   - *The backend parses all 67 flow features, runs ML inference, evaluates heuristic rules, calculates 0–100 threat scores, and populates the database with real incident records.*

3. **Trigger Real-Time Traffic Replay:**
   - In the **Traffic Replay Session** card on the same page, select your uploaded dataset.
   - Adjust the speed slider (e.g. `25 flows/sec`) and click **"Start Traffic Replay"**.

4. **Verify Application Features:**
   - **Dashboard (`/dashboard`):** Watch live incident flows arrive in real time over Socket.IO, view attack distributions, and track high/critical threat counts.
   - **Incident Triage (`/incidents`):** Search, sort, filter by risk level, inspect explainability factor breakdowns, and record analytical investigation notes.
   - **Comparative Evaluation (`/evaluation`):** Benchmark Random Forest performance against the heuristic baseline (accuracy, macro $F_1$, and multi-class confusion matrix).
   - **Flow Detection Playground (`/detect`):** Test ad-hoc network flows using the 1-click presets (`DoS Hulk Flood`, `PortScan Sweep`, `FTP Brute Force`, `Normal HTTPS`).
   - **User Management (`/admin/users`):** Manage operator roles and verify self-demotion constraints.
   - **Audit Logs (`/admin/audit-logs`):** Inspect the immutable security audit trail.

---

## Environment Variables Matrix

| Subproject | Variable Name | Required | Default / Example Value | Purpose |
| :--- | :--- | :---: | :--- | :--- |
| **server** | `NODE_ENV` | Yes | `development` / `production` | Execution environment |
| **server** | `PORT` | Yes | `5001` (Render uses `10000`) | Server HTTP port (use `5001` on Windows) |
| **server** | `CLIENT_URL` | Yes | `http://localhost:5173` | Allowed CORS & WebSocket origin |
| **server** | `MONGO_URI` | Yes | `mongodb+srv://...` or `mongodb://127.0.0.1:27017/threatlens` | MongoDB database connection URI |
| **server** | `JWT_SECRET` | Yes | `[32+ character random secret string]` | HS256 secret for signing auth tokens |
| **server** | `JWT_EXPIRES_IN` | No | `1h` | Auth token validity duration |
| **server** | `ML_SERVICE_URL` | Yes | `http://127.0.0.1:7860` | URL of FastAPI inference service |
| **server** | `ML_API_KEY` | Yes | `[Shared Secret matching ML Service]` | Internal microservice authentication key |
| **server** | `ADMIN_EMAIL` | Yes | `admin@cybershield.local` | Initial admin account email for seeding |
| **server** | `ADMIN_PASSWORD` | Yes | `AdminP@ssw0rdSecure!2026` (min 12) | Initial admin account password for seeding |
| **client** | `VITE_API_URL` | Yes | `http://localhost:5001` | Backend REST & WebSocket base URL |
| **client** | `VITE_APP_ENV` | No | `development` / `production` | Frontend application mode |
| **ml-service** | `PORT` | No | `7860` | FastAPI microservice port |
| **ml-service** | `ML_API_KEY` | Yes | `[Shared Secret matching Server]` | Inbound authorization API key (`X-API-Key`) |

---

## Running Tests & Code Quality

The monorepo contains a comprehensive automated test suite with **187 passing tests**:

```powershell
# 1. Server Tests (14 test suites, 110 passed tests against in-memory MongoDB)
cd server
npm test
npm run lint

# 2. Client Tests (11 test suites, 77 passed tests + axe-core accessibility)
cd ../client
npm test
npm run lint
npm run build

# 3. ML Inference Microservice Tests (Pytest)
cd ../ml-service
uv run pytest
uv run ruff check .
```

---

## Post-Deployment Smoke Test

To verify a live staging or production deployment across Vercel, Render, and Hugging Face:

```powershell
.\scripts\smokeTest.ps1 `
  -ServerUrl "https://ai-cybershield-server.onrender.com" `
  -ClientUrl "https://ai-cybershield.vercel.app" `
  -MlServiceUrl "https://<user>-ai-cybershield-ml.hf.space" `
  -AdminEmail "admin@cybershield.org" `
  -AdminPassword "SuperSecureAdmin2026!"
```

---

## Ethics & Educational Safety Statement

> [!IMPORTANT]
> **Strict Educational Prototype Policy:**
> - AI CyberShield is developed strictly for educational demonstration and academic research at Dev Bhoomi Uttarakhand University.
> - The software contains **zero offensive capabilities**: it performs no live port scanning, executes no denial-of-service floods, launches no brute-force attacks, and does not conduct unauthorized network probing.
> - Telemetry analysis and traffic replay operate exclusively on **public benchmark datasets** (CIC-IDS2017) and synthetic sample records.
> - The system does not implement automated firewall blocking or packet dropping, avoiding operational disruption to host networks.

---

## Technical Limitations

1. **Bidirectional Flow Completion Dependency:** Flow-based features (NetFlow statistics) require an active network flow to terminate or hit an inactivity timeout before extraction. This makes flow-based machine learning ideal for telemetry triage and rapid incident forensics rather than inline, sub-microsecond packet filtering.
2. **Synthetic Dataset Conditions:** CIC-IDS2017 reflects laboratory conditions from 2017. Real-world enterprise environments feature higher class imbalance (>99.9% benign) and modern evasion patterns requiring continuous retraining.
3. **Free-Tier Cold Starts:** Deployed on Render and Hugging Face free tiers, backend services sleep after periods of inactivity. An in-app 4.0-second cold-start detector and 5-minute keep-alive pings mitigate this during live demonstrations.

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
