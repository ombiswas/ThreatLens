"""Dataset verification script for AI CyberShield ml-training.

Checks that required dataset files exist in ml-training/data/raw/, calculates
file sizes, line counts (without loading everything into RAM), and computes
SHA-256 checksums, saving them to ml-training/data/checksums.txt.
"""

import argparse
import hashlib
import sys
from pathlib import Path


def calculate_sha256_and_rows(file_path: Path, buffer_size: int = 65536) -> tuple[str, int]:
    """Calculate SHA-256 checksum and line count using chunked streaming."""
    sha256 = hashlib.sha256()
    line_count = 0

    with open(file_path, "rb") as f:
        while chunk := f.read(buffer_size):
            sha256.update(chunk)
            line_count += chunk.count(b"\n")

    return sha256.hexdigest(), line_count


def verify_files(
    data_dir: Path, output_checksums: Path | None = None
) -> list[dict[str, str | int]]:
    """Verify that expected CSV files exist in data_dir and inspect their attributes."""
    if not data_dir.exists():
        raise FileNotFoundError(
            f"Dataset directory '{data_dir}' does not exist. "
            "Please create it and place raw CSV dataset files inside."
        )

    csv_files = sorted(list(data_dir.glob("*.csv")))
    if not csv_files:
        raise FileNotFoundError(
            f"No CSV files found in '{data_dir}'. "
            "Ensure raw dataset files (e.g. CIC-IDS2017) are extracted there."
        )

    results = []
    print(f"Found {len(csv_files)} CSV file(s) in {data_dir}:\n")

    for file_path in csv_files:
        size_bytes = file_path.stat().st_size
        size_mb = size_bytes / (1024 * 1024)
        checksum, rows = calculate_sha256_and_rows(file_path)

        res = {
            "name": file_path.name,
            "size_mb": round(size_mb, 2),
            "rows": rows,
            "sha256": checksum,
        }
        results.append(res)
        print(f"File: {res['name']}")
        print(f"  Size: {res['size_mb']} MB")
        print(f"  Lines (approx rows): {res['rows']:,}")
        print(f"  SHA-256: {res['sha256']}\n")

    if output_checksums:
        output_checksums.parent.mkdir(parents=True, exist_ok=True)
        with open(output_checksums, "w", encoding="utf-8") as out:
            for r in results:
                out.write(f"{r['sha256']}  {r['name']}  ({r['rows']} rows, {r['size_mb']} MB)\n")
        print(f"Checksums saved to: {output_checksums}")

    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify raw dataset files.")
    parser.add_argument(
        "--data-dir",
        type=str,
        default="data/raw",
        help="Path to directory containing raw CSV files (default: data/raw)",
    )
    parser.add_argument(
        "--output-checksums",
        type=str,
        default="data/checksums.txt",
        help="Path to output checksums file (default: data/checksums.txt)",
    )
    args = parser.parse_args()

    data_path = Path(args.data_dir)
    checksum_path = Path(args.output_checksums)

    try:
        verify_files(data_path, checksum_path)
    except FileNotFoundError as e:
        print(f"\n[ERROR] Dataset Verification Failed:\n{e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
