# NEXT STEPS

## Current Goal: Phase 8 - Client Foundation & UI Shell in `client/`

Phases 0 through 7 are verified and completed. The entire backend foundation, offline training, inference microservice, detection engine, incident store, streaming dataset parser, Socket.IO telemetry, replay engine, stats aggregations, comparative evaluation, and in-app alerting are fully operational and verified with 100 passing tests.

### Phase 8 Checklist
- [ ] Client Architecture & Routing (`client/src/`):
  - React Router configuration with public routes (`/login`, `/register`), protected routes, and role-guarded routes (`admin` only).
  - Clean feature-based organization: `src/features/{auth,dashboard,incidents,datasets,evaluation,admin}`, `src/components`, `src/hooks`, `src/services`, `src/utils`.
- [ ] Authentication Context & State (`client/src/features/auth/`):
  - In-memory JWT access token management.
  - Automatic session restoration via `GET /api/auth/me`.
  - Login, register, and logout flows with client-side token discard and redirect handling.
  - Role-based route guards (`RequireAuth`, `RequireRole`).
- [ ] Dark SOC UI Shell & Layout (`client/src/components/layout/`):
  - Persistent Dark SOC theme using Tailwind CSS (slate/zinc palette with cyan/emerald telemetry accents and amber/rose threat badges).
  - Navigation sidebar with active state styling and role-aware navigation links (Dashboard, Live Incidents, Datasets & Replay, ML vs Baseline Evaluation, Admin Users).
  - Top header with system health pill, active socket connection status badge, live notification drawer/dropdown, and user profile/logout menu.
- [ ] Socket.IO Client Integration (`client/src/services/socket.js`, `client/src/hooks/useSocket.js`):
  - Authenticated Socket.IO connection manager using in-memory JWT in handshake auth.
  - Automatic reconnection, clean disconnect on logout, and event subscription hooks.
  - Global real-time audio/visual alert trigger for `notification:new` and `incident:new`.
- [ ] API Client & Error Handling (`client/src/services/api.js`):
  - Axios or native fetch wrapper injecting `Authorization: Bearer <token>`.
  - Automatic 401 handling (clears auth state and redirects to login).
  - Standardized error extraction matching `{ error: { code, message, details } }`.
- [ ] Verification:
  - Run linting (`npm run lint`), format check, and production build (`npm run build`).
  - Verify responsive UI layout in browser and test authenticated navigation flow.

### Open Questions
- None.

### Known Issues
- None tracked.
