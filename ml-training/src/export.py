"""Export trained models and preprocessors to ml-training/artifacts and ml-service/artifacts."""

import json
from pathlib import Path
from typing import Any
import joblib

from src.config import ARTIFACTS_DIR


def export_artifacts(
    model: Any,
    preprocessor: Any,
    output_dir: Path | None = None,
    sync_to_ml_service: bool = True,
) -> dict[str, Path]:
    """Serialize model.joblib, preprocessor.joblib (standard scikit-learn dict), and feature_schema.json."""
    target_dir = output_dir or ARTIFACTS_DIR
    target_dir.mkdir(parents=True, exist_ok=True)

    model_path = target_dir / "model.joblib"
    preprocessor_path = target_dir / "preprocessor.joblib"
    schema_path = target_dir / "feature_schema.json"

    print(f"Exporting model artifacts to: {target_dir}")

    # Save portable standard dictionary for preprocessor (no custom class pickle dependencies)
    preprocessor_dict = {
        "scaler": preprocessor.scaler,
        "label_encoder": preprocessor.label_encoder,
        "feature_names": preprocessor.feature_names,
        "feature_dtypes": preprocessor.feature_dtypes,
        "feature_ranges": preprocessor.feature_ranges,
        "classes": preprocessor.classes,
    }

    # Serialize with compression (level 3 balances size & decompression speed)
    joblib.dump(model, model_path, compress=3)
    joblib.dump(preprocessor_dict, preprocessor_path, compress=3)

    # Compile feature schema contract
    schema_data = {
        "classes": list(preprocessor.classes),
        "feature_count": len(preprocessor.feature_names),
        "features": [
            {
                "name": name,
                "dtype": preprocessor.feature_dtypes.get(name, "float64"),
                "range": preprocessor.feature_ranges.get(name, {"min": 0.0, "max": 0.0}),
            }
            for name in preprocessor.feature_names
        ],
    }

    with open(schema_path, "w", encoding="utf-8") as f:
        json.dump(schema_data, f, indent=2)

    model_size_mb = model_path.stat().st_size / (1024 * 1024)
    print(f"  Saved model.joblib ({model_size_mb:.2f} MB)")
    print(f"  Saved preprocessor.joblib ({preprocessor_path.stat().st_size / 1024:.2f} KB)")
    print(f"  Saved feature_schema.json ({len(preprocessor.feature_names)} features)")

    # Sync directly to ml-service/artifacts/
    if sync_to_ml_service:
        ml_service_artifacts_dir = target_dir.parent.parent / "ml-service" / "artifacts"
        if ml_service_artifacts_dir.exists():
            joblib.dump(model, ml_service_artifacts_dir / "model.joblib", compress=3)
            joblib.dump(preprocessor_dict, ml_service_artifacts_dir / "preprocessor.joblib", compress=3)
            with open(ml_service_artifacts_dir / "feature_schema.json", "w", encoding="utf-8") as f:
                json.dump(schema_data, f, indent=2)
            print("  Synced artifacts to ml-service/artifacts/ successfully.")

    return {
        "model": model_path,
        "preprocessor": preprocessor_path,
        "schema": schema_path,
    }
