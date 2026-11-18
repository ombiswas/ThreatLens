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
