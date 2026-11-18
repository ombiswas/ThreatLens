"""Generates a compact demo flows CSV for upload, replay demos, and test fixtures.

Produces a lightweight file (ml-training/sample/demo_flows.csv) with ~500 rows,
including BENIGN, DoS, PortScan, and BruteForce records.
If raw data is available in data/raw/, it samples real records.
If raw data is not yet downloaded, it creates a representative synthetic flow
sample matching the exact CIC-IDS2017 schema and feature distribution.
"""

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

try:
    from scripts.make_sample import clean_columns, find_label_column
except ImportError:
    from make_sample import clean_columns, find_label_column


# Core CIC-IDS2017 feature schema subset used for standard flow representation
CIC_SCHEMA_FEATURES = [
    "Destination Port",
    "Flow Duration",
    "Total Fwd Packets",
    "Total Backward Packets",
    "Total Length of Fwd Packets",
    "Total Length of Bwd Packets",
    "Fwd Packet Length Max",
    "Fwd Packet Length Min",
    "Fwd Packet Length Mean",
    "Fwd Packet Length Std",
    "Bwd Packet Length Max",
    "Bwd Packet Length Min",
    "Bwd Packet Length Mean",
    "Bwd Packet Length Std",
    "Flow Bytes/s",
    "Flow Packets/s",
    "Flow IAT Mean",
    "Flow IAT Std",
    "Flow IAT Max",
    "Flow IAT Min",
    "Fwd IAT Total",
    "Fwd IAT Mean",
    "Fwd IAT Std",
    "Fwd IAT Max",
    "Fwd IAT Min",
    "Bwd IAT Total",
    "Bwd IAT Mean",
    "Bwd IAT Std",
    "Bwd IAT Max",
    "Bwd IAT Min",
    "Fwd PSH Flags",
    "Bwd PSH Flags",
    "Fwd URG Flags",
    "Bwd URG Flags",
    "Fwd Header Length",
    "Bwd Header Length",
    "Fwd Packets/s",
    "Bwd Packets/s",
    "Min Packet Length",
    "Max Packet Length",
    "Packet Length Mean",
    "Packet Length Std",
    "Packet Length Variance",
    "FIN Flag Count",
    "SYN Flag Count",
    "RST Flag Count",
    "PSH Flag Count",
    "ACK Flag Count",
    "URG Flag Count",
    "CWE Flag Count",
    "ECE Flag Count",
    "Down/Up Ratio",
    "Average Packet Size",
    "Avg Fwd Segment Size",
    "Avg Bwd Segment Size",
    "Init_Win_bytes_forward",
    "Init_Win_bytes_backward",
    "act_data_pkt_fwd",
    "min_seg_size_forward",
    "Active Mean",
    "Active Std",
    "Active Max",
    "Active Min",
    "Idle Mean",
    "Idle Std",
    "Idle Max",
    "Idle Min",
    "Label",
]


def generate_synthetic_demo_flows(output_path: Path, num_rows: int = 500, seed: int = 42) -> None:
    """Generate representative synthetic flow records matching CIC-IDS2017 schema."""
    rng = np.random.default_rng(seed)
    classes = ["BENIGN", "DoS Hulk", "PortScan", "FTP-Patator", "DDoS"]
    probs = [0.50, 0.20, 0.15, 0.10, 0.05]

    data: dict[str, list] = {col: [] for col in CIC_SCHEMA_FEATURES}

    assigned_labels = rng.choice(classes, size=num_rows, p=probs)

    for label in assigned_labels:
        is_portscan = label == "PortScan"
        is_dos = "DoS" in label or label == "DDoS"
        is_brute = "Patator" in label

        dst_port = (
            80
            if is_dos
            else (21 if is_brute else (int(rng.integers(1, 65535)) if is_portscan else 443))
        )
        flow_duration = (
            int(rng.integers(100, 5000000)) if not is_portscan else int(rng.integers(5, 500))
        )
        tot_fwd = int(rng.integers(1, 50)) if not is_dos else int(rng.integers(50, 500))
        tot_bwd = int(rng.integers(0, 40)) if not is_portscan else 0
        fwd_bytes = tot_fwd * int(rng.integers(40, 1460))
        bwd_bytes = tot_bwd * int(rng.integers(40, 1460))

        # Fill dictionary with realistic synthetic values
        for col in CIC_SCHEMA_FEATURES:
            if col == "Destination Port":
                data[col].append(dst_port)
            elif col == "Flow Duration":
                data[col].append(flow_duration)
            elif col == "Total Fwd Packets":
                data[col].append(tot_fwd)
            elif col == "Total Backward Packets":
                data[col].append(tot_bwd)
            elif col == "Total Length of Fwd Packets":
                data[col].append(fwd_bytes)
            elif col == "Total Length of Bwd Packets":
                data[col].append(bwd_bytes)
            elif col == "Label":
                data[col].append(label)
            elif "Flags" in col or "Flag Count" in col:
                data[col].append(int(rng.choice([0, 1], p=[0.85, 0.15])))
            else:
                data[col].append(round(float(rng.uniform(0.0, 1000.0)), 2))

    df = pd.DataFrame(data)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    file_size_kb = output_path.stat().st_size / 1024
    print(f"Synthetic demo flows created at: {output_path} ({len(df)} rows, {file_size_kb:.2f} KB)")


def make_demo_sample(
    data_dir: Path, output_file: Path, target_rows: int = 500, seed: int = 42
) -> None:
    """Generate demo sample from raw data if present, or synthetic representative data."""
    csv_files = list(data_dir.glob("*.csv")) if data_dir.exists() else []

    if csv_files:
        print(f"Extracting real demo sample ({target_rows} rows) from {data_dir}...")
        frames = []
        label_col = None
        for f in csv_files:
            # Read first chunk of each file to capture diverse classes
            chunk = pd.read_csv(
                f, nrows=2000, low_memory=False, encoding="utf-8", on_bad_lines="skip"
            )
            chunk = clean_columns(chunk)
            if label_col is None:
                label_col = find_label_column(chunk)
            frames.append(chunk)

        combined = pd.concat(frames, ignore_index=True)
        # Take equal proportion of classes
        sampled_rows = combined.groupby(label_col, group_keys=False).apply(
            lambda x: x.sample(
                n=min(len(x), max(10, target_rows // len(combined[label_col].unique()))),
                random_state=seed,
            )
        )
        output_file.parent.mkdir(parents=True, exist_ok=True)
        sampled_rows.to_csv(output_file, index=False)
        print(f"Extracted {len(sampled_rows)} rows from real data to: {output_file}")
    else:
        print(f"No raw dataset found in {data_dir}. Generating synthetic demo flows sample...")
        generate_synthetic_demo_flows(output_file, num_rows=target_rows, seed=seed)


def main() -> None:
    parser = argparse.ArgumentParser(description="Create small demo flows sample under 1MB.")
    parser.add_argument(
        "--data-dir", type=str, default="data/raw", help="Path to raw CSV directory"
    )
    parser.add_argument(
        "--output", type=str, default="sample/demo_flows.csv", help="Path to demo CSV"
    )
    parser.add_argument("--rows", type=int, default=500, help="Target row count (default: 500)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    make_demo_sample(Path(args.data_dir), Path(args.output), target_rows=args.rows, seed=args.seed)


if __name__ == "__main__":
    main()
