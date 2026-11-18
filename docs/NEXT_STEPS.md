# NEXT STEPS

## Current Goal: Phase 4 - Authentication & Role-Based Access Control (RBAC) in `server/`

Phases 0, 0.5, 1, 2, and 3 are verified and completed. The Express server foundation is running with database management, security middleware, error envelopes, and automated tests.

### Phase 4 Checklist
- [ ] User Model (`server/src/models/User.js`):
  - Mongoose schema: `email` (unique, lowercase, indexed), `password` (hashed), `role` (`Viewer`, `Analyst`, `Admin` default `Viewer`), `name`, `createdAt`, `updatedAt`.
  - Passwords hashed with `bcrypt` (work factor >= 12) via pre-save hook.
  - Instance method `comparePassword(candidate)`.
  - Ensure password field is omitted from JSON serialization.
- [ ] JWT Utilities (`server/src/utils/jwt.js`):
  - `signToken(payload)` using `env.JWT_SECRET` and algorithm `HS256`.
  - `verifyToken(token)` with expiration and signature validation.
- [ ] Authentication Middleware (`server/src/middlewares/auth.js`):
  - `requireAuth`: extracts Bearer token, verifies JWT, loads active user, attaches `req.user`.
  - `requireRole(...allowedRoles)`: server-side role validation throwing `ForbiddenError`.
- [ ] Authentication Controller & Routes (`server/src/controllers/authController.js`, `server/src/routes/auth.js`):
  - `POST /api/v1/auth/register`: Public registration (assigns `Viewer` role only; rejects attempts to specify higher roles).
  - `POST /api/v1/auth/login`: Authenticates credentials with generic error messages (prevents user enumeration).
  - `GET /api/v1/auth/me`: Authenticated profile endpoint.
  - Apply strict rate limiting (`authLimiter`) to login and register routes.
- [ ] System Admin Seed Script (`server/src/scripts/seedAdmin.js`):
  - Command-line script creating or updating the initial system Admin using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`.
- [ ] Integration Tests (`server/tests/auth.test.js`):
  - Test registration sets `Viewer` role.
  - Test login succeeds with valid password and fails with invalid password or email.
  - Test protected routes reject unauthenticated requests (401).
  - Test role authorization permits Analyst/Admin and rejects Viewer (403).
  - Test admin seed script executes idempotently.
- [ ] Verify with `npm run lint` and `npm test`.

### Open Questions
- None.

### Known Issues
- None tracked.
