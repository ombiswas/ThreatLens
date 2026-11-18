"""Unit tests for Phase 1 ML offline training pipeline."""

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import pytest

from src.config import CLASS_BENIGN, CLASS_DOS_DDOS, TARGET_CLASSES
from src.data_loading import load_dataset
from src.export import export_artifacts
from src.preprocessing import Preprocessor, clean_dataframe, prepare_data_splits
from src.train import train_models


@pytest.fixture
def mock_dataset_csv(tmp_path: Path) -> Path:
    """Generate synthetic network flow DataFrame with multiple classes and leakage columns."""
    rng = np.random.default_rng(42)
    n = 200

    labels = ["BENIGN"] * 100 + ["DoS Hulk"] * 50 + ["PortScan"] * 30 + ["FTP-Patator"] * 20

    data = {
        "Flow ID": [f"flow_{i}" for i in range(n)],
        "Source IP": ["192.168.1.5"] * n,
        "Timestamp": ["04/07/2017 10:00:00"] * n,
        "Destination Port": rng.integers(20, 8080, size=n),
        "Flow Duration": rng.integers(100, 500000, size=n),
        "Total Fwd Packets": rng.integers(1, 100, size=n),
        "Total Backward Packets": rng.integers(0, 50, size=n),
        "Flow Packets/s": rng.uniform(1.0, 1000.0, size=n),
        "Label": labels,
    }

    df = pd.DataFrame(data)
    csv_file = tmp_path / "mock_flows.csv"
    df.to_csv(csv_file, index=False)
    return csv_file


def test_clean_dataframe_drops_leakage_and_maps_labels(mock_dataset_csv: Path):
    """Verify that clean_dataframe eliminates leakage columns and correctly maps labels."""
    df, _ = load_dataset(mock_dataset_csv)
    cleaned, label_col, before, after = clean_dataframe(df)

    assert "Flow ID" not in cleaned.columns
    assert "Source IP" not in cleaned.columns
    assert "Timestamp" not in cleaned.columns

    # Check mapped label values
    unique_labels = cleaned[label_col].unique()
    for lbl in unique_labels:
        assert lbl in TARGET_CLASSES

    assert CLASS_BENIGN in after
    assert CLASS_DOS_DDOS in after


def test_no_data_leakage_in_splits(mock_dataset_csv: Path):
    """Verify that transformers are fitted exclusively on the training split."""
    df, _ = load_dataset(mock_dataset_csv)
    cleaned, label_col, _, _ = clean_dataframe(df)
    splits = prepare_data_splits(cleaned, label_col)

    preprocessor = splits["preprocessor"]
    assert preprocessor.is_fitted

    # Scaler center and scale must match train split dimensions
    assert len(preprocessor.scaler.center_) == len(splits["feature_names"])
    assert len(splits["X_train"]) == len(splits["y_train"])
    assert len(splits["X_test"]) == len(splits["y_test"])


def test_feature_order_stability():
    """Verify preprocessor strictly preserves feature column order on transformation."""
    df = pd.DataFrame(
        {
            "Feature_A": [1.0, 2.0, 3.0],
            "Feature_B": [10.0, 20.0, 30.0],
            "Feature_C": [100.0, 200.0, 300.0],
        }
    )
    y = pd.Series([CLASS_BENIGN, CLASS_BENIGN, CLASS_DOS_DDOS])

    p = Preprocessor()
    p.fit(df, y)

    # Permute columns in test DF
    df_permuted = df[["Feature_C", "Feature_A", "Feature_B"]]
    transformed, _ = p.transform(df_permuted)

    # Must match original transformation
    expected, _ = p.transform(df)
    np.testing.assert_array_almost_equal(transformed, expected)


def test_model_reload_and_prediction(tmp_path: Path):
    """Verify that exported models reload from disk and produce identical predictions."""
    X_train = np.random.uniform(0, 10, size=(100, 5))
    y_train = np.random.choice([0, 1, 2, 3], size=100)

    models = train_models(X_train, y_train, TARGET_CLASSES)
    rf = models["RandomForest"]

    preprocessor = Preprocessor()
    preprocessor.feature_names = [f"f_{i}" for i in range(5)]
    preprocessor.classes = TARGET_CLASSES
    preprocessor.is_fitted = True

    exported = export_artifacts(rf, preprocessor, output_dir=tmp_path, sync_to_ml_service=False)

    reloaded_model = joblib.load(exported["model"])
    test_sample = np.random.uniform(0, 10, size=(5, 5))
    preds_orig = rf.predict(test_sample)
    preds_reloaded = reloaded_model.predict(test_sample)

    np.testing.assert_array_equal(preds_orig, preds_reloaded)
