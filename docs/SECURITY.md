# Security Implementation Checklist

The following controls are enforced throughout design, development, and deployment:

### Configuration & Secrets Management
- [ ] Secrets provided solely through environment variables (`.env`).
- [ ] No production credentials or secrets committed to repository.
- [ ] `.env.example` maintained with comprehensive documentation and safe dummy values.
- [ ] Environment variables validated on service boot (fail-fast behavior).

### Authentication & Authorization
- [ ] Passwords hashed with bcrypt (work factor >= 12).
- [ ] Public registration restricted strictly to minimum role (`Viewer`).
- [ ] System administrative user seeded exclusively via command-line script and env variables.
- [ ] JWT tokens configured with short expiration and verified against strong secrets.
- [ ] Cryptographic algorithm explicitly pinned (`HS256`).
- [ ] Server-side role-based access control (RBAC) enforced on protected endpoints.
- [ ] Generic error responses on authentication failure to prevent user enumeration.

### Network, Headers & Rate Limiting
- [ ] Security headers applied via `helmet`.
- [ ] Strict CORS origin allowlist configured from environment.
- [ ] `x-powered-by` header disabled.
- [ ] Global and sensitive-endpoint rate limiting configured (login, registration, upload).
- [ ] JSON body parser payload size limited.
- [ ] Production stack traces suppressed from client responses.

### Input Validation & Data Sanitization
- [ ] Strict schema validation via Zod on query parameters, route params, and request bodies.
- [ ] Unknown and excess properties stripped/rejected.
- [ ] NoSQL injection defenses implemented (prohibit keys starting with `$` or containing `.`).
- [ ] Raw request payloads never passed unsanitized to database queries.
- [ ] IP addresses masked in responses for non-admin viewers.

### File Ingestion & Export Safety
- [ ] Dataset upload accepts CSV format only with extension and MIME-type validation.
- [ ] Maximum file size and row count strictly enforced.
- [ ] CSV header names validated against strict whitelist.
- [ ] Uploaded files processed safely without filesystem execution risks.
- [ ] CSV export sanitizes formulas (prepends single quote `'` to cells starting with `=`, `+`, `-`, `@`).

### Machine Learning Microservice Security
- [ ] Internal API key protection via `X-API-Key` header with constant-time string comparison.
- [ ] Strict Pydantic input validation for features.
- [ ] Maximum batch size limits enforced.
- [ ] Model artifacts loaded strictly from static paths, never dynamic user input.

### Frontend Security
- [ ] Zero usage of `dangerouslySetInnerHTML`.
- [ ] Content escaped by React JSX compiler by default.
- [ ] Tokens and credentials never exposed in URL query parameters.
- [ ] Content Security Policy (CSP) and security headers configured for web deployment.
