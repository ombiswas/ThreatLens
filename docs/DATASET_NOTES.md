# Dataset Documentation & Provenance

## Selected Dataset: CIC-IDS2017
**Official Name:** Canadian Institute for Cybersecurity Intrusion Detection Evaluation Dataset 2017 (CIC-IDS2017)  
**Publisher:** Canadian Institute for Cybersecurity (CIC), University of New Brunswick (UNB), Fredericton, NB, Canada.

---

## 1. Official Sources & Access
- **Official University Page:** [UNB CIC-IDS2017 Dataset Page](https://www.unb.ca/cic/datasets/ids-2017.html)
- **Official MachineLearningCSV Distribution:** Hosted on UNB servers / AWS mirrors referenced by UNB.
- **Kaggle Verified Mirror:** `cicdataset/cicids2017` (titled *CIC-IDS2017*)

> **Important:** Do not download from unverified third-party mirrors or random repositories. Always verify SHA-256 hashes against verified references.

---

## 2. License, Terms of Use & Redistribution Policy
- **Terms:** The CIC-IDS2017 dataset is publicly accessible for academic, research, and non-commercial educational use, subject to attribution.
- **Redistribution Restrictions:** The full dataset (~3GB compressed, ~8GB raw CSV) must not be redistributed or committed into version control.
- **Demo Sample Policy:** A minimal, heavily downsampled slice (<1MB, containing ~500 rows) is generated for unit tests, demo replays, and schema verification. However, to respect original provider attribution guidelines, raw full data files remain strictly ignored (`ml-training/data/`).

---

## 3. Academic Citation
When publishing or defending this project, cite:
```bibtex
@inproceedings{sharafaldin2018toward,
  title={Toward generating a new intrusion detection dataset and intrusion traffic characterization},
  author={Sharafaldin, Iman and Lashkaripour, Amirhossein and Ghorbani, Ali A},
  booktitle={Proceedings of the 4th International Conference on Information Systems Security and Privacy (ICISSP)},
  pages={108--116},
  year={2018}
}
```

---

## 4. Expected Raw Files
The dataset is published as 8 daily CSV files representing simulated network traffic generated from Monday July 3, 2017 to Friday July 7, 2017:

1. `Monday-WorkingHours.pcap_ISCX.csv` (Benign baseline traffic)
2. `Tuesday-WorkingHours.pcap_ISCX.csv` (FTP-Patator and SSH-Patator brute force)
3. `Wednesday-workingHours.pcap_ISCX.csv` (DoS: Slowloris, Slowhttptest, Hulk, GoldenEye; Heartbleed)
4. `Thursday-WorkingHours-Morning-WebAttacks.pcap_ISCX.csv` (Web Attacks: Brute Force, XSS, SQL Injection)
5. `Thursday-WorkingHours-Afternoon-Infilteration.pcap_ISCX.csv` (Infiltration)
6. `Friday-WorkingHours-Morning.pcap_ISCX.csv` (Botnet ARES)
7. `Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv` (PortScan)
8. `Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv` (DDoS: LOIT)

For AI CyberShield's target scope (**DoS/DDoS, PortScan, BruteForce, Benign**), the key files are:
- `Tuesday-WorkingHours.pcap_ISCX.csv` (BruteForce)
- `Wednesday-workingHours.pcap_ISCX.csv` (DoS)
- `Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv` (PortScan)
- `Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv` (DDoS)
- `Monday-WorkingHours.pcap_ISCX.csv` (Clean Benign baseline)

---

## 5. Manual Download Instructions

### Method A: Download via Browser (Recommended)
1. Visit the [UNB CIC-IDS2017 dataset request page](https://www.unb.ca/cic/datasets/ids-2017.html).
2. Fill the educational license form and obtain the download link for `GeneratedLabelledFlows.zip`.
3. Extract the CSV files into `ml-training/data/raw/`:
   ```text
   ml-training/
     └── data/
         └── raw/
             ├── Monday-WorkingHours.pcap_ISCX.csv
             ├── Tuesday-WorkingHours.pcap_ISCX.csv
             ├── Wednesday-workingHours.pcap_ISCX.csv
             ├── Thursday-WorkingHours-Morning-WebAttacks.pcap_ISCX.csv
             ├── Thursday-WorkingHours-Afternoon-Infilteration.pcap_ISCX.csv
             ├── Friday-WorkingHours-Morning.pcap_ISCX.csv
             ├── Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv
             └── Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv
   ```

### Method B: Download via Kaggle CLI
If you have Kaggle CLI configured on your workstation:
1. Ensure your personal credentials reside at `~/.kaggle/kaggle.json` (outside the repo). Never copy `kaggle.json` into this repository.
2. Run in a terminal:
   ```bash
   kaggle datasets download -d cicdataset/cicids2017 -p ml-training/data/raw/ --unzip
   ```
3. Run dataset verification:
   ```powershell
   cd ml-training
   uv run python scripts/verify_dataset.py
   ```
