# PROGRESS

## Phase Status Summary

| Phase | Description | Status | Target Completion | Notes |
|---|---|---|---|---|
| **Phase 0** | Repository foundation and tracking docs | Done | 2026-11-18 | Monorepo scaffold, configs, documentation, CI/Dependabot, verified lint/build/dev-server |
| **Phase 0.5** | Dataset tooling & exploration | Done | 2026-11-18 | CIC-IDS2017 tooling: verify, inspect, stratified sampling, demo sample, pytest suite |
| **Phase 1** | ML offline training & evaluation | Done | 2026-11-18 | Modular training pipeline, baseline heuristic, model evaluation, artifact export (<50MB) |
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
- **Files Added/Changed:** Monorepo scaffolding across client, server, and ML projects.

### Session 2 - 2026-11-18
- **Goal:** Phase 0.5 Dataset Acquisition & Sampling Tooling in `ml-training/`.
- **Files Added/Changed:** Verification, inspection, stratified sampling, and demo flow tooling.

### Session 3 - 2026-11-18
- **Goal:** Phase 1 Offline ML Training Pipeline in `ml-training/`.
- **Files Added/Changed:**
  - `ml-training/src/config.py`: Centralized configuration, paths, target classes (`Benign`, `DoS/DDoS`, `PortScan`, `BruteForce`), random seed (42), split ratios.
  - `ml-training/src/data_loading.py`: Memory-safe CSV ingestion and dynamic dataset path resolver.
  - `ml-training/src/preprocessing.py`: Feature sanitization, leakage elimination (`Flow ID`, `Source IP`, `Timestamp`), robust scaling and label encoding fitted strictly on the train split.
  - `ml-training/src/baseline.py`: Transparent rule-based heuristic classifier implementing threshold logic.
  - `ml-training/src/train.py`: Training of Logistic Regression, Decision Tree, and compact Random Forest (verified at 0.05 MB serialized, well under the 50 MB budget).
  - `ml-training/src/evaluate.py`: Multi-metric evaluation (accuracy, macro F1, confusion matrices, precision, recall) and plot generation.
  - `ml-training/src/export.py`: Serialization of `model.joblib`, `preprocessor.joblib`, and `feature_schema.json` to `ml-training/artifacts/` and syncing to `ml-service/models/`.
  - `ml-training/src/pipeline.py`: Top-level CLI pipeline runner.
  - `ml-training/notebooks/01_eda.ipynb` & `02_train_eval.ipynb`: Interactive analysis notebooks.
  - `ml-training/tests/test_ml_pipeline.py`: Pytest suite covering zero leakage across splits, feature order preservation, label mapping, and model re-prediction parity.
  - `docs/BASELINE_RULES.md`: Specification of baseline decision logic for replication in the Express server.
  - `docs/ML_REPORT.md`: Evaluation report with actual quantitative metrics, baseline comparison, and model limitations.
- **Tests & Verification:**
  - `uv run pytest` across `ml-training`: 10 passed in 3.44s.
  - `uv run ruff check .` across `ml-training`: 0 errors.
  - Serialized Random Forest model size: **0.05 MB**.
  - Held-out test performance: Random Forest Macro-F1: **0.9802**, Accuracy: **0.9800**; Baseline Macro-F1: **0.4695**, Accuracy: **0.6200**.
