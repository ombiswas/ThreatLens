# NEXT STEPS

## Current Goal: Phase 0.5 - Dataset Tooling & Exploration

Phase 0 is verified and complete. The next phase establishes offline tooling to acquire, parse, and profile the public intrusion datasets (CIC-IDS2017 / UNSW-NB15).

### Phase 0.5 Checklist
- [ ] Set up `ml-training/` scripts to download or sample CIC-IDS2017 / UNSW-NB15 data subsets.
- [ ] Define standardized feature mapping for DoS/DDoS, PortScan, BruteForce, and Benign records.
- [ ] Create data profiling script to inspect class balances, missing values, infinite values, and numeric ranges.
- [ ] Establish reproducible train/val/test split generation script with fixed random seed.
- [ ] Document dataset schemas, feature subsets, and class mappings in `docs/DATASETS.md`.

### Open Questions
- Target primary dataset: evaluate whether CIC-IDS2017 (Wednesday/Friday subsets covering DoS, PortScan, and BruteForce) or UNSW-NB15 provides the cleaner feature subset for fast, robust inference in free-tier memory constraints.

### Known Issues
- None tracked.
