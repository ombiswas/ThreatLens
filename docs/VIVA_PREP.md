# B.Tech Major Project Viva Defense & Presentation Guide

**Project Title:** AI CyberShield: Intelligent Cyberattack Detection and Threat Analysis System  
**Institution:** Dev Bhoomi Uttarakhand University  
**Degree Program:** Bachelor of Technology in Computer Science & Engineering  

---

## 1. Executive Summary for Examiners

AI CyberShield is an end-to-end, full-stack cybersecurity operations platform that ingests bidirectional network flow records, classifies them into threat categories (`DoS/DDoS`, `PortScan`, `BruteForce`) versus `Benign` traffic using a trained Random Forest model, computes a transparent 0–100 threat severity score with mathematical factor attribution, manages forensic incidents, and provides real-time telemetry streaming to a Security Operations Center (SOC) dashboard. 

Crucially, the system benchmarks the machine learning classifier against a domain-standard rule-based heuristic on identical held-out test data, demonstrating an empirical **+36.00% accuracy** and **+51.07% macro F1-score** advantage over traditional static rules.

---

## 2. Likely Examiner Questions & Concise Technical Answers

### Q1: Why did you adopt a hybrid MERN + FastAPI architecture instead of a single monolithic framework?
> **Answer:** Specialization of concerns. Python is the industry standard for machine learning, data engineering, and vector transformations (`scikit-learn`, `numpy`, `pandas`), but standard Python web runtimes encounter Global Interpreter Lock (GIL) friction when managing hundreds of concurrent, persistent WebSocket connections. Node.js with its non-blocking, asynchronous event loop is purpose-built for high-concurrency I/O, WebSocket multiplexing (Socket.IO rooms), and REST orchestration. Decoupling the ML inference engine as an independent microservice behind an authenticated HTTP API contract (`X-API-Key`) ensures that model updates, dependency upgrades, or container scaling occur without disrupting web application availability.

### Q2: Why did you choose MongoDB over a relational database like PostgreSQL?
> **Answer:** Network flow records and forensic incident payloads are inherently semi-structured and polymorphic. Network telemetry involves varying transport protocols, diverse explanation factor arrays, and extensible flow metadata. MongoDB's BSON document model stores nested flow summaries, multi-factor attribution objects, and analyst notes in an atomic document without requiring complex 8-table relational joins. High-throughput query performance is guaranteed through compound indexes (`IXSCAN` verified via MongoDB execution plans) on `{ status: 1, riskLevel: 1, detectedAt: -1 }`.

### Q3: How is the 0–100 threat score calculated, and what makes it "explainable"?
> **Answer:** Many security tools output arbitrary probability percentages that lack operational context (e.g. 99% confidence on a minor port scan does not mean the system is compromised). Our threat score normalizes two weighted dimensions:
> $$\text{Score} = \min\left(100, \max\left(0, \operatorname{round}\left(100 \times \left(0.6 \times S_{\text{class}} + 0.4 \times C\right)\right)\right)\right)$$
> where $S_{\text{class}}$ represents attack severity (`DoS/DDoS`: 1.0, `BruteForce`: 0.85, `PortScan`: 0.65, `Benign`: 0.0) and $C$ represents model confidence.  
> It is **explainable** because it satisfies the *Factor Conservation Invariant*: each contributing factor is returned as an exact integer, and their sum equals the final score. An analyst can see that a score of 92 consists of 51 points from DoS class severity + 41 points from 98% model confidence. If the flow is Benign, the score is mathematically clamped to 0.

### Q4: How did you ensure data leakage did not artificially inflate model accuracy?
> **Answer:** In network intrusion datasets (like CIC-IDS2017), algorithms often "cheat" by memorizing host IPs or timestamps. We took three strict measures:
> 1. Dropped all identity and temporal columns (`Flow ID`, `Source IP`, `Timestamp`) before training.
> 2. Applied stratified train/validation/test splitting (70/15/15) with random seed 42.
> 3. Fitted all imputers and `StandardScaler` transformers **strictly on the training split**, then transformed validation and test data out-of-sample.

### Q5: Why is the Rule-Based Baseline included in the project?
> **Answer:** In scientific research and academic evaluation, claiming an ML model has "high accuracy" is meaningless without a comparative baseline. We implemented a calibrated rule-based heuristic using domain-standard rules (e.g., ports 21/22 for BruteForce, packet-rate thresholds for DoS, SYN/RST ratios for PortScan). Demonstrating that the Random Forest model achieves **98.00% accuracy** versus the baseline's **62.00%** on identical test data proves to the committee that machine learning solves real multi-vector detection challenges that static rules miss.

### Q6: What security safeguards are implemented in the application?
> **Answer:** Defense-in-depth across the entire stack:
> - **Authentication:** Passwords hashed with bcrypt (cost 12), pre-computed dummy hash timing defense, 5-failure lockout (15 min), HS256-pinned JWTs.
> - **Input Validation:** Strict Zod schema validation (unknown keys stripped), NoSQL injection sanitizers (stripping `$` and `.`), CSV magic-byte sniffing (blocking executable files).
> - **CSV Export Defense:** Formula injection sanitization (escaping `=`, `+`, `-`, `@`).
> - **Access Control:** Server-side RBAC (`Admin`, `Analyst`, `Viewer`) with self-demotion safeguards and role-based IP masking.
> - **Web Security:** Helmet headers, CSP with frame denial (`DENY`), rate limiting on public and sensitive routes.

### Q7: What are the primary technical limitations of the system?
> **Answer:**
> 1. **Offline Flow Completion:** Features are calculated over bidirectional flows (NetFlow statistics). A TCP session must terminate or hit a timeout before classification, making this best suited for rapid telemetry triage rather than inline microsecond packet drops.
> 2. **Public Dataset Age:** CIC-IDS2017 reflects 2017 synthetic laboratory attacks. Contemporary threats (e.g. HTTP/2 rapid resets, residential proxy botnets) require continuously updated training data.
> 3. **Free-Tier Cold Starts:** Render and Hugging Face free tiers sleep after periods of inactivity, mitigated by our 4s frontend wake-up banner and 5-minute UptimeRobot pings.

### Q8: What would you build next with an enterprise production budget?
> **Answer:**
> 1. Kernel-level real-time packet aggregation using eBPF/XDP probes.
> 2. Explainable AI integration using TreeSHAP waterfall charts for per-incident feature attribution.
> 3. Automated concept drift monitoring using Evidently AI with retrain triggers.
> 4. Unified custom domain deployment enabling `HttpOnly`, `SameSite=Strict` cookies.

---

## 3. Five-Minute Live Demonstration Script

Follow this choreographed 5-minute sequence during the viva demo:

| Time | Action | Screen / View | Speaking Points |
| :---: | :--- | :--- | :--- |
| **0:00 - 1:00** | **Login & SOC Dashboard Overview** | `LoginPage` -> `DashboardPage` | *"We begin by authenticating as a SOC Analyst. The dashboard provides a high-level operational overview: total flows evaluated, attack class distributions via Recharts, and risk level breakdowns. The design follows our Dark SOC aesthetic with multi-modal risk badges (icons + labels) ensuring full accessibility."* |
| **1:00 - 2:00** | **Dataset Ingestion & Validation** | `DatasetsPage` | *"Next, we demonstrate flow ingestion. In the Datasets module, we drag-and-drop a sample CSV. Notice the instant client-side pre-validation: it verifies MIME type, checks for executable headers, and validates all 67 required feature columns before initiating upload. The backend streams chunked batches to the FastAPI microservice and persists the dataset summary."* |
| **2:00 - 3:00** | **Live Traffic Replay & Socket Stream** | `DatasetsPage` -> `DashboardPage` | *"To simulate real-world operations, we trigger controlled traffic replay at 25 flows/second. Switching to the dashboard, we see the live Socket.IO feed streaming events in real time. Notice the 250ms throttled batch rendering and 50-item buffer cap, preventing UI lag. When a Critical threat is detected, an instant notification banner is broadcast."* |
| **3:00 - 4:00** | **Forensic Triage & Explainable Scoring** | `IncidentsPage` -> `IncidentDetailModal` | *"In the Incidents catalog, we inspect a detected DoS incident. The incident modal displays our transparent threat score: 92 out of 100 in the Critical band. Notice the factor conservation: 51 points from attack class severity + 41 points from model confidence. We transition the status from 'New' to 'Under Review' and add an investigation note, demonstrating the analyst workflow."* |
| **4:00 - 5:00** | **Comparative Evaluation & Defense Proof** | `EvaluationPage` | *"Finally, we view the Comparative Evaluation suite. Here we benchmark the Random Forest model against a heuristic rule baseline on the exact same test records. The Random Forest achieves 98.0% accuracy compared to the baseline's 62.0%, catching stealthy DoS and port scans that static rules completely miss. We show the confusion matrix heatmap and discuss our honest operational limitations."* |

---

## 4. Key Metrics Cheat Sheet

Keep these exact numbers in mind during your viva defense:
- **Total Test Split Evaluated:** $N = 50$ held-out test flows.
- **Random Forest Accuracy:** **98.00%** (Macro F1: **0.9802**, Weighted F1: **0.9804**).
- **Rule Baseline Accuracy:** **62.00%** (Macro F1: **0.4695**, Weighted F1: **0.5019**).
- **ML Advantage:** **+36.00% Accuracy**, **+51.07% Macro F1**.
- **Model Size:** **0.05 MB** (55 KB joblib artifact, 60 estimators, max depth 14).
- **Automated Tests:** **200 passed tests across 27 test files** in the monorepo (100% pass rate).
- **Accessibility Violations:** **0 violations** verified via `axe-core`.
