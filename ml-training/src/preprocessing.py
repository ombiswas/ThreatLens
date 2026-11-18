"""Data preprocessing, feature selection, leakage prevention, and transformation."""

from typing import Any

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, RobustScaler

from src.config import (
    DROP_COLUMNS,
    LABEL_MAPPING,
    RANDOM_SEED,
    TARGET_CLASSES,
    TEST_RATIO,
)


def find_label_column(df: pd.DataFrame) -> str:
    """Identify the ground-truth label column in DataFrame."""
    for col in df.columns:
        if col.strip().lower() in ["label", "class", "attack"]:
            return col
    raise ValueError(f"Label column not found in DataFrame columns: {list(df.columns)}")


def clean_dataframe(
    df: pd.DataFrame,
) -> tuple[pd.DataFrame, str, dict[str, int], dict[str, int]]:
    """Clean column names, handle NaN/inf, drop duplicates, and map labels."""
    df = df.copy()
    # Strip whitespace from column names
    df.columns = [c.strip() for c in df.columns]

    label_col = find_label_column(df)

    # Record initial counts
    initial_labels = df[label_col].astype(str).str.strip().str.lower()
    counts_before = initial_labels.value_counts().to_dict()

    # Filter/map labels to target classes
    df["mapped_label"] = initial_labels.map(LABEL_MAPPING)
    unmapped_count = int(df["mapped_label"].isna().sum())
    if unmapped_count > 0:
        print(f"Dropping {unmapped_count} rows with unrecognized or out-of-scope attack classes.")
        df = df.dropna(subset=["mapped_label"])

    df[label_col] = df["mapped_label"]
    df = df.drop(columns=["mapped_label"])

    # Drop explicit leakage columns
    cols_to_drop = [
        c
        for c in df.columns
        if c.lower() in DROP_COLUMNS or any(d in c.lower() for d in DROP_COLUMNS)
    ]
    if cols_to_drop:
        print(f"Dropping {len(cols_to_drop)} leakage candidate columns: {cols_to_drop}")
        df = df.drop(columns=cols_to_drop)

    # Drop duplicate records
    dup_count = int(df.duplicated().sum())
    if dup_count > 0:
        print(f"Dropping {dup_count:,} duplicate records.")
        df = df.drop_duplicates().reset_index(drop=True)

    # Sanitize infinities and NaNs in feature columns
    feature_cols = [c for c in df.columns if c != label_col]
    for col in feature_cols:
        if pd.api.types.is_numeric_dtype(df[col]):
            # Replace infinities with NaN
            df[col] = df[col].replace([np.inf, -np.inf], np.nan)
            # Impute NaN with column median
            col_median = df[col].median()
            df[col] = df[col].fillna(col_median if pd.notna(col_median) else 0.0)

    counts_after = df[label_col].value_counts().to_dict()

    return df, label_col, counts_before, counts_after


class Preprocessor:
    """Encapsulates fitted scaler, label encoder, and ordered feature list."""

    def __init__(self) -> None:
        self.scaler = RobustScaler()
        self.label_encoder = LabelEncoder()
        self.feature_names: list[str] = []
        self.feature_dtypes: dict[str, str] = {}
        self.feature_ranges: dict[str, dict[str, float]] = {}
        self.classes: list[str] = []
        self.is_fitted = False

    def fit(self, X: pd.DataFrame, y: pd.Series) -> "Preprocessor":
        """Fit scaler and label encoder on TRAINING data only."""
        self.feature_names = list(X.columns)
        for col in self.feature_names:
            self.feature_dtypes[col] = str(X[col].dtype)
            self.feature_ranges[col] = {
                "min": float(X[col].min()),
                "max": float(X[col].max()),
                "median": float(X[col].median()),
            }

        self.scaler.fit(X.values)
        # Ensure target classes are known to label encoder
        self.label_encoder.fit(TARGET_CLASSES)
        self.classes = list(self.label_encoder.classes_)
        self.is_fitted = True
        return self

    def transform(
        self, X: pd.DataFrame, y: pd.Series | None = None
    ) -> tuple[np.ndarray, np.ndarray | None]:
        """Transform features and target using fitted transformers."""
        if not self.is_fitted:
            raise ValueError("Preprocessor has not been fitted yet.")
        # Ensure columns match exact order and names
        X_aligned = X[self.feature_names]
        X_scaled = self.scaler.transform(X_aligned.values)

        y_encoded = None
        if y is not None:
            y_encoded = self.label_encoder.transform(y.values)

        return X_scaled, y_encoded

    def fit_transform(self, X: pd.DataFrame, y: pd.Series) -> tuple[np.ndarray, np.ndarray]:
        """Fit on X, y and transform."""
        self.fit(X, y)
        X_scaled, y_encoded = self.transform(X, y)
        assert y_encoded is not None
        return X_scaled, y_encoded


def prepare_data_splits(df: pd.DataFrame, label_col: str) -> dict[str, Any]:
    """Split data into train, val, and test splits BEFORE fitting preprocessor."""
    X = df.drop(columns=[label_col])
    y = df[label_col]

    # Split: Train vs Temp (Val + Test)
    X_train, X_temp, y_train, y_temp = train_test_split(
        X,
        y,
        test_size=TEST_RATIO * 2,
        random_state=RANDOM_SEED,
        stratify=y,
    )

    # Split Temp into Val and Test (50/50 of temp = 10% each of total)
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp,
        y_temp,
        test_size=0.5,
        random_state=RANDOM_SEED,
        stratify=y_temp,
    )

    # Fit Preprocessor on TRAIN SPLIT ONLY to guarantee no leakage
    preprocessor = Preprocessor()
    X_train_scaled, y_train_enc = preprocessor.fit_transform(X_train, y_train)
    X_val_scaled, y_val_enc = preprocessor.transform(X_val, y_val)
    X_test_scaled, y_test_enc = preprocessor.transform(X_test, y_test)

    return {
        "preprocessor": preprocessor,
        "feature_names": preprocessor.feature_names,
        "classes": preprocessor.classes,
        "X_train_raw": X_train,
        "y_train_raw": y_train,
        "X_val_raw": X_val,
        "y_val_raw": y_val,
        "X_test_raw": X_test,
        "y_test_raw": y_test,
        "X_train": X_train_scaled,
        "y_train": y_train_enc,
        "X_val": X_val_scaled,
        "y_val": y_val_enc,
        "X_test": X_test_scaled,
        "y_test": y_test_enc,
    }
