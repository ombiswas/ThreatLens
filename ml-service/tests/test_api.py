"""Integration and unit tests for FastAPI ML Microservice."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import settings
from app.main import app
from app.predictor import predictor

TEST_API_KEY = "test_secret_key_12345"


def ensure_test_artifacts():
    """Ensure artifacts exist for testing, creating lightweight fixtures if absent."""
    if settings.MODEL_PATH.exists() and settings.PREPROCESSOR_PATH.exists():
        return

    import json

    import joblib
    import numpy as np
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.preprocessing import StandardScaler

    settings.ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    classes = ["Benign", "BruteForce", "DoS/DDoS", "PortScan"]
    features = [
        "Destination Port", "Flow Duration", "Total Fwd Packets", "Total Backward Packets",
        "Total Length of Fwd Packets", "Total Length of Bwd Packets", "Fwd Packet Length Max",
        "Fwd Packet Length Min", "Fwd Packet Length Mean", "Fwd Packet Length Std",
        "Bwd Packet Length Max", "Bwd Packet Length Min", "Bwd Packet Length Mean",
        "Bwd Packet Length Std", "Flow Bytes/s", "Flow Packets/s", "Flow IAT Mean",
        "Flow IAT Std", "Flow IAT Max", "Flow IAT Min", "Fwd IAT Total", "Fwd IAT Mean",
        "Fwd IAT Std", "Fwd IAT Max", "Fwd IAT Min", "Bwd IAT Total", "Bwd IAT Mean",
        "Bwd IAT Std", "Bwd IAT Max", "Bwd IAT Min", "Fwd PSH Flags", "Bwd PSH Flags",
        "Fwd URG Flags", "Bwd URG Flags", "Fwd Header Length", "Bwd Header Length",
        "Fwd Packets/s", "Bwd Packets/s", "Min Packet Length", "Max Packet Length",
        "Packet Length Mean", "Packet Length Std", "Packet Length Variance", "FIN Flag Count",
        "SYN Flag Count", "RST Flag Count", "PSH Flag Count", "ACK Flag Count",
        "URG Flag Count", "CWE Flag Count", "ECE Flag Count", "Down/Up Ratio",
        "Average Packet Size", "Avg Fwd Segment Size", "Avg Bwd Segment Size",
        "Init_Win_bytes_forward", "Init_Win_bytes_backward", "act_data_pkt_fwd",
        "min_seg_size_forward", "Active Mean", "Active Std", "Active Max", "Active Min",
        "Idle Mean", "Idle Std", "Idle Max", "Idle Min"
    ]

    rng = np.random.default_rng(42)
    X = rng.uniform(0.0, 100.0, size=(20, len(features)))
    y = np.array([classes[i % 4] for i in range(20)])
    scaler = StandardScaler().fit(X)
    rf = RandomForestClassifier(n_estimators=5, random_state=42).fit(scaler.transform(X), y)

    prep_data = {
        "scaler": scaler,
        "label_encoder": None,
        "feature_names": features,
        "feature_dtypes": {f: "float64" for f in features},
        "feature_ranges": {f: {"min": 0.0, "max": 1000.0} for f in features},
        "classes": classes,
    }
    schema_data = {
        "classes": classes,
        "feature_count": len(features),
        "features": [
            {"name": f, "dtype": "float64", "range": {"min": 0.0, "max": 1000.0}}
            for f in features
        ],
    }
    metrics_data = {
        "metadata": {"classes": classes, "feature_count": len(features)},
        "models": {
            "RandomForest": {
                "accuracy": 0.98,
                "macro_f1": 0.98,
                "confusion_matrix": [[5, 0, 0, 0], [0, 5, 0, 0], [0, 0, 5, 0], [0, 0, 0, 5]],
            }
        },
    }

    joblib.dump(rf, settings.MODEL_PATH, compress=3)
    joblib.dump(prep_data, settings.PREPROCESSOR_PATH, compress=3)
    with open(settings.SCHEMA_PATH, "w", encoding="utf-8") as f:
        json.dump(schema_data, f, indent=2)
    with open(settings.METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics_data, f, indent=2)


@pytest.fixture(autouse=True)
def setup_test_env(monkeypatch: pytest.MonkeyPatch):
    """Set up test environment variables and load predictor artifacts."""
    monkeypatch.setattr(settings, "ML_API_KEY", TEST_API_KEY)
    monkeypatch.setattr(settings, "MAX_BATCH_SIZE", 5)  # low for testing
    ensure_test_artifacts()
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
