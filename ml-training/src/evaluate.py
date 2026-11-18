"""Evaluation and metrics computation module for AI CyberShield ml-training.

Computes accuracy, precision, recall, macro-F1, confusion matrix, and PR-AUC.
Generates evaluation visualization plots and serializes metrics.json.
"""

import json
from datetime import datetime, timezone
from typing import Any

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
import sklearn
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)

from src.baseline import RuleBasedBaseline
from src.config import METRICS_PATH, PLOTS_DIR, RANDOM_SEED


def evaluate_all(
    models: dict[str, Any],
    baseline: RuleBasedBaseline,
    X_test_scaled: np.ndarray,
    X_test_raw: pd.DataFrame,
    y_test_encoded: np.ndarray,
    y_test_raw: pd.Series,
    preprocessor: Any,
    dataset_name: str,
) -> dict[str, Any]:
    """Evaluate candidate ML models and rule-based baseline on the held-out test split."""
    classes = list(preprocessor.classes)
    y_test_labels = list(y_test_raw)
    PLOTS_DIR.mkdir(parents=True, exist_ok=True)

    results: dict[str, Any] = {
        "metadata": {
            "dataset_name": dataset_name,
            "evaluation_date": datetime.now(timezone.utc).isoformat(),
            "random_seed": RANDOM_SEED,
            "sklearn_version": sklearn.__version__,
            "joblib_version": joblib.__version__,
            "num_test_samples": len(y_test_encoded),
            "classes": classes,
            "feature_count": len(preprocessor.feature_names),
            "features_in_order": preprocessor.feature_names,
        },
        "models": {},
    }

    # Evaluate Rule-Based Baseline
    print("Evaluating Rule-Based Baseline...")
    baseline_preds = baseline.predict(X_test_raw)
    baseline_acc = accuracy_score(y_test_labels, baseline_preds)
    baseline_macro_f1 = f1_score(y_test_labels, baseline_preds, average="macro", zero_division=0)
    baseline_cm = confusion_matrix(y_test_labels, baseline_preds, labels=classes)

    results["models"]["RuleBasedBaseline"] = {
        "accuracy": float(round(baseline_acc, 4)),
        "macro_f1": float(round(baseline_macro_f1, 4)),
        "confusion_matrix": baseline_cm.tolist(),
        "classification_report": classification_report(
            y_test_labels, baseline_preds, labels=classes, zero_division=0, output_dict=True
        ),
    }

    # Evaluate ML models
    for name, model in models.items():
        print(f"Evaluating {name}...")
        y_pred = model.predict(X_test_scaled)

        acc = accuracy_score(y_test_encoded, y_pred)
        macro_f1 = f1_score(y_test_encoded, y_pred, average="macro", zero_division=0)
        macro_precision = precision_score(y_test_encoded, y_pred, average="macro", zero_division=0)
        macro_recall = recall_score(y_test_encoded, y_pred, average="macro", zero_division=0)
        cm = confusion_matrix(y_test_encoded, y_pred, labels=range(len(classes)))

        results["models"][name] = {
            "accuracy": float(round(acc, 4)),
            "macro_f1": float(round(macro_f1, 4)),
            "macro_precision": float(round(macro_precision, 4)),
            "macro_recall": float(round(macro_recall, 4)),
            "confusion_matrix": cm.tolist(),
            "classification_report": classification_report(
                y_test_encoded,
                y_pred,
                target_names=classes,
                zero_division=0,
                output_dict=True,
            ),
        }

        # Plot Confusion Matrix
        plt.figure(figsize=(6, 5))
        sns.heatmap(
            cm,
            annot=True,
            fmt="d",
            cmap="Blues",
            xticklabels=classes,
            yticklabels=classes,
        )
        plt.title(f"{name} Confusion Matrix")
        plt.ylabel("True Class")
        plt.xlabel("Predicted Class")
        plt.tight_layout()
        cm_path = PLOTS_DIR / f"{name.lower()}_confusion_matrix.png"
        plt.savefig(cm_path, dpi=150)
        plt.close()

    # Save metrics JSON
    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"Metrics saved to: {METRICS_PATH}")

    # Summary table
    print("\n" + "=" * 65)
    print(f"{'Model':<25} {'Accuracy':>12} {'Macro-F1':>12} {'Macro-Prec':>12}")
    print("-" * 65)
    for model_name, m in results["models"].items():
        prec = f"{m.get('macro_precision', 0.0):.4f}" if "macro_precision" in m else "N/A"
        print(f"{model_name:<25} {m['accuracy']:>12.4f} {m['macro_f1']:>12.4f} {prec:>12}")
    print("=" * 65 + "\n")

    return results
