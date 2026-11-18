# NEXT STEPS

## Current Goal: Phase 2 - ML FastAPI Microservice in `ml-service/`

Phases 0, 0.5, and 1 are verified and completed. The trained champion model (`threat_classifier.joblib`), scaler (`scaler.joblib`), label encoder (`label_encoder.joblib`), and feature contract (`feature_schema.json`) are exported and synced to `ml-service/models/`.

### Phase 2 Checklist
- [ ] Implement `ml-service/app/main.py`:
  - FastAPI application with lifespan context loading model artifacts at startup.
  - Constant-time `X-API-Key` authentication header verification middleware/dependency (`secrets.compare_digest`).
  - Health check endpoint `GET /health` reporting service status, version, and model metadata.
- [ ] Implement Pydantic schema validation `ml-service/app/schemas.py`:
  - `FlowFeatures` schema strictly validating flow attributes and rejecting missing/invalid values.
  - Single prediction request & response models (`POST /predict`).
  - Batch prediction request & response models (`POST /predict/batch`) enforcing strict upper bound on batch size (e.g. max 500 records).
- [ ] Implement inference engine `ml-service/app/inference.py`:
  - Align incoming dictionary features with `feature_schema.json` ordered list.
  - Scale features with pre-fitted `RobustScaler`.
  - Execute predict and `predict_proba` with `RandomForestClassifier`.
  - Format response: predicted class, confidence score, probability distribution per class.
- [ ] Implement unit & integration test suite `ml-service/tests/test_api.py`:
  - Test `/health` returns 200 and model details.
  - Test `/predict` returns accurate class and valid probabilities.
  - Test `/predict/batch` respects batch size limits.
  - Test unauthorized requests without valid `X-API-Key` return 401 Unauthorized.
  - Test schema rejection on malformed payloads with 422 Unprocessable Entity.
- [ ] Add Dockerfile in `ml-service/` configured for Hugging Face Spaces Docker free-tier deployment.
- [ ] Verify with `uv run ruff check .` and `uv run pytest`.

### Open Questions
- None. Artifacts and schemas are in place.

### Known Issues
- None tracked.
