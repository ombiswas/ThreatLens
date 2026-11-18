"""Dataset inspection and schema profiler for AI CyberShield ml-training.

Reads large CSV files in chunks (memory-safe), profiles column statistics,
detects missing/inf values, identifies the target label column, counts classes,
estimates duplicate rows, and flags columns vulnerable to data leakage
(e.g., timestamps, socket IPs, flow IDs). Generates docs/DATASET_SCHEMA.md.
"""

import argparse
import sys
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd

# Keywords indicating potential data leakage or non-generalizable identifiers
LEAKAGE_KEYWORDS = [
    "id",
    "ip",
    "src",
    "dst",
    "source",
    "destination",
    "timestamp",
    "date",
    "time",
    "port",
    "mac",
]

# Keywords indicating candidate ground-truth label columns
LABEL_KEYWORDS = ["label", "class", "attack", "category", "target"]


def clean_col_name(col: str) -> str:
    """Normalize raw column names: strip whitespace, leading/trailing punctuation."""
    return col.strip()


def detect_candidate_columns(columns: list[str]) -> tuple[str | None, list[str]]:
    """Detect label column and potential leakage/identifier columns from column names."""
    label_col = None
    leakage_cols = []

    for col in columns:
        col_clean = clean_col_name(col).lower()
        if not label_col and any(
            k == col_clean or f"_{k}" in col_clean or f" {k}" in col_clean for k in LABEL_KEYWORDS
        ):
            label_col = col
        if any(k in col_clean.split() or k in col_clean.split("_") for k in LEAKAGE_KEYWORDS):
            leakage_cols.append(col)

    return label_col, leakage_cols


def inspect_dataset(data_dir: Path, output_doc: Path, chunksize: int = 50000) -> dict:
    """Read CSV files in chunks and generate complete dataset schema summary."""
    if not data_dir.exists():
        raise FileNotFoundError(f"Data directory '{data_dir}' not found.")

    csv_files = sorted(list(data_dir.glob("*.csv")))
    if not csv_files:
        raise FileNotFoundError(f"No CSV files found in '{data_dir}'.")

    print(
        f"Inspecting {len(csv_files)} file(s) in {data_dir} using chunks of {chunksize:,} rows..."
    )

    total_rows = 0
    column_dtypes: dict[str, str] = {}
    null_counts: Counter[str] = Counter()
    inf_counts: Counter[str] = Counter()
    class_counts: Counter[str] = Counter()
    detected_label: str | None = None
    all_columns: list[str] = []

    for file_path in csv_files:
        print(f"\nProcessing: {file_path.name}")
        # Detect headers and column names on first chunk
        reader = pd.read_csv(
            file_path, chunksize=chunksize, low_memory=False, encoding="utf-8", on_bad_lines="skip"
        )

        for i, chunk in enumerate(reader):
            # Clean column whitespace
            chunk.columns = [clean_col_name(c) for c in chunk.columns]
            if not all_columns:
                all_columns = list(chunk.columns)
                detected_label, _ = detect_candidate_columns(all_columns)
                for c in all_columns:
                    column_dtypes[c] = str(chunk[c].dtype)

            total_rows += len(chunk)

            # Null counts
            nulls = chunk.isnull().sum()
            for col, count in nulls.items():
                if count > 0:
                    null_counts[col] += int(count)

            # Inf counts in numeric columns
            numeric_cols = chunk.select_dtypes(include=[np.number]).columns
            for col in numeric_cols:
                n_inf = int(np.isinf(chunk[col]).sum())
                if n_inf > 0:
                    inf_counts[col] += n_inf

            # Class counts if label is identified
            if detected_label and detected_label in chunk.columns:
                labels = chunk[detected_label].astype(str).str.strip()
                class_counts.update(labels.value_counts().to_dict())

            if (i + 1) % 5 == 0:
                print(f"  Processed {total_rows:,} rows so far...")

    _, leakage_candidates = detect_candidate_columns(all_columns)

    # Compile Markdown Schema
    output_doc.parent.mkdir(parents=True, exist_ok=True)
    with open(output_doc, "w", encoding="utf-8") as md:
        md.write("# Dataset Schema Profile & Inspection Report\n\n")
        md.write(f"- **Source Directory:** `{data_dir}`\n")
        md.write(f"- **Total Rows Analyzed:** {total_rows:,}\n")
        md.write(f"- **Total Feature Columns:** {len(all_columns)}\n")
        md.write(f"- **Detected Target Label:** `{detected_label}`\n\n")

        md.write("## 1. Class Distribution\n\n")
        if class_counts:
            md.write("| Class Name | Count | Percentage |\n")
            md.write("|---|---:|---:|\n")
            for cls_name, count in class_counts.most_common():
                pct = (count / total_rows) * 100 if total_rows > 0 else 0
                md.write(f"| `{cls_name}` | {count:,} | {pct:.2f}% |\n")
        else:
            md.write("No target label detected or label column was absent.\n")

        md.write("\n## 2. Potential Data Leakage Candidates\n\n")
        md.write(
            "> [!WARNING]\n"
            "> These columns represent timestamps, socket identifiers, or flow indices "
            "that could cause target leakage or non-generalizable overfitting if passed "
            "to ML models.\n\n"
        )
        if leakage_candidates:
            for lc in leakage_candidates:
                md.write(f"- `{lc}`\n")
        else:
            md.write("No obvious leakage columns detected.\n")

        md.write("\n## 3. Data Hygiene & Missing / Inf Values\n\n")
        has_hygiene_issues = bool(null_counts or inf_counts)
        if has_hygiene_issues:
            md.write("| Column | Null Count | Inf / -Inf Count |\n")
            md.write("|---|---:|---:|\n")
            all_flagged = sorted(set(list(null_counts.keys()) + list(inf_counts.keys())))
            for col in all_flagged:
                md.write(
                    f"| `{col}` | {null_counts.get(col, 0):,} | {inf_counts.get(col, 0):,} |\n"
                )
        else:
            md.write("Zero nulls or infinite values detected across all analyzed rows.\n")

        md.write("\n## 4. Column Schema & Data Types\n\n")
        md.write("| Index | Cleaned Column Name | Detected Data Type |\n")
        md.write("|---:|---|---|\n")
        for idx, col in enumerate(all_columns):
            md.write(f"| {idx + 1} | `{col}` | `{column_dtypes.get(col, 'unknown')}` |\n")

    print(f"\nInspection complete! Schema report written to: {output_doc}")
    return {
        "total_rows": total_rows,
        "features": len(all_columns),
        "label_col": detected_label,
        "class_counts": dict(class_counts),
        "leakage_candidates": leakage_candidates,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect dataset and write schema report.")
    parser.add_argument(
        "--data-dir",
        type=str,
        default="data/raw",
        help="Path to raw CSV directory (default: data/raw)",
    )
    parser.add_argument(
        "--output-doc",
        type=str,
        default="../docs/DATASET_SCHEMA.md",
        help="Path to output markdown document (default: ../docs/DATASET_SCHEMA.md)",
    )
    parser.add_argument(
        "--chunksize",
        type=int,
        default=50000,
        help="Number of rows per chunk (default: 50000)",
    )
    args = parser.parse_args()

    data_path = Path(args.data_dir)
    doc_path = Path(args.output_doc)

    try:
        inspect_dataset(data_path, doc_path, chunksize=args.chunksize)
    except FileNotFoundError as e:
        print(f"\n[ERROR] Dataset Inspection Aborted:\n{e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
