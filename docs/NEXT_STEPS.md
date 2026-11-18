# NEXT STEPS

## Current Goal: Phase 3 - Server Foundation & Core Infrastructure in `server/`

Phases 0, 0.5, 1, and 2 are verified and completed. The next phase develops the core Express.js backend API framework in `server/`.

### Phase 3 Checklist
- [ ] Dependencies installation:
  - Add Express, Mongoose, Zod, Helmet, Pino, pino-http, dotenv, cors, express-rate-limit.
  - Add dev dependencies: Jest or Vitest, supertest, mongodb-memory-server.
- [ ] Core Environment & Configuration (`server/config/`):
  - Validate environment variables at boot via Zod (`env.js`), enforcing fail-fast behavior.
  - Set up MongoDB Atlas connection manager with Mongoose (`db.js`).
  - Configure structured Pino logger (`logger.js`).
- [ ] Middlewares (`server/middlewares/`):
  - Centralized error handler (`errorHandler.js`) formatting custom `AppError` classes without stack traces in production.
  - Request logging middleware using Pino.
  - Security headers using `helmet`.
  - Strict CORS allowlist matching `CLIENT_URL`.
  - Rate limiting (global rate limiter + stricter auth limiter).
  - JSON body parser with size limit (e.g. 1MB).
  - Custom NoSQL injection sanitizer (reject keys starting with `$` or containing `.`).
- [ ] Express App Factory (`server/src/app.js` and `server/src/index.js`):
  - Mount `/api/v1/health` endpoint returning system, DB, and ML service connectivity status.
- [ ] Integration Tests (`server/tests/`):
  - Test `/api/v1/health` with in-memory Mongo using `mongodb-memory-server`.
  - Test NoSQL injection rejection.
  - Test rate limiting and security headers (Helmet).
  - Test centralized error handler formatting.
- [ ] Verify with `npm run lint` and `npm test`.

### Open Questions
- None. `server/.env.example` and architecture layouts are prepared.

### Known Issues
- None tracked.
