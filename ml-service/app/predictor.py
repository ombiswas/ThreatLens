"""ML predictor and model artifact runtime engine for AI CyberShield."""

import json
from typing import Any

import joblib
import numpy as np

from app.config import settings
from app.schemas import SinglePredictResponse


class Predictor:
    """Manages model loading, feature scaling, and multi-class probabilistic inferences."""

    def __init__(self) -> None:
        self.model: Any = None
        self.scaler: Any = None
        self.label_encoder: Any = None
        self.feature_ranges: dict[str, dict[str, float]] = {}
        self.schema: dict[str, Any] = {}
        self.metrics: dict[str, Any] = {}
        self.feature_names: list[str] = []
        self.classes: list[str] = []
        self.is_ready: bool = False

    def load_artifacts(self) -> None:
        """Load serialized model, preprocessor, and schema artifacts at startup."""
        if not settings.MODEL_PATH.exists():
            raise FileNotFoundError(f"Model artifact not found at {settings.MODEL_PATH}")
        if not settings.PREPROCESSOR_PATH.exists():
            raise FileNotFoundError(
                f"Preprocessor artifact not found at {settings.PREPROCESSOR_PATH}"
            )
        if not settings.SCHEMA_PATH.exists():
            raise FileNotFoundError(f"Schema definition not found at {settings.SCHEMA_PATH}")

        print(f"Loading ML artifacts from {settings.ARTIFACTS_DIR}...")
        self.model = joblib.load(settings.MODEL_PATH)
        prep_data = joblib.load(settings.PREPROCESSOR_PATH)

        if isinstance(prep_data, dict):
            self.scaler = prep_data["scaler"]
            self.label_encoder = prep_data.get("label_encoder")
            self.feature_names = prep_data["feature_names"]
            self.classes = prep_data["classes"]
            self.feature_ranges = prep_data.get("feature_ranges", {})
        else:
            self.scaler = prep_data.scaler
            self.label_encoder = getattr(prep_data, "label_encoder", None)
            self.feature_names = prep_data.feature_names
            self.classes = list(prep_data.classes)
            self.feature_ranges = getattr(prep_data, "feature_ranges", {})

        with open(settings.SCHEMA_PATH, "r", encoding="utf-8") as f:
            self.schema = json.load(f)

        if settings.METRICS_PATH.exists():
            with open(settings.METRICS_PATH, "r", encoding="utf-8") as f:
                self.metrics = json.load(f)

        self.is_ready = True
        print(f"Artifacts loaded. Features: {len(self.feature_names)}, Classes: {self.classes}")

    def _prepare_vector(self, flow: dict[str, float]) -> np.ndarray:
        """Align input dictionary keys to exact training feature order and scale."""
        vector = []
        for name in self.feature_names:
            if name not in flow:
                # Attempt case-insensitive or stripped lookup
                matched_val = None
                for k, v in flow.items():
                    if k.strip().lower() == name.strip().lower():
                        matched_val = float(v)
                        break
                if matched_val is None:
                    # Default median imputation if missing
                    default_range = self.feature_ranges.get(name, {})
                    matched_val = float(default_range.get("median", 0.0))
                vector.append(matched_val)
            else:
                vector.append(float(flow[name]))

        matrix = np.array([vector], dtype=np.float64)
        scaled_matrix = self.scaler.transform(matrix)
        return scaled_matrix

    def predict_single(self, flow: dict[str, float]) -> SinglePredictResponse:
        """Run single record prediction and return class, probabilities, and confidence."""
        if not self.is_ready:
            raise RuntimeError("Model has not been initialized.")

        scaled_vector = self._prepare_vector(flow)
        probabilities = self.model.predict_proba(scaled_vector)[0]
        pred_idx = int(np.argmax(probabilities))
        confidence = float(probabilities[pred_idx])
        predicted_class = self.classes[pred_idx]

        prob_dict = {
            self.classes[i]: float(round(probabilities[i], 4)) for i in range(len(self.classes))
        }

        return SinglePredictResponse(
            predicted_class=predicted_class,
            confidence=round(confidence, 4),
            probabilities=prob_dict,
        )

    def predict_batch(self, flows: list[dict[str, float]]) -> list[SinglePredictResponse]:
        """Run batch predictions efficiently."""
        if not self.is_ready:
            raise RuntimeError("Model has not been initialized.")

        if not flows:
            return []

        # Vectorize all rows simultaneously
        vectors = []
        for flow in flows:
            row = []
            for name in self.feature_names:
                if name in flow:
                    row.append(float(flow[name]))
                else:
                    default_range = self.feature_ranges.get(name, {})
                    row.append(float(default_range.get("median", 0.0)))
            vectors.append(row)

        matrix = np.array(vectors, dtype=np.float64)
        scaled_matrix = self.scaler.transform(matrix)
        all_probs = self.model.predict_proba(scaled_matrix)

        results = []
        for i, probs in enumerate(all_probs):
            pred_idx = int(np.argmax(probs))
            conf = float(probs[pred_idx])
            pred_class = self.classes[pred_idx]
            p_dict = {self.classes[j]: float(round(probs[j], 4)) for j in range(len(self.classes))}
            results.append(
                SinglePredictResponse(
                    predicted_class=pred_class,
                    confidence=round(conf, 4),
                    probabilities=p_dict,
                )
            )

        return results


predictor = Predictor()
