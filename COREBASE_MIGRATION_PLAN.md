# COREBASE_MIGRATION_PLAN

## Phase status
- Phase 1 (mapping foundation): complete
- Phase 2 (safe read-path binding): in progress (this PR step)
- Phase 3 (route + overlay contract hardening): in progress (this PR step)
- Phase 4 (google read-only foundation): in progress (this PR step)

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
