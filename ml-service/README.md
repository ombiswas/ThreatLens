---
title: AI CyberShield ML Microservice
emoji: 🛡️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# AI CyberShield ML Microservice

FastAPI machine learning microservice for **AI CyberShield**. Provides probabilistic multi-class network intrusion inferences.

## Endpoints
- `GET /health`: Public health check probe.
- `GET /model-info`: Active model metadata, architecture, and offline evaluation metrics (`X-API-Key` required).
- `POST /predict`: Classify single network flow record (`X-API-Key` required).
- `POST /predict/batch`: Classify bounded batch of network flow records (`X-API-Key` required).

## Local Development & Testing

```powershell
# 1. Sync dependencies with uv
uv sync

# 2. Run unit & integration test suite
uv run pytest -v

# 3. Run linting & security audit
uv run ruff check .
uv run pip-audit

# 4. Start local development server
uv run uvicorn app.main:app --host 0.0.0.0 --port 7860 --reload
```

## Hugging Face Spaces Deployment
This microservice is packaged as a Docker Space listening on port `7860`:
1. Push this folder to your Hugging Face Space repository.
2. In the Space Settings, configure the Secret: `ML_API_KEY`.
3. The Space will automatically build and deploy via `Dockerfile`.
