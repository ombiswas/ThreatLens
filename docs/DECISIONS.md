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

## ADR-010: Room-Based WebSocket Partitioning & Role-Based IP Masking
- **Date:** 2026-11-18
- **Status:** Accepted
- **Decision:** Partition Socket.IO clients into role-specific rooms (`role:admin`, `role:analyst`, `role:viewer`) and user-specific rooms (`user:<userId>`) upon successful JWT handshake authentication. When new incidents are emitted (`incident:new`), dispatch raw payloads with real IP addresses strictly to `role:admin`, while dispatching sanitized payloads with masked IP addresses to `role:analyst` and `role:viewer`.
- **Reason:** Real-time web sockets bypass HTTP route middleware checks. Emitting a single unmasked broadcast would leak sensitive network topology and internal IP addresses to non-administrator observers. Room-based partitioning ensures zero data leakage at the protocol layer.
- **Alternatives Considered:**
  - Client-side masking: Vulnerable to inspection via browser DevTools.
  - Separate socket namespaces: Overcomplicates client-side connection pooling.

## ADR-011: Server-Side Managed Replay Engine with Single Active User Session
- **Date:** 2026-11-18
- **Status:** Accepted
- **Decision:** Implement network traffic replay as a server-side state machine bounded by user identity (`Map<string, ReplaySession>`), allowing at most one active replay per user. The engine feeds records through the real `detectionService` pipeline, creates real `Incident` documents in MongoDB for attack flows, and streams progress updates over Socket.IO. All timers are cleaned up on stop, socket disconnect, or server shutdown.
- **Reason:** Educational demonstration requires realistic, observable live telemetry without manual packet capture or live port scanning. Running through the real detection pipeline guarantees that no mock alerts or synthetic results are faked. Bounding the rate (1–50 flows/sec) and capping active sessions prevents server resource starvation.
- **Alternatives Considered:**
  - Client-driven replay (sending flows via HTTP loop from React): Causes network congestion and exposes raw dataset rows directly to the browser.
  - Multi-session concurrency per user: Easily overwhelms free-tier CPU and memory limits.

## ADR-012: In-App Alerts & Rate-Limited External Email Dispatch for Critical Threats
- **Date:** 2026-11-18
- **Status:** Accepted
- **Decision:** When an incident scores in the Critical band (`score >= 80`), create an in-app `Notification` document, broadcast `notification:new` over Socket.IO, and trigger optional external email alerts via Brevo or Resend if configured (`BREVO_API_KEY` or `RESEND_API_KEY`). Enforce a 5-minute cooldown between email dispatches and sanitize all outbound notification bodies.
- **Reason:** Critical attacks (e.g. volumetric DoS or active brute-force) require immediate SOC awareness. In-app alerts provide zero-dependency real-time alerting, while external email provides out-of-band notification. Rate-limiting prevents mailbox flooding during intense replay sessions.
- **Alternatives Considered:**
  - Sending an email for every single critical flow: Results in hundreds of emails during attack replays, rapidly exhausting provider quotas and causing alert fatigue.

## ADR-013: Ember Studio Dark SOC Aesthetics & Multi-Modal Risk Tokens
- **Date:** 2026-11-18
- **Status:** Accepted
- **Decision:** Synthesize the warm craft palette of Ember Studio (`docs/DESIGN.md`) with a professional Security Operations Center (SOC) dark interface. Risk severity bands (`Critical`, `High`, `Medium`, `Low`) must be distinguishable without relying on color perception alone: each token incorporates an explicit semantic icon (`ShieldAlert`, `Flame`, `AlertTriangle`, `ShieldCheck`), a clear text label, distinct border contrast, and background tints. Technical values (IP addresses, ports, timestamps, percentages) strictly utilize monospace typography (`Fira Code`).
- **Reason:** Standard SOC templates often suffer from dark-mode fatigue, illegible neon gradients, or inaccessible color-only alert indicators. The warm terracotta and stone palette creates a distinctive, accessible, and fatigue-resistant operator environment while satisfying WCAG 2.1 AA accessibility guidelines.
- **Alternatives Considered:**
  - Generic cyber neon-green / dark-blue theme: Low readability, common template feel, poor contrast.
  - Color-only badges without icons or labels: Fails accessibility requirements for color-blind analysts.

## ADR-014: Client State Partitioning (TanStack Query + Auth React Context)
- **Date:** 2026-11-18
- **Status:** Accepted
- **Decision:** Partition client state into server cache (managed by `@tanstack/react-query`) and local session state (managed by lightweight React Context for `AuthContext` and `ToastContext`). Access tokens are kept in memory with `sessionStorage` fallback for tab reloads, and immediately wiped upon logout or receiving a `401 Unauthorized` response.
- **Reason:** Eliminates heavy global state management libraries (Redux, Zustand) for a focused application. TanStack Query provides out-of-the-box caching, deduplication, and background refetching for remote REST data, while React Context handles synchronous user identity and UI notifications cleanly.
- **Alternatives Considered:**
  - Redux Toolkit: Excessive boilerplate for a clean 6-view application.
  - Storing JWT in `localStorage`: High XSS vulnerability window compared to memory + `sessionStorage`.

## ADR-015: Live Telemetry Stream Throttling & Memory-Bounded Buffer
- **Date:** 2026-11-19
- **Status:** Accepted
- **Decision:** In `LiveFeedPanel.jsx`, buffer incoming Socket.IO `incident:new` events in a non-state reference array and flush them to React component state in throttled batches at 250ms intervals (`BATCH_INTERVAL_MS`). The maximum list size is strictly capped at 50 items (`MAX_LIVE_FEED_ITEMS = 50`) using a FIFO eviction slice. A Pause/Resume mechanism holds incoming events in the buffer during inspection without dropping telemetry.
- **Reason:** High-speed replay sessions stream at rates up to 50 flows/second. Triggering a React component re-render on every individual WebSocket message creates re-render storms, degrades UI frame rates, and causes browser memory bloat over extended monitoring sessions. Controlled batching preserves 60fps responsiveness while capping memory overhead.
- **Alternatives Considered:**
  - Direct `setState` on every socket message: High CPU usage, jerky rendering during replay.
  - Unbounded list growth: Memory leak causing browser tab crashes during long sessions.
