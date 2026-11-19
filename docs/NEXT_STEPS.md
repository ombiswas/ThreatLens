# NEXT STEPS

## Current Goal: Phase 9 - SOC Dashboard & Incident Triage UI in `client/`

Phases 0 through 8 are fully verified and completed. The client foundation, routing, authentication state, dark SOC theme tokens (harmonizing Ember Studio craft aesthetics), accessible shared component library, Vercel security headers, and dev server integration against the real seeded API are verified with 28 passing client tests.

### Phase 9 Checklist
- [ ] SOC Telemetry & Real-Time Stats Dashboard (`client/src/features/dashboard/`):
  - Summary KPI cards powered by `GET /api/stats/summary`: Total flows monitored, attack ratio, active incident count, critical threats.
  - Time-series threat activity chart using Recharts (`GET /api/stats/timeline`): Minute/hour buckets with stacked area/line breakdown across DoS/DDoS, PortScan, BruteForce, and average threat score.
  - Multi-faceted distribution donuts/bars (`GET /api/stats/distribution`): Classification breakdown, risk severity distribution, incident triage status.
  - Top attacked/attacking IP tables with role-masked addresses (`GET /api/stats/top-sources`).
  - Real-time live flow feed hook subscribing to Socket.IO `incident:new` and appending latest incidents with flash animations.
- [ ] Incident Triage & Forensics Management (`client/src/features/incidents/`):
  - Paginated, filterable incident data table (`GET /api/incidents`): Filter by risk level (Critical, High, Medium, Low), ML class, and status (New, Under Review, Resolved).
  - Search and sortable columns (detected timestamp, threat score, attack class, source/destination IP, protocol).
  - Incident Detail Modal: Full 67-feature inspection, transparent threat score breakdown (base class severity weight + confidence factor = total score), ML vs Heuristic baseline comparison, and analyst investigation notes history.
  - Incident Status Transition controls (`PATCH /api/incidents/:id/status`): Validated state transitions (`New` -> `Under Review` -> `Resolved`) restricted to Analyst and Admin roles.
  - Investigation Note creation (`POST /api/incidents/:id/notes`): Length-limited note submission with analyst attribution.
  - Formula-injection-safe CSV Export button (`GET /api/incidents/export`).
- [ ] Real-time Interactive Flow Detection Playground (`client/src/features/dashboard/DetectPage.jsx`):
  - Single flow feature inspection form with presets (e.g. sample DoS flow, PortScan flow, Benign flow from `demo_flows.csv`).
  - Submission to `POST /api/detect` with real-time classification response, transparent 0-100 score visualizer, and baseline heuristic comparison.
- [ ] Verification:
  - Run `npm run lint`, `npm run format`, `npm test`, and `npm run build` in `client/`.
  - Verify real Socket.IO live flow emissions and status transition persistence against the live server.

### Open Questions
- None.

### Known Issues
- None tracked.
