# Dataset Schema Profile & Inspection Report

- **Source Directory:** `sample`
- **Total Rows Analyzed:** 500
- **Total Feature Columns:** 68
- **Detected Target Label:** `Label`

## 1. Class Distribution

| Class Name | Count | Percentage |
|---|---:|---:|
| `BENIGN` | 249 | 49.80% |
| `DoS Hulk` | 106 | 21.20% |
| `PortScan` | 79 | 15.80% |
| `FTP-Patator` | 47 | 9.40% |
| `DDoS` | 19 | 3.80% |

## 2. Potential Data Leakage Candidates

> [!WARNING]
> These columns represent timestamps, socket identifiers, or flow indices that could cause target leakage or non-generalizable overfitting if passed to ML models.

- `Destination Port`

## 3. Data Hygiene & Missing / Inf Values

Zero nulls or infinite values detected across all analyzed rows.

## 4. Column Schema & Data Types

| Index | Cleaned Column Name | Detected Data Type |
|---:|---|---|
| 1 | `Destination Port` | `int64` |
| 2 | `Flow Duration` | `int64` |
| 3 | `Total Fwd Packets` | `int64` |
| 4 | `Total Backward Packets` | `int64` |
| 5 | `Total Length of Fwd Packets` | `int64` |
| 6 | `Total Length of Bwd Packets` | `int64` |
| 7 | `Fwd Packet Length Max` | `float64` |
| 8 | `Fwd Packet Length Min` | `float64` |
| 9 | `Fwd Packet Length Mean` | `float64` |
| 10 | `Fwd Packet Length Std` | `float64` |
| 11 | `Bwd Packet Length Max` | `float64` |
| 12 | `Bwd Packet Length Min` | `float64` |
| 13 | `Bwd Packet Length Mean` | `float64` |
| 14 | `Bwd Packet Length Std` | `float64` |
| 15 | `Flow Bytes/s` | `float64` |
| 16 | `Flow Packets/s` | `float64` |
| 17 | `Flow IAT Mean` | `float64` |
| 18 | `Flow IAT Std` | `float64` |
| 19 | `Flow IAT Max` | `float64` |
| 20 | `Flow IAT Min` | `float64` |
| 21 | `Fwd IAT Total` | `float64` |
| 22 | `Fwd IAT Mean` | `float64` |
| 23 | `Fwd IAT Std` | `float64` |
| 24 | `Fwd IAT Max` | `float64` |
| 25 | `Fwd IAT Min` | `float64` |
| 26 | `Bwd IAT Total` | `float64` |
| 27 | `Bwd IAT Mean` | `float64` |
| 28 | `Bwd IAT Std` | `float64` |
| 29 | `Bwd IAT Max` | `float64` |
| 30 | `Bwd IAT Min` | `float64` |
| 31 | `Fwd PSH Flags` | `int64` |
| 32 | `Bwd PSH Flags` | `int64` |
| 33 | `Fwd URG Flags` | `int64` |
| 34 | `Bwd URG Flags` | `int64` |
| 35 | `Fwd Header Length` | `float64` |
| 36 | `Bwd Header Length` | `float64` |
| 37 | `Fwd Packets/s` | `float64` |
| 38 | `Bwd Packets/s` | `float64` |
| 39 | `Min Packet Length` | `float64` |
| 40 | `Max Packet Length` | `float64` |
| 41 | `Packet Length Mean` | `float64` |
| 42 | `Packet Length Std` | `float64` |
| 43 | `Packet Length Variance` | `float64` |
| 44 | `FIN Flag Count` | `int64` |
| 45 | `SYN Flag Count` | `int64` |
| 46 | `RST Flag Count` | `int64` |
| 47 | `PSH Flag Count` | `int64` |
| 48 | `ACK Flag Count` | `int64` |
| 49 | `URG Flag Count` | `int64` |
| 50 | `CWE Flag Count` | `int64` |
| 51 | `ECE Flag Count` | `int64` |
| 52 | `Down/Up Ratio` | `float64` |
| 53 | `Average Packet Size` | `float64` |
| 54 | `Avg Fwd Segment Size` | `float64` |
| 55 | `Avg Bwd Segment Size` | `float64` |
| 56 | `Init_Win_bytes_forward` | `float64` |
| 57 | `Init_Win_bytes_backward` | `float64` |
| 58 | `act_data_pkt_fwd` | `float64` |
| 59 | `min_seg_size_forward` | `float64` |
| 60 | `Active Mean` | `float64` |
| 61 | `Active Std` | `float64` |
| 62 | `Active Max` | `float64` |
| 63 | `Active Min` | `float64` |
| 64 | `Idle Mean` | `float64` |
| 65 | `Idle Std` | `float64` |
| 66 | `Idle Max` | `float64` |
| 67 | `Idle Min` | `float64` |
| 68 | `Label` | `str` |
