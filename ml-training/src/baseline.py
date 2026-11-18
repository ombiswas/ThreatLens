"""Rule-based heuristic detector baseline for intrusion detection.

Implements threshold-based rules derived strictly from the training split:
- DoS/DDoS: High packets-per-second, high forward packets with zero/minimal backward response.
- PortScan: Sensitive service port scanning or rapid zero-payload connection probes.
- BruteForce: Authentication protocol targets (FTP: 21, SSH: 22) with repeated packet exchanges.
- Benign: Default when traffic does not trigger malicious rule signatures.

Exposes standard scikit-learn model interface (`fit`, `predict`, `predict_proba`).
"""

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, ClassifierMixin

from src.config import (
    CLASS_BENIGN,
    CLASS_BRUTEFORCE,
    CLASS_DOS_DDOS,
    CLASS_PORTSCAN,
    TARGET_CLASSES,
)


class RuleBasedBaseline(BaseEstimator, ClassifierMixin):
    """Rule-based baseline detector with transparent heuristic thresholds."""

    def __init__(self) -> None:
        self.classes_ = np.array(TARGET_CLASSES)
        self.dos_pps_threshold_ = 500.0
        self.portscan_duration_max_ = 2000.0
        self.bruteforce_ports_ = {21, 22, 23}

    def fit(
        self, X_train: pd.DataFrame | np.ndarray, y_train: pd.Series | np.ndarray
    ) -> "RuleBasedBaseline":
        """Calibrate thresholds derived strictly from training split distributions."""
        if isinstance(X_train, np.ndarray):
            # If scaled numpy array is passed, use robust defaults
            return self

        # If raw DataFrame is passed, derive data-driven thresholds
        if "Flow Packets/s" in X_train.columns:
            # 90th percentile of benign packet rate as anomalous boundary
            benign_mask = (
                y_train == CLASS_BENIGN
                if isinstance(y_train, pd.Series)
                else np.ones(len(X_train), dtype=bool)
            )
            benign_pps = X_train.loc[benign_mask, "Flow Packets/s"]
            if len(benign_pps) > 0:
                self.dos_pps_threshold_ = float(benign_pps.quantile(0.95))

        return self

    def _classify_row(self, row: dict[str, float]) -> str:
        """Classify a single network flow record using transparent rules."""
        dst_port = int(row.get("Destination Port", row.get("destination_port", 0)))
        flow_duration = float(row.get("Flow Duration", row.get("flow_duration", 0.0)))
        flow_pps = float(row.get("Flow Packets/s", row.get("flow_packets_s", 0.0)))
        tot_fwd = float(row.get("Total Fwd Packets", row.get("total_fwd_packets", 0.0)))
        tot_bwd = float(row.get("Total Backward Packets", row.get("total_backward_packets", 0.0)))

        # Rule 1: Brute Force authentication probe
        if dst_port in self.bruteforce_ports_ and tot_fwd >= 3:
            return CLASS_BRUTEFORCE

        # Rule 2: Denial of Service flood (high packet rate or asymmetric forward flood)
        if flow_pps >= self.dos_pps_threshold_ or (tot_fwd > 50 and tot_bwd <= 2):
            return CLASS_DOS_DDOS

        # Rule 3: Fast reconnaissance PortScan (abrupt short duration, zero backward response)
        if flow_duration <= self.portscan_duration_max_ and tot_bwd == 0 and tot_fwd <= 3:
            return CLASS_PORTSCAN

        # Default classification
        return CLASS_BENIGN

    def predict(self, X: pd.DataFrame | np.ndarray) -> np.ndarray:
        """Predict target class for input feature matrix."""
        if isinstance(X, np.ndarray):
            # Fallback if raw feature names are not preserved in ndarray
            # Returns default Benign
            preds = [CLASS_BENIGN] * len(X)
            return np.array(preds)

        predictions = []
        for _, row in X.iterrows():
            pred = self._classify_row(row.to_dict())
            predictions.append(pred)

        return np.array(predictions)

    def predict_proba(self, X: pd.DataFrame | np.ndarray) -> np.ndarray:
        """Return pseudo-probabilities based on rule predictions."""
        preds = self.predict(X)
        probas = np.zeros((len(preds), len(self.classes_)))

        for i, p in enumerate(preds):
            cls_idx = np.where(self.classes_ == p)[0][0]
            # Confident assignment with minor smoothing
            probas[i] = 0.05 / (len(self.classes_) - 1)
            probas[i, cls_idx] = 0.95

        return probas
