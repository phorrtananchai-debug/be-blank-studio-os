# Studio OS Upgrade QA (PR 8)

Date: 2026-05-23

Scope verified:

- PR 1.5 workspace consolidation
- PR 2 timeline / critical path
- PR 3 client projection layer
- PR 4 site visits / issues
- PR 5 material approvals
- PR 6 billing milestones
- PR 7 motion/editorial polish

## Pass/Fail Checklist

- [x] Build passes (`npm run build`)
- [x] Smoke tests pass (`npm run test:smoke`, 8/8)
- [ ] Lint clean (`npm run lint`)  
      Fails due pre-existing lint errors in sibling folders and baseline workspace files (details below)
- [x] Route smoke: `/os/projects`, `/os/timeline`, `/m` covered by smoke tests
- [x] ProjectWorkspace surfaces present and wired:
  - [x] Overview
  - [x] Timeline
  - [x] Notes & Logs
  - [x] Materials
  - [x] Presentation / Client View
- [x] Legacy compatibility checks:
  - [x] project without `siteLogs` handled
  - [x] legacy string `issues` normalized safely
  - [x] project without `materialApprovals` handled
  - [x] project without `billingMilestones` handled
- [x] Client View leak safety validated:
  - [x] internal blockers hidden
  - [x] private/internal notes hidden by default
  - [x] AI history hidden
  - [x] cost/profit/margin internals hidden
  - [x] internal site issues hidden
  - [x] internal materials hidden
  - [x] internal billing milestones hidden
- [x] Client-visible content projection validated:
  - [x] `client_visible` site issue appears
  - [x] `client_visible` material appears
  - [x] `client_visible` billing milestone appears
- [x] No accidental new route introduced (routing remains `/os/*` + `/m` pattern)
- [x] No accidental new Firestore collection introduced for this upgrade
- [x] No new dependencies added (`package.json` unchanged for deps/devDeps)

## Verification Notes

1. Build
   - Result: Pass
   - Command: `npm run build`

2. Route and interaction smoke
   - Result: Pass
   - Command: `npm run test:smoke`
   - Summary: 8 passed; includes direct route loads and mobile shell check.

3. Legacy/data safety projection checks
   - Result: Pass
   - Method: executed local node validation script using:
     - `createClientProjectProjection`
     - `normalizeSiteVisits`
     - `normalizeMaterialApprovals`
     - `normalizeBillingMilestones`
   - Confirmed:
     - legacy string issues preserved and normalized
     - missing arrays map to empty UI-safe arrays
     - internal fields not present in client projection
     - `client_visible` records projected correctly

4. Data model / route / collection safety
   - Result: Pass
   - Checked:
     - no new route registrations for this upgrade scope
     - no new standalone project collection for site visits/materials/billing
     - existing project-centric update flow preserved

## Known Non-Blocking Warnings

1. Build chunk-size warnings (Vite)
   - Some bundles exceed 500 kB after minification.
   - Current status: non-blocking for this PR sequence.
   - Suggested follow-up: optional code-splitting/manualChunks pass.

2. Lint is not currently clean at workspace root
   - `npm run lint` fails due:
     - pre-existing lint issues in sibling folders (`aequitas-thai-nav`, `ai-trading-dashboard`)
     - baseline project lint issues unrelated to PR 1.5-7 scope
   - Current status: non-blocking for Studio OS upgrade logic, but should be addressed before strict CI gating.

## Recommended Next Phase

PR 9 (stabilization hardening):

- Isolate lint scope to this app directory (or fix root lint configuration boundaries).
- Add focused Playwright coverage for:
  - Client View data-leak assertions
  - Notes/Materials/Billing create-edit-delete flows in ProjectWorkspace
- Optional performance pass for chunk splitting (no visual changes).

## PR 9 Results (2026-05-23)

Implemented stabilization hardening follow-ups without feature additions or data-model changes.

### 1) Lint scope isolation

- Updated lint scope to Studio OS app paths only:
  - `src`
  - `tests`
  - `scripts`
  - `server`
  - `playwright.config.js`
  - `vite.config.mjs`
- Excluded sibling folders from lint:
  - `aequitas-thai-nav/**`
  - `ai-trading-dashboard/**`
- Added ESLint overrides for Node/test contexts (`tests`, Vite/Playwright config, scripts, server).
- Result: `npm run lint` passes.

### 2) Focused smoke coverage additions

Extended `tests/smoke.spec.js` with Studio upgrade hardening coverage:

- Client View leak assertion smoke:
  - writes internal-only markers into blockers/notes/material/billing surfaces
  - verifies these markers do not appear in Client View
- ProjectWorkspace create/edit smoke:
  - Site Visit add + edit
  - Material approval add + edit
  - Billing milestone add + edit

Result:

- `npm run test:smoke` passes (10/10).

### 3) Vite chunk-size warning review

- Added safe `manualChunks` splitting for:
  - Firebase (`vendor-firebase`)
  - Export-heavy libs (`vendor-export`, html2canvas/jspdf)
- No UX behavior changes introduced.
- Build still reports one non-blocking >500 kB warning for `vendor-export`.

### 4) Validation summary

- `npm run lint`: Pass
- `npm run build`: Pass
- `npm run test:smoke`: Pass
- No new dependencies added
- No new routes/collections introduced
