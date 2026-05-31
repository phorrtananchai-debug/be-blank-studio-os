# HANDOFF - BE BLANK OS Migration Foundation (Step 2)

## What changed in this step

### 1) Adapter-backed selector binding (read-only, additive)
- Bound Corebase selectors into project workspace read paths as fallback data sources:
  - `/src/components/dashboard/ProjectWorkspace.jsx`
  - Uses:
    - `getWorkScope(projectId)`
    - `getDocuments(projectId)`
    - `getArtwork(projectId)`
- Legacy data paths remain intact and primary.
- Selector output is used only when local project arrays are empty.

### 2) Route alias hardening
- Internal alias coverage retained and verified in `/src/App.jsx`:
  - `/projects`
  - `/projects/karun-phuket`
  - `/timeline`
  - `/artwork`
  - `/documents`
  - `/work-queue`
  - `/journal` (redirects to internal `/os/content`)
  - `/site-watch`
  - `/gallery`
  - `/settings`
- Public landing and public portfolio routes remain unchanged.

### 3) Overlay contract attached to real triggers
- Overlay host and context-driven runtime added:
  - `/src/overlays/OverlayHost.jsx`
  - `/src/overlays/overlayContract.js`
  - `/src/overlays/OverlayContext.js`
  - `/src/overlays/OverlayProvider.jsx`
  - `/src/overlays/useOverlayContract.js`
- Trigger attachments:
  - New Project button -> `new_project_modal` (`ProjectDashboard`)
  - Filter button -> `filter_drawer` (`ProjectDashboard`)
  - Project delete actions -> `confirmation_dialog` (`ProjectDashboard`, `ProjectWorkspace`)
  - Task row click -> `task_detail_drawer` (`ProjectWorkspace` task panel)
  - Document row click -> `document_revision_drawer` (`ProjectWorkspace` document panel)
  - Artwork card click -> `artwork_preview_modal` (`BoardGallery`)
- Command Palette remains unchanged for global search behavior.

### 4) Tests updated
- Smoke route coverage expanded for aliases:
  - `/projects`, `/projects/karun-phuket`, `/timeline`, `/artwork`, `/work-queue`, `/journal`, `/documents`, `/site-watch`, `/gallery`, `/settings`
- Overlay smoke checks added for open/close baseline behavior.
- Naming/placeholder smoke checks added for banned naming and placeholder text on key routes.
- File: `/tests/smoke.spec.js`

## Validation
- `npm run build`: pass
- `npm run lint`: pass
- `npm run test:smoke`: pass

## Remaining limitations
- Overlay views are scaffold-level UX (contract and payload routing), not full production drawer/modal feature parity yet.
- Document/task/artwork overlay checks are data-dependent; when no project rows exist, deep interaction checks are skipped safely in smoke tests.
- Selector read-path integration is intentionally conservative and localized to workspace fallback reads only.
- Live Google adapters (Sheets/Calendar/Drive) are still not connected.

---

## Overlay Contract Hardening (Step 3)

### Overlay contract status
- Standardized payload builders added at:
  - `/src/overlays/overlayPayloads.js`
- Hardened payload metadata now includes stable fields where applicable:
  - `id`
  - `title`/`name`
  - `projectId`
  - `status`
  - `source`
  - `updatedAt`/revision metadata
- `window.confirm` recovery flow was replaced by contract-based `confirmation_dialog` for AI snapshot restore in:
  - `/src/pages/StudioOSApp.jsx`

### Deterministic fixture behavior
- Deterministic fallback rows now guaranteed for smoke overlay paths:
  - Work queue tasks fallback in `/src/components/studio-os/DedicatedSurfaces.jsx`
  - Documents fallback in `/src/components/studio-os/DedicatedSurfaces.jsx`
  - Selector-level deterministic fallback support in `/src/corebase/google/selectors.ts` for:
    - work scope
    - documents
    - artwork
- Existing localStorage/backup compatibility remains preserved.

### Smoke test hardening
- `/tests/smoke.spec.js` overlay assertions are now stricter and deterministic:
  - Asserts overlay title visibility
  - Asserts payload metadata content appears (`ID`, `Status/Revision`, `Source`)
  - Asserts close action hides overlay
  - Removes tolerant confirmation fallback in the main destructive flow path

### Validation
- `npm run build`: pass
- `npm run lint`: pass
- `npm run test:smoke`: pass (14/14)

### Remaining limitations
- Overlay payload schemas are hardened for core surfaces, but not yet uniformly expanded for every legacy interaction path outside the targeted contract routes.
- Live Google adapters remain intentionally mocked and disconnected.

### Next recommended PR scope
- Normalize remaining non-targeted overlay openers onto shared payload builders.
- Add dedicated unit tests for overlay payload builder functions.
- Tighten any remaining destructive-action entry paths to always include deterministic metadata coverage.

---

## Google Corebase Read-only MVP Foundation (Step 4)

### What was implemented
- Provider mode config added:
  - `/src/corebase/google/providerConfig.js`
  - Modes:
    - `mock` (default)
    - `google-readonly` (only when `VITE_GOOGLE_COREBASE_ENDPOINT` is set)
- Read-only adapter added:
  - `/src/corebase/google/googleReadonlyAdapter.js`
  - Safe fetch wrapper with timeout + JSON guards + error mapping.
  - No write methods and no credentials in code.
- Google row normalization added:
  - `/src/corebase/google/googleRowMappers.js`
  - Handles optional/missing fields, alias mapping, booleans, numeric parsing, and safe status normalization.
- Provider-aware selectors extended:
  - `/src/corebase/google/selectors.ts`
  - Read order:
    1. `google-readonly` (when configured and successful)
    2. mock adapter fallback
    3. legacy fallback where already used
- Internal surfaces wired additively with selector output:
  - `/src/pages/StudioOSApp.jsx`
  - `/src/components/studio-os/StudioOSWorkspaceContent.jsx`
  - `/src/components/studio-os/DedicatedSurfaces.jsx`
  - Settings now shows Corebase mode/status (read-only badge and sync/error metadata).

### New documentation and templates
- `/GOOGLE_COREBASE_READONLY_MVP.md`
- `/GOOGLE_APPS_SCRIPT_ENDPOINT_CONTRACT.md`
- `/docs/google-corebase-templates/00_ProjectMaster.csv`
- `/docs/google-corebase-templates/01_WorkScope.csv`
- `/docs/google-corebase-templates/02_DecisionLog.csv`
- `/docs/google-corebase-templates/03_CostDiff.csv`
- `/docs/google-corebase-templates/04_AlertLog.csv`
- `/docs/google-corebase-templates/05_Documents.csv`
- `/docs/google-corebase-templates/06_Images.csv`
- `/docs/google-corebase-templates/09_CalendarMirror.csv`

### How to configure read-only endpoint later
- Set `VITE_GOOGLE_COREBASE_ENDPOINT` in local env.
- If unset, app remains in `mock` mode and keeps current local/mock behavior.
- No OAuth/backend secret handling is included in this phase.

### Validation (Step 4)
- `npm run build`: pass
- `npm run lint`: pass
- `npm run test`: pass
- `npm run test:smoke`: pass

### Risks and limitations
- `google-readonly` currently assumes GET-only Apps Script response contract; no auth flow in this phase.
- Row mappers normalize unknown values safely, so malformed upstream rows may be tolerated but downgraded to defaults.
- Write-back actions are intentionally out of scope.

### Next recommended PR scope
- Add authenticated Apps Script or service gateway strategy (still read-only first).
- Add retry/backoff and explicit stale-data indicator for repeated endpoint errors.
- Add project-level read-status diagnostics per surface.

---

## Google Read-only Auth Hardening (Step 5)

### What was implemented
- Environment guidance updated:
  - `/.env.example`
  - Adds `VITE_GOOGLE_COREBASE_ENDPOINT` with safety comments:
    - keep blank for mock mode
    - use Apps Script Web App URL for `google-readonly`
    - do not commit sensitive endpoint values

- Diagnostics utility added:
  - `/src/corebase/google/googleReadonlyDiagnostics.js`
  - Reports:
    - provider mode
    - endpoint configured yes/no
    - endpoint host only (sanitized)
    - last sync timestamp
    - last error code
    - retryable + suggested retry ms
    - stale flag
    - fallback source

- Read-only adapter error metadata hardened:
  - `/src/corebase/google/googleReadonlyAdapter.js`
  - Stable retry metadata now included in mapped errors:
    - `retryable`
    - `suggestedRetryMs`
  - Guard coverage remains:
    - timeout
    - JSON parse guard
    - `response.ok` guard
    - known error code mapping

- Selector stale fallback state exposed:
  - `/src/corebase/google/selectors.ts`
  - When `google-readonly` fails and mock fallback is used:
    - `mode: google-readonly`
    - `fallback: mock`
    - `stale: true`
    - `lastErrorCode` populated safely

- Settings surface status visibility expanded without redesign:
  - `/src/components/studio-os/DedicatedSurfaces.jsx`
  - Shows endpoint host, fallback, stale, retryability, retry hint.

### Apps Script sample and deployment docs
- Sample endpoint:
  - `/docs/google-corebase-apps-script/readonly-doGet.sample.js`
  - Uses placeholder spreadsheet ID:
    - `YOUR_SPREADSHEET_ID_HERE`
  - Supports resources:
    - `projects`, `workscope`, `documents`, `images`, `calendar`, `alerts`, `all`
- Deployment guide:
  - `/GOOGLE_APPS_SCRIPT_READONLY_DEPLOYMENT.md`
  - Covers CSV import, Apps Script setup, deployment, endpoint testing, env config, and safety notes.

### Validation (Step 5)
- `npm run build`: pass
- `npm run lint`: pass
- `npm run test`: pass
- `npm run test:smoke`: pass

### Remaining limitations
- No OAuth flow in this phase.
- No write-back in this phase.
- No production credential handling in-repo.
- Endpoint protection policy is still deployment-time responsibility (documented, not automated here).

### Next recommended PR scope
- Add optional request header/token strategy for read-only endpoint access (without OAuth).
- Add non-intrusive user-facing stale data hints per internal surface.
- Add endpoint health probe command in Settings diagnostics panel (manual trigger only, no polling).
