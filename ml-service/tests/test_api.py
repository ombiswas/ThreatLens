"""Integration and unit tests for FastAPI ML Microservice."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import settings
from app.main import app
from app.predictor import predictor

TEST_API_KEY = "test_secret_key_12345"


@pytest.fixture(autouse=True)
def setup_test_env(monkeypatch: pytest.MonkeyPatch):
    """Set up test environment variables and load predictor artifacts."""
    monkeypatch.setattr(settings, "ML_API_KEY", TEST_API_KEY)
    monkeypatch.setattr(settings, "MAX_BATCH_SIZE", 5)  # low for testing
    if not predictor.is_ready:
        predictor.load_artifacts()


@pytest.fixture
def sample_flow() -> dict[str, float]:
    """Sample benign flow record matching schema."""
    return {
        "Destination Port": 443.0,
        "Flow Duration": 150000.0,
        "Total Fwd Packets": 10.0,
        "Total Backward Packets": 8.0,
        "Total Length of Fwd Packets": 1500.0,
        "Total Length of Bwd Packets": 4000.0,
        "Flow Packets/s": 120.0,
    }


@pytest.mark.anyio
async def test_health_endpoint_public():
    """Verify GET /health is publicly accessible without authentication."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["model_loaded"] is True
        assert "api_key" not in data


@pytest.mark.anyio
async def test_missing_api_key_rejected():
    """Verify protected endpoints reject requests lacking X-API-Key with 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/model-info")
        assert res.status_code == 401
        assert "Missing" in res.json()["detail"]


@pytest.mark.anyio
async def test_invalid_api_key_rejected():
    """Verify protected endpoints reject invalid X-API-Key with 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/model-info", headers={"X-API-Key": "wrong_key"})
        assert res.status_code == 401
        assert "Invalid" in res.json()["detail"]


@pytest.mark.anyio
async def test_model_info_authenticated():
    """Verify GET /model-info returns schema and metrics when authenticated."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/model-info", headers={"X-API-Key": TEST_API_KEY})
        assert res.status_code == 200
        data = res.json()
        assert data["algorithm"] == "RandomForestClassifier"
        assert "Benign" in data["classes"]
        assert len(data["features_in_order"]) > 0


@pytest.mark.anyio
async def test_predict_single_success(sample_flow: dict[str, float]):
    """Verify POST /predict returns valid class, confidence and probability distribution."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {"flow": sample_flow}
        res = await client.post(
            "/predict",
            json=payload,
            headers={"X-API-Key": TEST_API_KEY},
        )
        assert res.status_code == 200
        data = res.json()
        assert "predicted_class" in data
        assert data["predicted_class"] in predictor.classes
        assert 0.0 <= data["confidence"] <= 1.0
        assert sum(data["probabilities"].values()) == pytest.approx(1.0, rel=1e-2)


@pytest.mark.anyio
async def test_predict_single_rejects_extra_fields(sample_flow: dict[str, float]):
    """Verify extra unexpected fields in payload body are rejected with 422."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {"flow": sample_flow, "extra_unexpected_field": "exploit"}
        res = await client.post(
            "/predict",
            json=payload,
            headers={"X-API-Key": TEST_API_KEY},
        )
        assert res.status_code == 422


@pytest.mark.anyio
async def test_predict_batch_enforces_limit(sample_flow: dict[str, float]):
    """Verify POST /predict/batch rejects payloads exceeding MAX_BATCH_SIZE with 413."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # MAX_BATCH_SIZE is set to 5 in fixture
        large_batch = {"flows": [sample_flow] * 6}
        res = await client.post(
            "/predict/batch",
            json=large_batch,
            headers={"X-API-Key": TEST_API_KEY},
        )
        assert res.status_code == 413
        assert "exceeds maximum limit" in res.json()["detail"]


@pytest.mark.anyio
async def test_predict_batch_success(sample_flow: dict[str, float]):
    """Verify POST /predict/batch succeeds for allowed batch sizes."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        batch = {"flows": [sample_flow, sample_flow]}
        res = await client.post(
            "/predict/batch",
            json=batch,
            headers={"X-API-Key": TEST_API_KEY},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["count"] == 2
        assert len(data["predictions"]) == 2


@pytest.mark.anyio
async def test_unknown_route_returns_404():
    """Verify undefined routes return standard 404."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/nonexistent-endpoint")
        assert res.status_code == 404
