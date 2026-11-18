"""Tests for ml-training dataset scripts using synthetic data fixtures."""

from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from scripts.inspect_dataset import inspect_dataset
from scripts.make_demo_sample import generate_synthetic_demo_flows
from scripts.make_sample import sample_dataframe
from scripts.verify_dataset import verify_files


@pytest.fixture
def synthetic_csv(tmp_path: Path) -> Path:
    """Create a temporary synthetic dataset CSV for unit testing."""
    rng = np.random.default_rng(123)
    n_rows = 300
    classes = ["BENIGN"] * 200 + ["DoS Hulk"] * 80 + ["Heartbleed"] * 20

    data = {
        "Flow ID": [f"flow_{i}" for i in range(n_rows)],
        "Source IP": ["192.168.1.10"] * n_rows,
        "Destination Port": rng.integers(1, 65535, size=n_rows),
        "Timestamp": ["04/07/2017 09:00:00"] * n_rows,
        "Flow Duration": rng.integers(100, 100000, size=n_rows),
        "Total Fwd Packets": rng.integers(1, 50, size=n_rows),
        "Flow Bytes/s": rng.uniform(0, 1000, size=n_rows),
        "Label": classes,
    }

    # Inject some NaNs and Infs for tester verification
    data["Flow Bytes/s"][5] = np.nan
    data["Flow Bytes/s"][10] = np.inf
    data["Flow Bytes/s"][15] = -np.inf

    df = pd.DataFrame(data)
    file_path = tmp_path / "synthetic_traffic.csv"
    df.to_csv(file_path, index=False)
    return file_path


def test_sampling_determinism(synthetic_csv: Path):
    """Verify that the same random seed produces the exact same sampled DataFrame."""
    df = pd.read_csv(synthetic_csv)
    sample_a, _, counts_a = sample_dataframe(
        df.copy(), "Label", per_class_max=30, benign_max=50, seed=42
    )
    sample_b, _, counts_b = sample_dataframe(
        df.copy(), "Label", per_class_max=30, benign_max=50, seed=42
    )

    assert counts_a == counts_b
    pd.testing.assert_frame_equal(sample_a, sample_b)


def test_class_caps_and_minority_preservation(synthetic_csv: Path):
    """Verify majority classes are capped and rare minority classes are preserved fully."""
    df = pd.read_csv(synthetic_csv)
    # Before counts: BENIGN=200, DoS Hulk=80, Heartbleed=20 (rare)
    sample, before, after = sample_dataframe(df, "Label", per_class_max=30, benign_max=50, seed=42)

    assert before["BENIGN"] == 200
    assert before["DoS Hulk"] == 80
    assert before["Heartbleed"] == 20

    # Caps respected
    assert after["BENIGN"] == 50
    assert after["DoS Hulk"] == 30
    # Rare class below cap must be preserved completely
    assert after["Heartbleed"] == 20


def test_inspector_flags_nan_inf_and_leakage(tmp_path: Path, synthetic_csv: Path):
    """Verify that inspector catches NaN/Inf values and identifies leakage columns."""
    doc_out = tmp_path / "SCHEMA_OUT.md"
    profile = inspect_dataset(synthetic_csv.parent, doc_out, chunksize=100)

    assert profile["total_rows"] == 300
    assert profile["label_col"] == "Label"
    assert "BENIGN" in profile["class_counts"]

    # Verify leakage detection
    leakage = [c.lower() for c in profile["leakage_candidates"]]
    assert any("ip" in c for c in leakage)
    assert any("timestamp" in c for c in leakage)
    assert any("flow id" in c for c in leakage)

    # Verify report was written and contains warnings
    content = doc_out.read_text(encoding="utf-8")
    assert "Missing / Inf Values" in content
    assert "Potential Data Leakage" in content


def test_verify_script_fails_on_missing_dir(tmp_path: Path):
    """Verify that dataset verifier raises FileNotFoundError when data dir is missing."""
    non_existent = tmp_path / "does_not_exist"
    with pytest.raises(FileNotFoundError):
        verify_files(non_existent)


def test_verify_script_calculates_checksums(synthetic_csv: Path, tmp_path: Path):
    """Verify that dataset verifier correctly computes SHA-256 and row counts."""
    checksums_file = tmp_path / "checksums.txt"
    results = verify_files(synthetic_csv.parent, checksums_file)

    assert len(results) == 1
    assert results[0]["name"] == synthetic_csv.name
    assert results[0]["rows"] == 301  # 300 rows + 1 header line
    assert len(results[0]["sha256"]) == 64
    assert checksums_file.exists()


def test_generate_synthetic_demo_flows(tmp_path: Path):
    """Verify demo flow generator creates a valid, compact CSV with attack classes."""
    demo_csv = tmp_path / "demo_flows.csv"
    generate_synthetic_demo_flows(demo_csv, num_rows=100, seed=99)

    assert demo_csv.exists()
    assert demo_csv.stat().st_size < 1024 * 1024  # Under 1 MB

    df = pd.read_csv(demo_csv)
    assert len(df) == 100
    assert "Label" in df.columns
    assert "Destination Port" in df.columns
    unique_labels = df["Label"].unique()
    assert len(unique_labels) > 1
