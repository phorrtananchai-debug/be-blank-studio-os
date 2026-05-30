# HANDOFF - BE BLANK OS Migration Foundation

## Validation
- `npm install`: pass
- `npm run build`: pass
- `npm run lint`: pass
- `npm run test:smoke`: pass

## New migration foundation files
- Mapper: `/src/corebase/google/legacyToCorebase.ts`
- Selectors: `/src/corebase/google/selectors.ts`
- Expanded domain models: `/src/corebase/google/models.ts`

## Stable project ID strategy
Canonical IDs introduced in mapper:
- `KARUN-PHUKET-OLDTOWN`
- `KARUN-CENTRAL-KHONKAEN`
- `AVERY-GAYSORN-AMARIN`
- `ULTIMATE-BKK`

Legacy aliases supported:
- `karun-phuket`
- `karun-phuket-oldtown`
- plus per-project legacy slug aliases derived by mapper.

## Route aliases added (no visual redesign)
In `/src/App.jsx`:
- `/projects` -> internal projects view (`/os/projects` behavior)
- `/projects/karun-phuket` -> internal projects workspace target
- `/timeline` -> `/os/timeline` behavior
- `/artwork` -> `/os/artwork` behavior
- `/documents` -> nearest document-capable internal view (`/os/projects`)
- `/work-queue` -> nearest queue-capable internal view (`/os`)
- `/journal` -> internal journal/content view (`/os/content`)
- `/site-watch` -> nearest site/log-capable view (`/os/projects`)
- `/gallery` -> `/os/portfolio` behavior
- `/settings` -> internal non-public system view surface (`/os/projects`)

## Overlay scaffold status
Centralized overlay contract scaffold added (state only, minimal/no redesign):
- `/src/overlays/overlayContract.js`
- `/src/overlays/OverlayContext.js`
- `/src/overlays/OverlayProvider.jsx`
- `/src/overlays/useOverlayContract.js`

Defined contract keys:
- `new_project_modal`
- `task_detail_drawer`
- `document_revision_drawer`
- `artwork_preview_modal`
- `filter_drawer`
- `confirmation_dialog`

Command Palette remains unchanged and active for global search behavior.

## What remains for live Google integration
- Keep adapter interface stable and add live adapter implementations (Sheets/Calendar/Drive) behind provider switch.
- Add read/write sync strategy and conflict handling.
- Add credential flow and secure runtime only in a dedicated integration PR (not this foundation PR).

## Notes
- Legacy backup/localStorage support was preserved.
- Public landing/portfolio pages were preserved.
