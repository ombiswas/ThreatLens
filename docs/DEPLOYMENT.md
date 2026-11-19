# AI CyberShield - Production Deployment Guide (Free Tier)

This document provides a comprehensive, step-by-step operational guide for deploying **AI CyberShield** across 100% free-tier cloud hosting platforms.

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │              Web Client                │
                      │  React 18 SPA + Vite + Tailwind CSS    │
                      │     Hosted on: Vercel (Edge CDN)       │
                      └──────────────────┬─────────────────────┘
                                         │ HTTPS / WSS
                                         ▼
                      ┌────────────────────────────────────────┐
                      │             Backend API                │
                      │  Node.js 22 LTS + Express + Socket.IO  │
                      │   Hosted on: Render Free Web Service   │
                      └─────────────┬─────────────────────┬────┘
                                    │                     │
                     HTTPS Internal │                     │ Mongoose TLS
                     (X-API-Key)    ▼                     ▼
        ┌───────────────────────────────────┐  ┌──────────────────────────────────┐
        │       ML Inference Service        │  │        MongoDB Database          │
        │   FastAPI + Python 3.11 + uv      │  │        MongoDB Atlas M0          │
        │ Hosted on: Hugging Face Spaces    │  │       Shared Sandbox (512MB)     │
        └───────────────────────────────────┘  └──────────────────────────────────┘
```

---

## 1. MongoDB Atlas M0 Setup

### 1.1 Account & Cluster Creation
1. Sign up or log in at [MongoDB Cloud](https://cloud.mongodb.com/).
2. Click **Create** to provision a new database deployment:
   - **Deployment Type:** Shared (Free Tier M0 Sandbox).
   - **Cloud Provider & Region:** AWS (Choose a region geographically close to your Render deployment, e.g., `us-east-1` N. Virginia or `us-west-2` Oregon).
   - **Cluster Name:** `cybershield-cluster`.
3. Click **Create Deployment**.

### 1.2 Least-Privilege Database User
1. Under the left navigation menu, navigate to **Security** -> **Database Access**.
2. Click **Add New Database User**:
   - **Authentication Method:** Password.
   - **Username:** `cybershield_app`.
   - **Password:** Generate a strong 32-character password (e.g., via PowerShell: `[Convert]::ToBase64String((1..24 | ForEach-Object { [byte](Get-Random -Minimum 0 -Maximum 256) }))`). Save this password securely.
   - **Database User Privileges:** Click **Built-in Role** -> Select **Specific Privileges** -> Grant `readWrite` strictly to the `cybershield` database (Do **NOT** grant `atlasAdmin` or cluster-wide roles).
3. Click **Add User**.

### 1.3 Network Access & Dynamic IP Mitigation
> [!IMPORTANT]
> Render's free tier uses dynamically allocated outbound IP addresses that change across builds and restarts. A static IP address cannot be assigned on the free tier.

1. Under the left navigation menu, navigate to **Security** -> **Network Access**.
2. Click **Add IP Address**:
   - Select **Allow Access from Anywhere** (`0.0.0.0/0`).
   - Description: `Render dynamic application access`.
   - Click **Confirm**.
3. **Defense-in-Depth Mitigations Enforced:**
   - **Mandatory TLS 1.2+:** Atlas enforces encrypted wire transport (`mongodb+srv://`).
   - **Strong High-Entropy Credentials:** The database user utilizes a 32+ character random password.
   - **Scoped Authorization:** The `cybershield_app` user only has privileges on the `cybershield` database.

### 1.4 Connection String Format
Navigate to **Database** -> **Connect** -> **Drivers** (Node.js). The connection URI format is:
```text
mongodb+srv://cybershield_app:<PASSWORD>@cybershield-cluster.xxxxxx.mongodb.net/cybershield?retryWrites=true&w=majority&appName=AICyberShield
```

### 1.5 Production Index Provisioning
In production (`NODE_ENV=production`), Mongoose `autoIndex` is disabled in `server/src/config/db.js` to prevent application boot stalls and write-lock spikes.

To provision compound database indexes on MongoDB Atlas before launching:
```powershell
cd server
$env:MONGO_URI = "mongodb+srv://cybershield_app:<PASSWORD>@cybershield-cluster.xxxxxx.mongodb.net/cybershield?retryWrites=true&w=majority&appName=AICyberShield"
npm run ensure-indexes
```
This builds all verified indexes:
- `Incident`: `{ status: 1, riskLevel: 1, detectedAt: -1 }`, `{ riskLevel: 1, detectedAt: -1 }`, `{ mlClass: 1, detectedAt: -1 }`, `{ datasetId: 1, detectedAt: -1 }`
- `AuditLog`: `{ action: 1, timestamp: -1 }`, `{ timestamp: 1 }` (TTL 90 days)
- `Notification`: `{ targetRoles: 1, createdAt: -1 }`, `{ targetUser: 1, createdAt: -1 }`
- `User`: `{ email: 1 }` (unique)

---

## 2. ML Service on Hugging Face Spaces (Docker)

The ML service is packaged as a lightweight Docker container utilizing the `uv` package manager and running under non-root UID 1000 per Hugging Face Spaces specifications.

### 2.1 Artifact Size Verification
The serialized model artifacts in `ml-service/artifacts/` total **~78 KB**:
- `model.joblib`: 55.3 KB (Random Forest ensemble)
- `feature_schema.json`: 11.9 KB (67 features)
- `metrics.json`: 8.1 KB (Evaluation scores)
- `preprocessor.joblib`: 2.8 KB (Scaler)

Because total artifacts are well under 50 MB, **Git LFS is not required**. Standard Git handles all files cleanly.

### 2.2 Create Space on Hugging Face
1. Log in to [Hugging Face](https://huggingface.co/).
2. Click your profile icon -> **New Space**:
   - **Space Name:** `ai-cybershield-ml`
   - **License:** MIT
   - **Space SDK:** Select **Docker** -> **Blank**
   - **Space Hardware:** CPU basic (2 vCPU, 16GB RAM) - **Free Tier**
   - **Visibility:** Public
3. Click **Create Space**.

### 2.3 Configure Space Secret
1. In your new Space, click **Settings** -> **Variables and secrets**.
2. Under **Secrets**, click **New secret**:
   - **Name:** `ML_API_KEY`
   - **Value:** Generate a high-entropy secret string (e.g., via PowerShell):
     ```powershell
     [Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Minimum 0 -Maximum 256) }))
     ```
   - Click **Save**.

### 2.4 Deploy Code to Space
You can deploy using Git subtree directly from your local repository:

```powershell
# Add Hugging Face Space as a remote
git remote add hf-ml https://huggingface.co/spaces/<YOUR_HF_USERNAME>/ai-cybershield-ml

# Push only the ml-service subdirectory to the Space main branch
git subtree push --prefix ml-service hf-ml main
```

*Alternative Deployment:*
If you prefer pushing via a standalone repository:
```powershell
# Clone the empty space
git clone https://huggingface.co/spaces/<YOUR_HF_USERNAME>/ai-cybershield-ml temp-space
# Copy ml-service contents into temp-space
Copy-Item -Path "ml-service\*" -Destination "temp-space" -Recurse -Force
cd temp-space
git add -A
git commit -m "Deploy AI CyberShield ML Inference Microservice"
git push origin main
cd ..
Remove-Item -Path "temp-space" -Recurse -Force
```

### 2.5 Verify Deployment
Once the build completes on Hugging Face, your endpoint URL will be:
`https://<YOUR_HF_USERNAME>-ai-cybershield-ml.hf.space`

Verify health check:
```powershell
Invoke-RestMethod -Uri "https://<YOUR_HF_USERNAME>-ai-cybershield-ml.hf.space/health" -Method Get
```
Expected output:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_version": "1.0.0",
  "classes": ["Benign", "BruteForce", "DoS/DDoS", "PortScan"]
}
```

---

## 3. Server on Render

The Express API server is deployed on Render's free tier, pinned to Node.js 22 LTS.

### 3.1 Option A: One-Click Blueprint Deployment (`render.yaml`)
The repository includes a ready-to-deploy [`render.yaml`](file:///d:/Projects/ThreatLens/render.yaml) specification:
1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repository `ai-cybershield`.
4. Render detects `render.yaml` and populates the service configuration.
5. Fill in the prompted secrets (see Section 3.3 below).

### 3.2 Option B: Manual Dashboard Setup
1. In Render Dashboard, click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the following parameters:
   - **Name:** `ai-cybershield-server`
   - **Region:** Oregon (US West) or Ohio (US East)
   - **Branch:** `main`
   - **Root Directory:** `server`
   - **Runtime:** `Node`
   - **Build Command:** `npm ci`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
   - **Health Check Path:** `/api/health`
   - **Auto-Deploy:** `Yes`

### 3.3 Environment Variables Configuration
In Render Dashboard -> **Environment**, configure each variable:

| Environment Variable | Source / Description | Example Value |
| :--- | :--- | :--- |
| `NODE_ENV` | Static environment setting | `production` |
| `NODE_VERSION` | Pinned Node.js 22 LTS | `22.13.1` |
| `PORT` | Assigned by Render free tier | `10000` |
| `CLIENT_URL` | Exact URL of the Vercel frontend | `https://ai-cybershield.vercel.app` |
| `MONGO_URI` | MongoDB Atlas M0 connection URI | `mongodb+srv://cybershield_app:...@cluster.mongodb.net/cybershield?retryWrites=true&w=majority` |
| `JWT_SECRET` | 32+ character random secret (generated below) | `dGhpcy1pcy1hLXNlY3VyZS1qd3Qtc2VjcmV0LWtleS0yMDI2` |
| `JWT_EXPIRES_IN` | Token validity duration | `1h` |
| `ML_SERVICE_URL` | Hugging Face Space endpoint | `https://<YOUR_HF_USERNAME>-ai-cybershield-ml.hf.space` |
| `ML_API_KEY` | Exact key shared with Hugging Face Space | `<Same key as entered in HF Space>` |
| `ADMIN_EMAIL` | Initial system administrator email | `admin@cybershield.org` |
| `ADMIN_PASSWORD` | Initial admin password (min 12 chars) | `SuperSecureAdmin2026!` |
| `LOG_LEVEL` | Pino logging level | `info` |

#### Generate Strong Secrets in PowerShell
```powershell
# Generate strong 32-byte Base64 JWT_SECRET
[Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Minimum 0 -Maximum 256) }))

# Generate strong 16-character Admin Password
-join ((65..90) + (97..122) + (48..57) + 33,35,36,37 | Get-Random -Count 16 | ForEach-Object { [char]$_ })
```

> [!NOTE]
> When `ADMIN_EMAIL` and `ADMIN_PASSWORD` are defined in production, the server automatically provisions the admin account idempotently upon first boot without requiring a terminal command.

---

## 4. Client on Vercel

The React frontend is deployed as a static single-page application (SPA) on Vercel's global edge network.

### 4.1 Create Project on Vercel
1. Log in to [Vercel](https://vercel.com/).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository `ai-cybershield`.
4. Configure Project Settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click Edit -> Select `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm ci`

### 4.2 Configure Client Environment Variables
Under **Environment Variables**, add:

| Variable | Value | Notes |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://ai-cybershield-server.onrender.com` | Base URL of your Render backend without trailing slash |
| `VITE_APP_ENV` | `production` | Enables production error handling |

### 4.3 Routing & Content Security Policy (`vercel.json`)
The client includes [`client/vercel.json`](file:///d:/Projects/ThreatLens/client/vercel.json) providing:
- SPA client-side routing fallback: Rewrites all paths `/(.*)` to `/index.html`.
- Security Headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
- Content Security Policy: Authorizes connections (`connect-src`) to `https://*.onrender.com`, `wss://*.onrender.com`, and `https://*.hf.space`.

---

## 5. Cross-Origin URL Wiring & Verification

Ensure all four endpoints reference each other consistently:

```
[Vercel Frontend]
  VITE_API_URL ───────► https://ai-cybershield-server.onrender.com

[Render Backend]
  CLIENT_URL   ───────► https://ai-cybershield.vercel.app
  ML_SERVICE_URL ─────► https://<username>-ai-cybershield-ml.hf.space
  ML_API_KEY   ───────► Matches Space Secret
```

### 5.1 Automated Post-Deploy Smoke Test
Run the automated verification script [`scripts/smokeTest.ps1`](file:///d:/Projects/ThreatLens/scripts/smokeTest.ps1) from PowerShell:

```powershell
.\scripts\smokeTest.ps1 `
  -ServerUrl "https://ai-cybershield-server.onrender.com" `
  -ClientUrl "https://ai-cybershield.vercel.app" `
  -MlServiceUrl "https://<YOUR_HF_USERNAME>-ai-cybershield-ml.hf.space" `
  -AdminEmail "admin@cybershield.org" `
  -AdminPassword "SuperSecureAdmin2026!"
```

The script will automatically check:
1. Server health (`/api/health`) and MongoDB connection state.
2. HTTP security headers (`nosniff`, frame denial, absence of `x-powered-by`).
3. ML microservice readiness (`/health`) and model loading.
4. Admin login (`/api/auth/login`) and JWT token generation.
5. End-to-end threat detection pipeline (`/api/detect/flow`) verifying ML classification and 0-100 scoring.
6. Client availability and CSP headers.

---

## 6. Cold-Start Handling & Uptime Monitoring

### 6.1 Understanding Free-Tier Sleep Behavior
- **Render Web Services (Free Tier):** Automatically spins down after **15 minutes** of inactivity. The next incoming request takes **30 to 50 seconds** to wake up the service.
- **Hugging Face Spaces (Free CPU Tier):** Sleeps after **48 hours** of inactivity. Takes ~15–20 seconds to restart.

### 6.2 Frontend Cold-Start Notification
In `client/src/services/api.js`, an active cold-start detector monitors all API requests. If any request exceeds **4.0 seconds**, an alert banner automatically displays at the top of the interface:
> *"Backend service is spinning up (free tier cold-start). Please allow 30–40 seconds for initialization..."*

This prevents operators or evaluators from suspecting application failure.

### 6.3 Setup Keep-Alive with UptimeRobot
To prevent Render and Hugging Face instances from sleeping during active evaluation windows:
1. Sign up for a free account at [UptimeRobot](https://uptimerobot.com/) (up to 50 monitors free).
2. Click **Add New Monitor**:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `AI CyberShield Backend API`
   - **URL (or IP):** `https://ai-cybershield-server.onrender.com/api/health`
   - **Monitoring Interval:** `5 minutes`
   - Click **Create Monitor**.
3. Click **Add New Monitor**:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `AI CyberShield ML Microservice`
   - **URL (or IP):** `https://<YOUR_HF_USERNAME>-ai-cybershield-ml.hf.space/health`
   - **Monitoring Interval:** `5 minutes`
   - Click **Create Monitor**.

> [!NOTE]
> Render free tier grants 750 free instance hours per calendar month, which covers one continuously awake web service. If you deploy multiple services, ensure total pooled hours stay within limits.

---

## 7. Continuous Integration & Deployment (CI/CD)

The repository includes a GitHub Actions workflow in [`.github/workflows/ci.yml`](file:///d:/Projects/ThreatLens/.github/workflows/ci.yml) that automatically runs on every push and pull request to `main`:

1. **Backend Server Job:** Installs dependencies (`npm ci`), runs ESLint, executes all 110 Vitest integration tests against in-memory MongoDB.
2. **Frontend Client Job:** Installs dependencies, runs ESLint, executes all 71 client and accessibility tests, and verifies production Vite build.
3. **ML Microservice Job:** Sets up Python 3.11 with `uv`, runs `ruff check`, and executes pytest test suite.
4. **ML Training Pipeline Job:** Verifies offline data tooling and training routines.

### Continuous Deployment Integrations
- **Render:** Auto-deploys from `main` branch when GitHub Actions CI passes.
- **Vercel:** Auto-deploys frontend from `main` branch immediately.

---

## 8. Rollback Procedures

### 8.1 Vercel Frontend Rollback
1. Go to [Vercel Dashboard](https://vercel.com/) -> Select `ai-cybershield`.
2. Click the **Deployments** tab.
3. Locate the last known good deployment.
4. Click the three dots (`...`) -> Select **Instant Rollback**.
5. Traffic shifts to the chosen deployment instantly without rebuilding.

### 8.2 Render Backend Rollback
1. Go to [Render Dashboard](https://dashboard.render.com/) -> Select `ai-cybershield-server`.
2. Click **Events** tab.
3. Locate the previous successful deploy.
4. Click **Roll back to this deploy**.

### 8.3 Hugging Face ML Space Rollback
```powershell
cd ml-service
# View recent commit history on Hugging Face
git log --oneline -n 5 hf-ml/main

# Revert to target commit hash and push
git push -f hf-ml <PREVIOUS_COMMIT_HASH>:main
```

---

## 9. Pre-Demo / Presentation Checklist (The 10-Minute Drill)

Complete these checks 10 minutes prior to project presentations, viva examinations, or evaluation sessions:

- [ ] **T-10 Min (Warm Services):**
  - Open `https://ai-cybershield-server.onrender.com/api/health` in browser; verify `{"database":"connected"}`.
  - Open `https://<YOUR_HF_USERNAME>-ai-cybershield-ml.hf.space/health`; verify `{"model_loaded":true}`.
  - Open `https://ai-cybershield.vercel.app`; confirm login page renders.
- [ ] **T-8 Min (Smoke Test):**
  - Execute `.\scripts\smokeTest.ps1 -ServerUrl ... -ClientUrl ... -AdminPassword ...`
  - Confirm all checks pass.
- [ ] **T-5 Min (Data Preload):**
  - Log in to the application as Administrator.
  - Navigate to **Datasets** -> Upload `ml-training/sample/demo_flows.csv` (500 flows).
  - Verify incidents generate cleanly in the catalog.
- [ ] **T-3 Min (Telemetry Dry Run):**
  - Start traffic replay at 25 flows/sec for 10 seconds.
  - Confirm live alerts appear on the SOC **Live Feed Panel** and KPI counters increment.
  - Stop replay.
- [ ] **T-1 Min (Evaluation View):**
  - Navigate to **Comparative Evaluation** -> Confirm Random Forest vs Heuristic Baseline metrics and Confusion Matrix heatmap are visible and ready to present.
