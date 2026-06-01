# COREBASE_MIGRATION_PLAN

## Phase status
- Phase 1 (mapping foundation): complete
- Phase 2 (safe read-path binding): in progress (this PR step)
- Phase 3 (route + overlay contract hardening): in progress (this PR step)
- Phase 4 (google read-only foundation): in progress (this PR step)
- Phase 5 (read-only auth hardening + diagnostics): in progress (this PR step)
- Phase 6 (apps script read-only usable setup): in progress (this PR step)

## Completed in this step
1. Selector-bound read fallback in project workspace
   - `src/components/dashboard/ProjectWorkspace.jsx`
   - Selectors used:
     - `getWorkScope(projectId)`
     - `getDocuments(projectId)`
     - `getArtwork(projectId)`

2. Route alias hardening
   - `src/App.jsx`
   - Required internal aliases mapped to existing Studio OS surfaces.

3. Overlay contract runtime
   - Added overlay host and hook integration:
     - `src/overlays/OverlayHost.jsx`
     - `src/overlays/overlayContract.js`
     - `src/overlays/OverlayContext.js`
     - `src/overlays/OverlayProvider.jsx`
     - `src/overlays/useOverlayContract.js`
   - Trigger bindings:
     - New Project -> `new_project_modal`
     - Filter action -> `filter_drawer`
     - Delete actions -> `confirmation_dialog`
     - Task row -> `task_detail_drawer`
     - Document row -> `document_revision_drawer`
     - Artwork card -> `artwork_preview_modal`

4. Smoke coverage expansion
   - `tests/smoke.spec.js`
   - Added alias route checks, overlay open/close checks, naming/placeholder checks.

## Recommended next PR scope
1. Promote selector-backed reads from workspace fallback to shared Studio OS page-level data access layer.
2. Normalize document/work-queue/site-watch route surfaces to dedicated tabs/views while preserving current visual style.
3. Connect overlay payloads to richer domain data (revision history, task dependency graph, artwork metadata).
4. Add deterministic fixture mode for smoke tests so overlay interaction checks always run, not only when project rows exist.

## Deferred by design
- No live Google credentials or API wiring yet.
- No backend/auth/database additions.
- No public landing redesign.
- No destructive migration of legacy localStorage/backup schema.

---

## Phase 4 Additions - Google Read-only Foundation

### Implemented
1. Provider configuration
   - `src/corebase/google/providerConfig.js`
   - Default mode remains `mock`.
   - `google-readonly` activates only when `VITE_GOOGLE_COREBASE_ENDPOINT` exists.

2. Read-only adapter boundary
   - `src/corebase/google/googleReadonlyAdapter.js`
   - GET-only reader with timeout, JSON guard, response guard, and known error mapping.

3. Row normalization layer
   - `src/corebase/google/googleRowMappers.js`
   - Maps sheet-like rows to existing Corebase models and preserves safe fallback behavior.

4. Provider-aware selector integration
   - `src/corebase/google/selectors.ts`
   - Prioritized read path:
     1) google-readonly
     2) mock adapter fallback
     3) legacy fallback

5. Additive surface wiring
   - `src/pages/StudioOSApp.jsx`
   - `src/components/studio-os/StudioOSWorkspaceContent.jsx`
   - `src/components/studio-os/DedicatedSurfaces.jsx`
   - Dedicated routes now consume selector-backed read data where safe without removing legacy paths.

6. Read-only docs/templates
   - `GOOGLE_COREBASE_READONLY_MVP.md`
   - `GOOGLE_APPS_SCRIPT_ENDPOINT_CONTRACT.md`
   - `docs/google-corebase-templates/*.csv`

### Remaining before live use
1. Apps Script deployment and endpoint security policy.
2. Deterministic endpoint health/retry UX.
3. Live auth strategy (out of scope for this PR).
4. Write-back contract and conflict strategy (separate PR).

---

## Phase 5 Additions - Read-only Auth Hardening

### Implemented
1. Environment contract hardening
   - `.env.example` includes `VITE_GOOGLE_COREBASE_ENDPOINT` guidance and secret-safety notes.

2. Diagnostics layer
   - `src/corebase/google/googleReadonlyDiagnostics.js`
   - Endpoint privacy-safe host extraction, stale detection, fallback source, retry metadata projection.

3. Error metadata hardening
   - `src/corebase/google/googleReadonlyAdapter.js`
   - Known errors include stable `retryable` and `suggestedRetryMs` hints.

4. Selector status hardening
   - `src/corebase/google/selectors.ts`
   - Explicit stale fallback representation when readonly fetch fails and mock fallback is used.

5. Settings diagnostics surface enrichment
   - `src/components/studio-os/DedicatedSurfaces.jsx`
   - Added status fields while preserving existing visual system.

6. Apps Script delivery artifacts
   - `docs/google-corebase-apps-script/readonly-doGet.sample.js`
   - `GOOGLE_APPS_SCRIPT_READONLY_DEPLOYMENT.md`

7. Test coverage
   - `tests/unit/googleCorebaseReadonly.test.js`
   - Added diagnostics privacy checks, retry metadata checks, stale fallback checks, sample contract token checks.

### Remaining before live use
1. OAuth or alternative authenticated gateway flow (still deferred).
2. Endpoint allowlist and deployment-level access policy hardening.
3. Optional manual connectivity probe action in Settings.
4. Write-back contract (separate future PR only).

---

## Phase 6 Additions - Usable Read-only Setup

### Implemented
1. Quickstart workflow
   - `GOOGLE_COREBASE_QUICKSTART.md`
   - End-to-end user flow for sheet + Apps Script + endpoint + in-app verification.

2. Endpoint verifier utility
   - `src/corebase/google/verifyGoogleReadonlyEndpoint.js`
   - Functions:
     - `verifyEndpointConfigured`
     - `verifyEndpointHealth`
     - `verifyResourceShape`
     - `verifyAllCoreResources`

3. Settings verification action
   - `src/components/studio-os/DedicatedSurfaces.jsx`
   - Added `Verify Google Corebase` action and result panel.
   - Added setup checklist while preserving visual system.

4. Environment helpers
   - `.env.local.example`
   - Clarifies local-only endpoint setup and mock fallback behavior.

5. Apps Script sample hardening
   - `docs/google-corebase-apps-script/readonly-doGet.sample.js`
   - Added richer comments and optional `resource=health`.

6. Template/data completeness for quickstart
   - Added:
     - `docs/google-corebase-templates/07_Team.csv`
     - `docs/google-corebase-templates/08_Settings.csv`

7. Test coverage
   - `tests/unit/googleCorebaseReadonly.test.js`
   - Added verifier/diagnostics checks and sample contract checks.
   - Smoke assertions updated to confirm settings diagnostics visibility remains present.

### Remaining before live use
1. Optional request-level auth token strategy (still no OAuth).
2. Deployment governance for private/internal endpoint sharing policy.
3. Future write-back contract PR (strictly separate scope).

---

## Phase 7 Additions - Karun Phuket Live-control (First Real Sheet-backed Project)

### Implemented
1. Existing-sheet alias mapping (no tab rename)
   - `src/corebase/google/karunPhuketSheetMap.js`
   - Maps current Karun tabs/columns into Corebase-compatible shapes.

2. Karun live-control adapter (safe write patch)
   - `src/corebase/google/karunLiveControlAdapter.js`
   - Supports read resources:
     - `karun_dashboard`, `karun_workscope`, `karun_materials`, `karun_costdiff`, `karun_decisions`, `karun_alerts`, `karun_all`
   - Supports write actions:
     - `update_workscope_item`, `add_workscope_item`, `update_status`, `update_priority`, `update_notes`, `acknowledge_alert`
   - Blocks:
     - delete
     - bulk overwrite

3. Provider mode extension
   - `src/corebase/google/providerConfig.js`
   - Adds `karun-live-control` mode.
   - Default remains `mock` if endpoint is missing.

4. Karun-first UI integration
   - `src/components/dashboard/ProjectWorkspace.jsx`
   - `src/components/studio-os/DedicatedSurfaces.jsx`
   - `src/components/studio-os/StudioOSWorkspaceContent.jsx`
   - `src/pages/StudioOSApp.jsx`
   - Enables scoped edit/add for Karun WorkScope fields only.

5. Contract and sample docs
   - `GOOGLE_APPS_SCRIPT_KARUN_LIVE_CONTROL_CONTRACT.md`
   - `docs/google-corebase-apps-script/karun-live-control.sample.js`

### Remaining before wider rollout
1. Add production-grade conflict/version checks for concurrent edits.
2. Add per-action audit logging and user identity policy.
3. Expand write scope from Karun-only to multi-project after guardrails are validated.
4. Keep alert webhook secrets in Script Properties (never source).
5. Keep OAuth/backend/write-back outside this phase.
