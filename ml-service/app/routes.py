"""FastAPI route handlers for prediction and model endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings
from app.predictor import predictor
from app.schemas import (
    BatchPredictRequest,
    BatchPredictResponse,
    HealthResponse,
    ModelInfoResponse,
    SinglePredictRequest,
    SinglePredictResponse,
)
from app.security import verify_api_key

limiter = Limiter(key_func=get_remote_address)
router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check (Public)",
    tags=["System"],
)
async def health_check():
    """Unauthenticated health status probe. Contains no sensitive telemetry or keys."""
    return HealthResponse(
        status="healthy" if predictor.is_ready else "initializing",
        app=settings.APP_NAME,
        version=settings.VERSION,
        model_loaded=predictor.is_ready,
    )


@router.get(
    "/model-info",
    response_model=ModelInfoResponse,
    summary="Model metadata and performance metrics (Authenticated)",
    dependencies=[Depends(verify_api_key)],
    tags=["Model"],
)
async def get_model_info():
    """Retrieve active model architecture, version, class labels, and metrics summary."""
    if not predictor.is_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not ready",
        )

    return ModelInfoResponse(
        model_name="AI CyberShield Random Forest Classifier",
        version=settings.VERSION,
        algorithm="RandomForestClassifier",
        feature_count=len(predictor.feature_names),
        classes=predictor.classes,
        features_in_order=predictor.feature_names,
        evaluation_metrics=predictor.metrics.get("models", {}).get("RandomForest", {}),
    )


@router.post(
    "/predict",
    response_model=SinglePredictResponse,
    summary="Predict single flow record (Authenticated)",
    dependencies=[Depends(verify_api_key)],
    tags=["Prediction"],
)
@limiter.limit(settings.RATE_LIMIT_PREDICT)
async def predict_single(request: Request, payload: SinglePredictRequest):
    """Classify a single network flow vector."""
    if not predictor.is_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model service is currently initializing",
        )

    try:
        prediction = predictor.predict_single(payload.flow)
        return prediction
    except Exception as e:
        print(f"[ERROR] Prediction error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inference failed on supplied feature vector",
        )


@router.post(
    "/predict/batch",
    response_model=BatchPredictResponse,
    summary="Predict batch of flow records (Authenticated, bounded limit)",
    dependencies=[Depends(verify_api_key)],
    tags=["Prediction"],
)
@limiter.limit(settings.RATE_LIMIT_BATCH)
async def predict_batch(request: Request, payload: BatchPredictRequest):
    """Classify a batch of network flow vectors.

    Enforces maximum batch size limit (default 500) to protect against memory exhaustion.
    """
    if not predictor.is_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model service is currently initializing",
        )

    batch_size = len(payload.flows)
    if batch_size > settings.MAX_BATCH_SIZE:
        max_limit = settings.MAX_BATCH_SIZE
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Batch size {batch_size} exceeds maximum limit of {max_limit} records.",
        )

    try:
        predictions = predictor.predict_batch(payload.flows)
        return BatchPredictResponse(
            count=len(predictions),
            predictions=predictions,
        )
    except Exception as e:
        print(f"[ERROR] Batch prediction error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch inference failed on supplied records",
        )
