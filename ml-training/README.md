# ML Training: Dataset Ingestion, Inspection & Sampling

This directory contains offline data preparation pipelines and tooling for **AI CyberShield**.
All Python scripts and dependencies are managed exclusively with **`uv`**.

---

## 1. Setup & Environment Sync

From the repository root or inside `ml-training/`:

```powershell
cd ml-training
uv sync
```

---

## 2. Dataset Tooling Workflow (Order of Operations)

### Step 1: Verify Raw Dataset Files & Compute Checksums
Ensure raw dataset files (e.g., CIC-IDS2017 CSVs) are extracted into `data/raw/` (see `docs/DATASET_NOTES.md`).

```powershell
uv run python scripts/verify_dataset.py --data-dir data/raw --output-checksums data/checksums.txt
```
*Outputs file sizes, exact row counts, and SHA-256 hashes to `data/checksums.txt` (git-ignored).*

---

### Step 2: Memory-Safe Inspection & Schema Profiling
Analyze raw data in streaming chunks to compute class distributions, flag missing/infinite values, and identify data leakage risks:

```powershell
uv run python scripts/inspect_dataset.py --data-dir data/raw --output-doc ../docs/DATASET_SCHEMA.md --chunksize 50000
```
*Generates a comprehensive Markdown summary in `docs/DATASET_SCHEMA.md`.*

---

### Step 3: Stratified Deterministic Sampling (Laptop/Colab Friendly)
Downsample majority classes (e.g. BENIGN capped at 40,000; attack classes at 15,000) while preserving 100% of rare minority attack classes:

```powershell
uv run python scripts/make_sample.py --data-dir data/raw --output data/processed/sample.csv --benign-max 40000 --per-class-max 15000 --seed 42
```
*Outputs deterministic, balanced dataset to `data/processed/sample.csv` (git-ignored).*

---

### Step 4: Generate Demo Flows Sample (< 1MB)
Create a compact, representative 500-row sample containing BENIGN and attack flows for test fixtures, API demos, and frontend upload replays:

```powershell
uv run python scripts/make_demo_sample.py --output sample/demo_flows.csv --rows 500 --seed 42
```

---

## 3. Running Unit Tests & Quality Audits

Run the automated test suite and code linters:

```powershell
# Run Pytest suite
uv run pytest

# Run Ruff code analysis
uv run ruff check .

# Check formatting
uv run ruff format --check .
```
