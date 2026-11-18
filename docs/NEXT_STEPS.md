# NEXT STEPS

## Current Goal: Phase 1 - ML Offline Training & Evaluation

Phase 0 and Phase 0.5 are verified and completed. The next phase develops the offline machine learning training pipeline in `ml-training/` using the sampled/stratified dataset.

### Phase 1 Checklist
- [ ] Build preprocessing pipeline in `ml-training/scripts/preprocess.py`:
  - Drop leakage candidate columns (`Flow ID`, `Source IP`, `Destination IP`, `Timestamp`).
  - Impute/sanitize infinite values and NaN records.
  - Standardize column names to lower_snake_case.
  - Group granular attack labels into core project classes: `BENIGN`, `DoS/DDoS`, `PortScan`, `BruteForce`.
- [ ] Implement feature scaling and selection (`StandardScaler` or `RobustScaler`) saved via `joblib`.
- [ ] Implement training script `ml-training/scripts/train.py`:
  - Evaluate candidate baseline models: `RandomForestClassifier` vs. `HistGradientBoostingClassifier` vs. `LogisticRegression`.
  - Fix random seed for full reproducibility.
  - Stratified 80/10/10 train/validation/test split.
  - Compute accuracy, precision, recall, macro F1, and confusion matrix.
- [ ] Serialize trained model, scaler, and label encoder to `ml-service/models/` (`threat_classifier.joblib`, `scaler.joblib`, `label_encoder.joblib`).
- [ ] Output training evaluation report to `docs/MODEL_PERFORMANCE.md`.
- [ ] Write unit tests for preprocessing, feature transformation, and inference reproducibility.

### Open Questions
- Assess whether `HistGradientBoostingClassifier` or `RandomForestClassifier` yields the optimal trade-off between inference latency and multiclass F1 score under free-tier CPU constraints.

### Known Issues
- None tracked.
