# Future Work & Engineering Roadmap

This document outlines architectural enhancements, engineering extensions, and production-scale capabilities identified for future iterations of **AI CyberShield**.

---

## 1. Real-Time Packet Capture & Stream Processing

### Current Status
AI CyberShield processes completed bidirectional network flow records in CSV format or via simulated high-speed replay streaming (1–50 flows/sec) over Socket.IO.

### Future Roadmap
1. **Kernel-Level Packet Interception (eBPF / XDP):**
   - Implement eBPF (Extended Berkeley Packet Filter) probes or Linux `XDP` (eXpress Data Path) in the host kernel to aggregate network packets into bidirectional flow statistics with zero user-space copying overhead.
2. **Integration with Production Flow Exporters (Zeek / Suricata):**
   - Ingest live flow telemetry directly from Zeek (`conn.log`) or Suricata EVE JSON streams via an Apache Kafka or RabbitMQ event bus.
3. **Sliding-Window Feature Calculation:**
   - Rather than waiting for a TCP FIN/RST packet to close a flow, compute sliding-window statistical features (e.g., packet rate over rolling 5-second intervals) to detect active volumetric attacks in near-real-time.

---

## 2. Advanced Explainable AI (XAI) with SHAP

### Current Status
AI CyberShield provides a deterministic, transparent threat scoring engine where factors strictly conserve and explain score contributions (`attack_class_severity` + `model_confidence`).

### Future Roadmap
1. **TreeSHAP Integration:**
   - Integrate TreeSHAP (SHapley Additive exPlanations) into the Python ML inference service to compute exact Shapley feature attribution values for each individual flow prediction.
2. **Feature Importance Waterfall Charts in UI:**
   - Render Recharts-based waterfall plots in the `IncidentDetailModal` displaying the top 5 positive and negative contributing network features (e.g. `Flow IAT Mean > 150000.0 (+18% DoS confidence)` or `Init_Win_bytes_forward == 0 (-12% Benign confidence)`).
3. **Contrastive Explanations:**
   - Provide "what-if" counterfactual analysis (e.g. *"If Total Length of Fwd Packets was below 500 bytes, this flow would have been classified as Benign"*).

---

## 3. Continuous Concept Drift & Covariate Shift Monitoring

### Current Status
Model evaluation is benchmarked offline on held-out CIC-IDS2017 splits and verified on user-ingested CSV datasets.

### Future Roadmap
1. **Automated Drift Detection Pipeline:**
   - Deploy statistical drift monitoring using libraries such as **Evidently AI** or `alibi-detect`.
   - Execute Kolmogorov-Smirnov (KS) tests on numerical features and Population Stability Index (PSI) to detect covariate shift between training baselines and live production flows.
2. **Automated Retraining Triggers:**
   - When drift scores exceed statistical thresholds ($\alpha = 0.05$), trigger automated retraining pipelines on new verified incidents, followed by shadow-model validation before hot-swapping model artifacts.

---

## 4. Enterprise SIEM & SOAR Integration

### Current Status
Incidents are managed within the integrated SOC console, exportable as sanitized CSV files, and broadcast via Socket.IO and optional email webhooks.

### Future Roadmap
1. **Standardized Syslog & CEF Ingestion:**
   - Implement an RFC 5424 Syslog exporter streaming alerts in Common Event Format (CEF) or Log Extended Event Format (LEEF).
2. **Splunk & Elastic Integration:**
   - Direct forwarding to Splunk HTTP Event Collector (HEC) and Elastic Common Schema (ECS) indices for multi-source correlation.
3. **SOAR Automated Playbooks:**
   - Webhook integration with Security Orchestration, Automation, and Response (SOAR) platforms (e.g. Cortex XSOAR, Tines) to generate automated firewall block rules or ticketing actions.

---

## 5. Unified Custom Domain & Authentication Hardening

### Current Status
JWT access tokens are stored in React memory with `sessionStorage` fallback to accommodate decoupled free-tier cross-subdomain hosting (Vercel SPA on `.vercel.app`, Render API on `.onrender.com`).

### Future Roadmap
1. **Consolidated Custom Domain:**
   - Deploy both frontend and backend under a single unified domain (e.g., `soc.cybershield.org` and `api.cybershield.org`).
2. **HttpOnly, SameSite=Strict Cookie Storage:**
   - Transition access and refresh tokens to secure `HttpOnly`, `SameSite=Strict`, `Secure` cookies, eliminating JavaScript memory/storage exposure and completely neutralizing XSS token theft vectors.
3. **Refresh Token Rotation & Revocation:**
   - Implement dual-token authentication with short-lived access tokens (15 minutes) and rotating single-use refresh tokens backed by Redis blocklists for instantaneous session revocation.
