"""Data loading utilities for AI CyberShield ml-training."""

from pathlib import Path

import pandas as pd

from src.config import DEMO_DATA_PATH, SAMPLE_DATA_PATH


def get_dataset_path(override_path: Path | None = None) -> Path:
    """Determine best available dataset path: custom override, processed sample, or demo flows."""
    if override_path and override_path.exists():
        return override_path
    if SAMPLE_DATA_PATH.exists():
        return SAMPLE_DATA_PATH
    if DEMO_DATA_PATH.exists():
        return DEMO_DATA_PATH
    raise FileNotFoundError(
        f"No dataset found at {SAMPLE_DATA_PATH} or {DEMO_DATA_PATH}. "
        "Run `uv run python scripts/make_demo_sample.py` or `scripts/make_sample.py` first."
    )


def load_dataset(file_path: Path | None = None) -> tuple[pd.DataFrame, Path]:
    """Load dataset CSV, normalize headers, and return loaded DataFrame along with source path."""
    target_path = get_dataset_path(file_path)
    print(f"Loading dataset from: {target_path}")
    df = pd.read_csv(target_path, low_memory=False, encoding="utf-8", on_bad_lines="skip")
    # Clean whitespace around column names
    df.columns = [c.strip() for c in df.columns]
    print(f"Successfully loaded {len(df):,} records with {len(df.columns)} columns.")
    return df, target_path
