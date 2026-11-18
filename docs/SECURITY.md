# Security Implementation Checklist

The following controls are enforced throughout design, development, and deployment:

### Configuration & Secrets Management
- [x] Secrets provided solely through environment variables (`.env`).
- [x] No production credentials or secrets committed to repository.
- [x] `.env.example` maintained with comprehensive documentation and safe dummy values.
- [x] Environment variables validated on service boot (fail-fast behavior via Zod in `server/src/config/env.js`).

### Authentication & Authorization
- [x] Passwords hashed with bcrypt (work factor >= 12).
- [x] Public registration restricted strictly to minimum role (`Viewer`).
- [x] System administrative user seeded exclusively via command-line script and env variables.
- [x] JWT tokens configured with short expiration (default 30m) and verified against strong secrets.
- [x] Cryptographic algorithm explicitly pinned (`HS256`); `alg: none` and tampered tokens strictly rejected.
- [x] Server-side role-based access control (RBAC) enforced on protected endpoints.
- [x] Generic error responses on authentication failure (`Invalid credentials`) to prevent user enumeration.
- [x] Pre-computed dummy bcrypt hash to mitigate timing-discrepancy attacks against non-existent accounts.
- [x] Automatic account lockout after 5 consecutive failed attempts (15-minute freeze window).
- [x] Organizational password policy enforced (>= 10 chars, upper/lower/number/symbol, not equal to email).
- [x] Administrative safeguards preventing self-demotion, self-deactivation, and removing the last active administrator.

### Network, Headers & Rate Limiting
- [x] Security headers applied via `helmet` in Express server.
- [x] Strict CORS origin allowlist configured from environment (`CLIENT_URL`).
- [x] `x-powered-by` header disabled.
- [x] Global and sensitive-endpoint rate limiting configured (`express-rate-limit` & `slowapi`).
- [x] JSON body parser payload size limited (1MB in Express, 2MB in FastAPI).
- [x] Production stack traces suppressed from client responses (`errorHandler.js`).

### Input Validation & Data Sanitization
- [x] Strict schema validation via Zod on query parameters, route params, and request bodies (`validate.js`).
- [x] Unknown and excess properties stripped/rejected (mass-assignment defense).
- [x] NoSQL injection defenses implemented (prohibit keys starting with `$` or containing `.` via `nosqlSanitizer`).
- [x] Raw request payloads never passed unsanitized to database queries.
- [x] IP addresses masked in responses for non-admin viewers (`maskIp` utility).

### File Ingestion & Export Safety
- [x] Dataset upload accepts CSV format only with extension, MIME-type, and binary signature validation (PE/ELF and null-byte magic numbers sniffed).
- [x] Maximum file size (5MB via Multer memory storage) and row count (20,000 row cap) strictly enforced.
- [x] CSV header names validated against strict whitelist (all 67 CIC-IDS2017 features verified, unknown headers rejected).
- [x] Uploaded files processed safely via streaming parser (`csv-parse`) in bounded chunks without disk write or execution risks.
- [x] CSV export sanitizes formulas (prepends single quote `'` to cells starting with `=`, `+`, `-`, `@` via `sanitizeCsvCell`).
- [x] Export endpoint row limit capped (5,000 records) to prevent unbounded memory usage.
- [x] Role-based IP address masking applied to both JSON incident responses and CSV export rows.

### Machine Learning Microservice Security
- [x] Internal API key protection via `X-API-Key` header with constant-time string comparison (`hmac.compare_digest`).
- [x] Strict Pydantic input validation for features with extra fields forbidden (`ConfigDict(extra="forbid")`).
- [x] Maximum batch size limits enforced (`MAX_BATCH_SIZE`).
- [x] Model artifacts loaded strictly from static paths, never dynamic user input.
- [x] Node.js `MLClient` resilient retry with exponential backoff for cold starts (3 attempts, 10s timeout).
- [x] Safe 503 fallback handling (`ServiceUnavailableError`) with zero credential or internal URL leakage.

### Frontend Security
- [ ] Zero usage of `dangerouslySetInnerHTML`.
- [ ] Content escaped by React JSX compiler by default.
- [ ] Tokens and credentials never exposed in URL query parameters.
- [ ] Content Security Policy (CSP) and security headers configured for web deployment.
