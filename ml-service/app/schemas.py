"""Pydantic schemas and data validation models for ML Microservice."""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class FlowFeatures(BaseModel):
    """Network flow feature dictionary representing a single flow record.

    Extra fields are strictly forbidden to prevent payload tampering and injection.
    """

    model_config = ConfigDict(extra="forbid")

    # Features dynamically validated via dictionary mapping
    features: dict[str, float] = Field(
        ...,
        description="Key-value mapping of feature names to numeric flow measurements",
    )


class SinglePredictRequest(BaseModel):
    """Payload for single record prediction."""

    model_config = ConfigDict(extra="forbid")

    flow: dict[str, float] = Field(
        ...,
        description="Flow feature dictionary with matching keys from feature_schema.json",
    )


class SinglePredictResponse(BaseModel):
    """Response containing prediction, confidence, and class probability distribution."""

    predicted_class: str
    confidence: float
    probabilities: dict[str, float]


class BatchPredictRequest(BaseModel):
    """Payload for batch predictions (strictly bounded by MAX_BATCH_SIZE)."""

    model_config = ConfigDict(extra="forbid")

    flows: list[dict[str, float]] = Field(
        ...,
        description="List of flow feature dictionaries to predict in batch",
    )


class BatchPredictResponse(BaseModel):
    """Response containing batch prediction results and summary."""

    count: int
    predictions: list[SinglePredictResponse]


class ModelInfoResponse(BaseModel):
    """Metadata response describing the active model, schema, and offline metrics."""

    model_name: str
    version: str
    algorithm: str
    feature_count: int
    classes: list[str]
    features_in_order: list[str]
    evaluation_metrics: dict[str, Any]


class HealthResponse(BaseModel):
    """Unauthenticated health status response."""

    status: str
    app: str
    version: str
    model_loaded: bool
