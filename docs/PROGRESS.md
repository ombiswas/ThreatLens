# PROGRESS

## Phase Status Summary

| Phase | Description | Status | Target Completion | Notes |
|---|---|---|---|---|
| **Phase 0** | Repository foundation and tracking docs | Done | 2026-11-18 | Monorepo scaffold, configs, documentation, CI/Dependabot, verified lint/build/dev-server |
| **Phase 0.5** | Dataset tooling & exploration | Done | 2026-11-18 | CIC-IDS2017 tooling: verify, inspect, stratified sampling, demo sample, pytest suite |
| **Phase 1** | ML offline training & evaluation | Not started | TBD | Data preprocessing, feature selection, model training, metrics |
| **Phase 2** | ML FastAPI microservice | Not started | TBD | FastAPI inference service, schema validation, API-key auth |
| **Phase 3** | Server foundation & core infra | Not started | TBD | Express, Mongoose, Zod, error handling, logging, rate limiting |
| **Phase 4** | Authentication & RBAC | Not started | TBD | JWT auth, bcrypt passwords, role middleware (Viewer/Analyst/Admin) |
| **Phase 5** | Threat detection & scoring core | Not started | TBD | Express scoringService (0-100 score), baselineService, ML client |
| **Phase 6** | Incidents & datasets management | Not started | TBD | Incident persistence, CSV upload & validation, safe CSV export |
| **Phase 7** | Realtime telemetry & evaluation stats | Not started | TBD | Socket.IO events, ML vs baseline comparative metrics |
| **Phase 8** | Client foundation & UI shell | Not started | TBD | Layout, auth state, protected routing, dark SOC theme |
| **Phase 9** | SOC dashboard & incident triage UI | Not started | TBD | Live stream feeds, threat score charts, incident table & detail modal |
| **Phase 10** | Datasets, baseline comparison & admin UI | Not started | TBD | CSV upload manager, ML vs baseline comparison visualizer, users list |
| **Phase 11** | Testing & security hardening | Not started | TBD | End-to-end integration tests, security checklist audit, dependency audit |
| **Phase 12** | Production packaging & deployment | Not started | TBD | Dockerfile, Render/Vercel/HuggingFace configurations |
| **Phase 13** | Final documentation & viva defense prep | Not started | TBD | Comprehensive project report, presentation guide, viva demo script |

---

## Session Log

### Session 1 - 2026-11-18
- **Goal:** Phase 0 initialization - repository skeleton, tracking documents, environments, subproject configs.
- **Files Added/Changed:**
  - Root: `.gitignore`, `.editorconfig`, `README.md`, `LICENSE`, `SECURITY.md`, `.github/workflows/ci.yml`, `.github/dependabot.yml`
  - Docs: `docs/PROGRESS.md`, `docs/NEXT_STEPS.md`, `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/API.md`, `docs/PHASES.md`
  - Server: `server/package.json`, `server/eslint.config.js`, `server/.prettierrc`, `server/.env.example`, layered folder structure
  - Client: `client/package.json`, `client/vite.config.js`, `client/tailwind.config.js`, `client/postcss.config.js`, `client/eslint.config.js`, `client/.prettierrc`, `client/.env.example`, `client/index.html`, `client/src/*`, feature-based folder structure
  - ML Service: `ml-service/pyproject.toml`, `ml-service/.python-version`, `ml-service/uv.lock`, `ml-service/.env.example`, folder layout
  - ML Training: `ml-training/pyproject.toml`, `ml-training/.python-version`, `ml-training/uv.lock`, folder layout
- **Decisions Recorded:** ADR-001 through ADR-005.
- **Tests & Verification:** Server and client lint and builds passed cleanly.

### Session 2 - 2026-11-18
- **Goal:** Phase 0.5 Dataset Acquisition & Sampling Tooling in `ml-training/`.
- **Files Added/Changed:**
  - `docs/DATASET_NOTES.md`: Provenance, academic citation, UNB/Kaggle official sources, licensing, and expected CSV inventory for CIC-IDS2017.
  - `docs/DATASET_SCHEMA.md`: Initial profile and column schema generated via inspection tool.
  - `ml-training/scripts/verify_dataset.py`: Memory-efficient file existence, line count, and SHA-256 checksum calculator.
  - `ml-training/scripts/inspect_dataset.py`: Chunked profiler for missing/inf values, class counts, and leakage candidate detector.
  - `ml-training/scripts/make_sample.py`: Stratified deterministic sampler capping majority classes while fully preserving rare classes.
  - `ml-training/scripts/make_demo_sample.py`: Compact demo flow generator (< 1MB) matching CIC-IDS2017 schema.
  - `ml-training/sample/demo_flows.csv`: Generated 500-row demo file (~193 KB).
  - `ml-training/tests/test_dataset_tooling.py`: Automated pytest suite verifying sampling determinism, minority preservation, leakage detection, and checksums.
  - `ml-training/README.md`: Step-by-step PowerShell commands for dataset operations.
  - `.gitignore`: Updated to ignore `data/raw` and `data/processed` while allowing the small demo sample.
- **Tests & Verification:**
  - `uv run pytest` in `ml-training`: 6 passed in 1.09s.
  - `uv run ruff check .` in `ml-training`: All checks passed with 0 errors.
  - `uv run ruff format --check .` in `ml-training`: 7 files cleanly formatted.
- **Known Issues:** Full raw CIC-IDS2017 files (~8GB) are not stored locally in `data/raw/`; scripts were verified via synthetic fixtures and demo flows.
