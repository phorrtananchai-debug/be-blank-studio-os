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
