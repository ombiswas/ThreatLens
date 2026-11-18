"""Training and pipeline configuration for AI CyberShield ml-training."""

from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DATA_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DATA_DIR = BASE_DIR / "data" / "processed"
SAMPLE_DATA_PATH = PROCESSED_DATA_DIR / "sample.csv"
DEMO_DATA_PATH = BASE_DIR / "sample" / "demo_flows.csv"
ARTIFACTS_DIR = BASE_DIR / "artifacts"
PLOTS_DIR = BASE_DIR / "plots"
METRICS_PATH = BASE_DIR / "metrics.json"

# Fixed random seed for full reproducibility across all modules
RANDOM_SEED = 42

# Data split ratios
TRAIN_RATIO = 0.80
VAL_RATIO = 0.10
TEST_RATIO = 0.10

# Target normalized classes
CLASS_BENIGN = "Benign"
CLASS_DOS_DDOS = "DoS/DDoS"
CLASS_PORTSCAN = "PortScan"
CLASS_BRUTEFORCE = "BruteForce"

TARGET_CLASSES = [
    CLASS_BENIGN,
    CLASS_DOS_DDOS,
    CLASS_PORTSCAN,
    CLASS_BRUTEFORCE,
]

# Mapping from raw CIC-IDS2017 labels to project target classes
LABEL_MAPPING = {
    "benign": CLASS_BENIGN,
    # DoS and DDoS variants
    "dos hulk": CLASS_DOS_DDOS,
    "dos goldeneye": CLASS_DOS_DDOS,
    "dos slowloris": CLASS_DOS_DDOS,
    "dos slowhttptest": CLASS_DOS_DDOS,
    "ddos": CLASS_DOS_DDOS,
    "heartbleed": CLASS_DOS_DDOS,
    # PortScan variants
    "portscan": CLASS_PORTSCAN,
    # Brute Force variants
    "ftp-patator": CLASS_BRUTEFORCE,
    "ssh-patator": CLASS_BRUTEFORCE,
}

# Identifier / socket / timestamp columns to drop to prevent leakage
DROP_COLUMNS = [
    "flow id",
    "source ip",
    "src ip",
    "destination ip",
    "dst ip",
    "timestamp",
    "date",
    "time",
    "external ip",
]
