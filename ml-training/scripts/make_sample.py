"""Stratified sampling tool for AI CyberShield ml-training.

Creates a balanced, downsampled dataset subset suitable for laptop/Colab training:
- Caps majority classes (e.g., BENIGN) at --benign-max.
- Caps major attack classes at --per-class-max.
- Preserves rare/minority classes completely.
- Uses a fixed seed for reproducible, deterministic sampling.
- Writes to ml-training/data/processed/sample.csv.
"""

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd


def clean_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Strip leading and trailing whitespace from column names."""
    df.columns = [c.strip() for c in df.columns]
    return df


def find_label_column(df: pd.DataFrame) -> str:
    """Find the target label column dynamically."""
    for c in df.columns:
        if c.lower() in ["label", "class", "attack"]:
            return c
    raise ValueError(f"Could not identify a label column among columns: {list(df.columns)}")


def sample_dataframe(
    df: pd.DataFrame,
    label_col: str,
    per_class_max: int,
    benign_max: int,
    seed: int,
) -> tuple[pd.DataFrame, dict[str, int], dict[str, int]]:
    """Perform stratified deterministic sampling on a DataFrame."""
    rng = np.random.default_rng(seed)

    # Standardize label values
    df[label_col] = df[label_col].astype(str).str.strip()
    before_counts = df[label_col].value_counts().to_dict()

    sampled_dfs = []
    for cls_name, group in df.groupby(label_col):
        cls_count = len(group)
        is_benign = cls_name.upper() == "BENIGN"
        cap = benign_max if is_benign else per_class_max

        if cls_count <= cap:
            sampled_dfs.append(group)
        else:
            # Deterministic selection with fixed random state
            indices = rng.choice(group.index, size=cap, replace=False)
            sampled_dfs.append(group.loc[indices])

    sampled_df = pd.concat(sampled_dfs).sample(frac=1.0, random_state=seed).reset_index(drop=True)
    after_counts = sampled_df[label_col].value_counts().to_dict()

    return sampled_df, before_counts, after_counts


def process_sampling(
    data_dir: Path,
    output_file: Path,
    per_class_max: int = 15000,
    benign_max: int = 40000,
    seed: int = 42,
    chunksize: int = 50000,
) -> None:
    """Sample across one or multiple CSV files in data_dir."""
    if not data_dir.exists():
        raise FileNotFoundError(f"Input directory '{data_dir}' does not exist.")

    csv_files = sorted(list(data_dir.glob("*.csv")))
    if not csv_files:
        raise FileNotFoundError(f"No CSV files found in '{data_dir}'.")

    print(f"Reading dataset from {data_dir}...")
    frames = []
    label_col: str | None = None

    for file_path in csv_files:
        print(f"  Reading: {file_path.name}")
        for chunk in pd.read_csv(
            file_path, chunksize=chunksize, low_memory=False, encoding="utf-8", on_bad_lines="skip"
        ):
            chunk = clean_columns(chunk)
            if label_col is None:
                label_col = find_label_column(chunk)
            frames.append(chunk)

    if not frames or label_col is None:
        raise ValueError("No data could be read from dataset.")

    full_df = pd.concat(frames, ignore_index=True)
    print(f"\nLoaded {len(full_df):,} total records. Starting stratified sampling...")

    sampled_df, before_counts, after_counts = sample_dataframe(
        full_df, label_col, per_class_max, benign_max, seed
    )

    output_file.parent.mkdir(parents=True, exist_ok=True)
    sampled_df.to_csv(output_file, index=False)

    print(f"\n{'Class Name':<35} {'Before':>12} {'After':>12} {'Change':>12}")
    print("-" * 75)
    for cls in sorted(before_counts.keys()):
        b = before_counts[cls]
        a = after_counts.get(cls, 0)
        pct = f"{(a / b) * 100:.1f}%" if b > 0 else "0%"
        print(f"{cls:<35} {b:>12,d} {a:>12,d} {pct:>12}")

    print("-" * 75)
    print(f"{'TOTAL':<35} {len(full_df):>12,d} {len(sampled_df):>12,d}")
    print(f"\nSample successfully saved to: {output_file}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Create balanced dataset sample.")
    parser.add_argument(
        "--data-dir", type=str, default="data/raw", help="Path to raw CSV directory"
    )
    parser.add_argument(
        "--output", type=str, default="data/processed/sample.csv", help="Output sample CSV path"
    )
    parser.add_argument(
        "--per-class-max", type=int, default=15000, help="Maximum instances for attack classes"
    )
    parser.add_argument(
        "--benign-max", type=int, default=40000, help="Maximum instances for BENIGN class"
    )
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument(
        "--chunksize", type=int, default=50000, help="Row chunk size for CSV reading"
    )
    args = parser.parse_args()

    try:
        process_sampling(
            Path(args.data_dir),
            Path(args.output),
            per_class_max=args.per_class_max,
            benign_max=args.benign_max,
            seed=args.seed,
            chunksize=args.chunksize,
        )
    except Exception as e:
        print(f"\n[ERROR] Sampling failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
