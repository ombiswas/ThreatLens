# Security Implementation Checklist

The following controls are enforced throughout design, development, and deployment:

### Configuration & Secrets Management
- [x] Secrets provided solely through environment variables (`.env`).
- [x] No production credentials or secrets committed to repository.
- [x] `.env.example` maintained with comprehensive documentation and safe dummy values.
- [x] Environment variables validated on service boot (fail-fast behavior via Zod in `server/src/config/env.js`).

### Authentication & Authorization
- [ ] Passwords hashed with bcrypt (work factor >= 12).
- [ ] Public registration restricted strictly to minimum role (`Viewer`).
- [ ] System administrative user seeded exclusively via command-line script and env variables.
- [ ] JWT tokens configured with short expiration and verified against strong secrets.
- [ ] Cryptographic algorithm explicitly pinned (`HS256`).
- [ ] Server-side role-based access control (RBAC) enforced on protected endpoints.
- [ ] Generic error responses on authentication failure to prevent user enumeration.

### Network, Headers & Rate Limiting
- [x] Security headers applied via `helmet` in Express server.
- [x] Strict CORS origin allowlist configured from environment (`CLIENT_URL`).
- [x] `x-powered-by` header disabled.
- [x] Global and sensitive-endpoint rate limiting configured (`express-rate-limit` & `slowapi`).
- [x] JSON body parser payload size limited (1MB in Express, 2MB in FastAPI).
- [x] Production stack traces suppressed from client responses (`errorHandler.js`).

### Input Validation & Data Sanitization
- [x] Strict schema validation via Zod on query parameters, route params, and request bodies (`validate.js`).
- [x] Unknown and excess properties stripped/rejected.
- [x] NoSQL injection defenses implemented (prohibit keys starting with `$` or containing `.` via `nosqlSanitizer`).
- [ ] Raw request payloads never passed unsanitized to database queries.
- [ ] IP addresses masked in responses for non-admin viewers.

### File Ingestion & Export Safety
- [ ] Dataset upload accepts CSV format only with extension and MIME-type validation.
- [ ] Maximum file size and row count strictly enforced.
- [ ] CSV header names validated against strict whitelist.
- [ ] Uploaded files processed safely without filesystem execution risks.
- [ ] CSV export sanitizes formulas (prepends single quote `'` to cells starting with `=`, `+`, `-`, `@`).

### Machine Learning Microservice Security
- [x] Internal API key protection via `X-API-Key` header with constant-time string comparison (`hmac.compare_digest`).
- [x] Strict Pydantic input validation for features with extra fields forbidden (`ConfigDict(extra="forbid")`).
- [x] Maximum batch size limits enforced (`MAX_BATCH_SIZE`).
- [x] Model artifacts loaded strictly from static paths, never dynamic user input.

### Frontend Security
- [ ] Zero usage of `dangerouslySetInnerHTML`.
- [ ] Content escaped by React JSX compiler by default.
- [ ] Tokens and credentials never exposed in URL query parameters.
- [ ] Content Security Policy (CSP) and security headers configured for web deployment.
