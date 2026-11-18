# Architecture Decision Records (ADRs)

## ADR-001: Monorepo Architecture with MERN + FastAPI ML Service
- **Date:** 2026-11-18
- **Status:** Accepted
- **Decision:** Split the platform into an Express.js API gateway, a React client, and a dedicated FastAPI ML microservice.
- **Reason:** Node.js Express provides great asynchronous I/O and WebSocket support for live dashboard feeds. Python + FastAPI provides direct access to high-performance machine learning ecosystems (scikit-learn, joblib, numpy) with automatic OpenAPI documentation and strict Pydantic validation.
- **Alternatives Considered:**
  - Monolithic Python web framework (Django/FastAPI for everything): Slower WebSocket DX and UI ecosystem compared to Node.js/React.
  - In-process Node.js ML (onnxruntime-node / tfjs): Higher friction for model training pipelines, feature engineering, and academic ML library compatibility.

## ADR-002: MongoDB Atlas (M0 Free Tier) for Data Persistence
- **Date:** 2026-11-18
- **Status:** Accepted
- **Decision:** Use MongoDB Atlas M0 cluster with Mongoose ODM.
- **Reason:** Fits incident log structures with variable metadata, offers easy cloud hosting on free tier, and provides fast JSON serialization for client consumption.
- **Alternatives Considered:**
  - SQLite: Not suited for cloud deployments where file storage is ephemeral (e.g., Render free web services restart and wipe disk).
  - PostgreSQL: Viable, but MongoDB document model maps naturally to security incident payloads and telemetry logs.

## ADR-003: Threat Scoring and Rule-Based Baseline in Node.js Server
- **Date:** 2026-11-18
- **Status:** Accepted
- **Decision:** Keep `scoringService` (0-100 score computation) and `baselineService` (rule-based heuristics) inside the Express server, not in the Python ML microservice.
- **Reason:** The ML service acts strictly as a stateless classification engine (features -> predicted class + probabilities). Business rules, threat severity normalization, role adjustments, and comparative baseline calculations belong in the core business service layer.
- **Alternatives Considered:**
  - Scoring in ML service: Couples domain incident business rules to the ML microservice.
  - Scoring in React frontend: Security vulnerability (client-tamperable logic).

## ADR-004: JWT Authentication with Server-Side RBAC
- **Date:** 2026-11-18
- **Status:** Accepted
- **Decision:** Implement stateless short-lived JWT access tokens with server-side role validation on every protected route.
- **Reason:** Lightweight, stateless, easily consumed by both REST endpoints and WebSocket handshakes.
- **Alternatives Considered:**
  - Session cookies with Redis: Requires additional infrastructure/free-tier service not available on basic free tiers.

## ADR-005: ES Modules (ESM) Across Node.js and Client
- **Date:** 2026-11-18
- **Status:** Accepted
- **Decision:** Use standard ECMAScript Modules (`"type": "module"`) across both `server/` and `client/`.
- **Reason:** Consistency with modern Node.js standards (Node 22 LTS), Vite defaults, and standard `import`/`export` syntax across JavaScript tiers.
- **Alternatives Considered:**
  - CommonJS in server: Legacy syntax creating inconsistencies with client and modern library exports.

## ADR-006: Password Hashing Security & Public Registration Scope
- **Date:** 2026-11-18
- **Status:** Accepted
- **Decision:** Hash user passwords with `bcrypt` using 12 salt rounds. Enforce that public self-registration assigns the `Viewer` role exclusively, while `Admin` provisioning is handled via an idempotent CLI seed script using verified environment variables.
- **Reason:** Work factor 12 provides a robust barrier against offline dictionary and rainbow-table attacks while maintaining sub-second API authentication latency. Restricting public registration prevents privilege escalation attacks by design.
- **Alternatives Considered:**
  - Allowing role specification on registration: High security vulnerability allowing unauthorized Admin privilege escalation.
  - Argon2id: Requires additional native compiler dependencies on Windows that complicate cross-platform deployment on free tiers.

## ADR-007: Short-Lived Access Tokens Without Refresh Token Infrastructure
- **Date:** 2026-11-18
- **Status:** Accepted
- **Decision:** Issue stateless short-lived JWT access tokens (default 30 minutes, configurable via `JWT_EXPIRES_IN`) carrying only `sub` and `role`. Do not implement refresh token rotation or persistent token denylists. Logout is treated as client-side token discard combined with server-side audit event persistence.
- **Reason:**
  1. *Exposure Window Mitigation:* A short 30-minute validity window ensures that compromised credentials have an ephemeral blast radius without necessitating complex distributed token invalidation systems.
  2. *Operational Simplicity on Free-Tier:* Persistent refresh token families or distributed token denylists require high-availability Redis or frequent MongoDB writes on every API call. On free-tier cloud infrastructure (Render + MongoDB Atlas M0), stateless verification prevents connection exhaustion and database rate limits.
  3. *Auditability:* Explicit audit log records (`REGISTER`, `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `LOGOUT`, `ROLE_CHANGE`, `STATUS_CHANGE`) capture user lifecycle and security events with client IP and user-agent metadata.
- **Alternatives Considered:**
  - Refresh Tokens in HttpOnly Cookies: Better UX for long-running sessions, but adds cross-origin cookie configuration complexity across separate Vercel and Render domains.
  - Server-Side Token Denylist in MongoDB: Requires database lookup on every single request, eliminating the performance benefit of JWTs.

## ADR-008: Streaming In-Memory CSV Ingestion & Chunked Batch Classification
- **Date:** 2026-11-18
- **Status:** Accepted
- **Decision:** Ingest dataset uploads using Multer memory storage (5MB buffer limit), validate headers against a strict whitelist (67 CIC-IDS2017 features), inspect magic numbers for binary spoofing (PE, ELF, null bytes), stream parse rows via `csv-parse`, process records in chunks of 100 through `detectionService.detectBatch`, and only persist non-Benign flows as `Incident` documents in MongoDB while updating aggregate counters (`rowCount`, `benignCount`, `incidentCount`, `classDistribution`) on the `Dataset` document.
- **Reason:**
  1. *Resource Constraints:* Ephemeral hosting (Render / containers) lacks persistent scratch disks. In-memory streaming avoids writing untrusted files to the filesystem and eliminates arbitrary file execution vectors.
  2. *Database Efficiency:* 90%+ of network traffic in typical datasets is Benign. Persisting tens of thousands of Benign records would quickly exhaust free-tier MongoDB Atlas storage limits (512MB). Persisting only attack flows as `Incident` items while storing Benign counters preserves telemetry accuracy with minimal storage footprint.
  3. *Memory Bounding:* Processing in bounded chunks (100 flows per ML call) keeps memory usage flat regardless of the number of rows up to the 20,000 row cap.
- **Alternatives Considered:**
  - Persisting entire raw flow dictionaries in MongoDB for every row: Quickly exhausts MongoDB Atlas M0 512MB storage cap.
  - Disk-backed temporary file storage: Requires filesystem write access and cleanup cron jobs, risking uncleaned temporary files on server crash.

## ADR-009: Formula Injection Neutralization in CSV Incident Exports
- **Date:** 2026-11-18
- **Status:** Accepted
- **Decision:** Neutralize dynamic data exchange (DDE) and formula injection attacks by prepending a single quote (`'`) to any cell in exported CSV files whose string value begins with `=`, `+`, `-`, or `@`.
- **Reason:** Security analysts routinely open incident export CSVs in spreadsheet software (Microsoft Excel, LibreOffice Calc, Google Sheets). Malicious payloads embedded in attacker-controlled network flow metadata (e.g., crafting hostnames or labels like `=cmd|' /C calc'!A0`) could otherwise execute arbitrary code on the analyst's workstation.
- **Alternatives Considered:**
  - Stripping leading formula characters entirely: Alters the ground-truth data or label values. Prepending `'` allows spreadsheets to safely display the original string verbatim as plain text.
