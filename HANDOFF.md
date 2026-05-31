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
