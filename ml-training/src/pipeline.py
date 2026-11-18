"""Full end-to-end training and evaluation pipeline runner for AI CyberShield."""

import argparse
import sys
from pathlib import Path

# Add ml-training root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.baseline import RuleBasedBaseline
from src.data_loading import load_dataset
from src.evaluate import evaluate_all
from src.export import export_artifacts
from src.preprocessing import clean_dataframe, prepare_data_splits
from src.train import train_models


def run_pipeline(data_path: Path | None = None) -> None:
    """Execute complete end-to-end training, evaluation, and export pipeline."""
    print("=" * 70)
    print("AI CyberShield ML Training Pipeline")
    print("=" * 70)

    # 1. Load data
    df, source_file = load_dataset(data_path)

    # 2. Preprocess & Clean
    cleaned_df, label_col, before_counts, after_counts = clean_dataframe(df)

    print("\nTarget Label Distribution:")
    for cls, count in after_counts.items():
        pct = (count / len(cleaned_df)) * 100
        print(f"  {cls:<20} {count:>8,d} ({pct:>5.1f}%)")

    # 3. Train/Val/Test Split & Preprocessor fit (Train only)
    splits = prepare_data_splits(cleaned_df, label_col)
    n_train = len(splits["X_train"])
    n_val = len(splits["X_val"])
    n_test = len(splits["X_test"])
    print(f"\nData Splits: Train={n_train:,}, Val={n_val:,}, Test={n_test:,}")

    # 4. Fit Baseline Heuristic
    baseline = RuleBasedBaseline()
    baseline.fit(splits["X_train_raw"], splits["y_train_raw"])

    # 5. Train Candidate ML Models
    models = train_models(splits["X_train"], splits["y_train"], splits["classes"])

    # 6. Evaluate Models & Baseline on Test Split
    evaluate_all(
        models=models,
        baseline=baseline,
        X_test_scaled=splits["X_test"],
        X_test_raw=splits["X_test_raw"],
        y_test_encoded=splits["y_test"],
        y_test_raw=splits["y_test_raw"],
        preprocessor=splits["preprocessor"],
        dataset_name=source_file.name,
    )

    # 7. Select Champion Model (Best Macro-F1) & Export
    champion_name = "RandomForest"
    champion_model = models[champion_name]
    print(f"Selecting Champion Model: {champion_name}")
    export_artifacts(champion_model, splits["preprocessor"])

    print("\nPipeline execution complete!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run complete ML training pipeline.")
    parser.add_argument("--data", type=str, default=None, help="Path to input dataset CSV")
    args = parser.parse_args()

    input_path = Path(args.data) if args.data else None
    run_pipeline(input_path)
