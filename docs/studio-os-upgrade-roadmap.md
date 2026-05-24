# Be Blank Studio OS Upgrade Roadmap

Status: repository audit and implementation plan only. No UI or schema changes are included in this PR.

## Product Guardrails

Be Blank Studio OS should remain an architecture and interiors studio operating system with an editorial public archive. New work must preserve the current direction:

- architectural editorial archive
- calm operational workspace
- cinematic portfolio system
- spatial studio OS
- procurement and delivery intelligence layer
- local-first philosophy with manual export/import and recovery
- no realtime autosave loops beyond the existing explicit Firestore subscriptions

The upgrade should not turn the product into a SaaS dashboard, Notion clone, Linear clone, Airtable clone, generic PM tool, or accounting system.

## Repository Map

The active Be Blank app is the root Vite/React app:

- `src/App.jsx`: top-level lazy routes for public archive, Studio OS, and mobile OS.
- `src/pages/StudioOSApp.jsx`: authenticated desktop Studio OS orchestration, Firebase writes, export/import, AI analysis import, backup restore, command palette, quick capture.
- `src/pages/PublicHomepage.jsx`: public editorial archive, homepage/work/journal/about routes, public layout editor for signed-in users.
- `src/pages/PortfolioDetailPage.jsx`: public project detail and lightbox.
- `src/pages/MobileStudioApp.jsx`, `src/pages/MobileDashboard.jsx`: mobile authenticated OS shell.
- `src/components/studio-os/*`: desktop shell, toolbar, navigation, workspace tab routing.
- `src/components/dashboard/*`: operational dashboards, project workspace, timeline, critical path, portfolio manager, presentation overlay.
- `src/components/artwork/*`: spatial board/artwork workspace.
- `src/hooks/*`: auth, Firebase subscriptions, local storage, operational tasks, portfolio items, artwork board.
- `src/services/firebase.js`: Firebase Auth, Firestore collection helpers, Storage upload helpers.
- `src/services/firebaseProjects.js`: project-specific Firestore subscription and CRUD helpers.
- `src/services/storage.js`, `src/services/api.js`, `server/index.js`: local storage and local API fallback surface.
- `src/utils/*`: timeline, critical path, operational tasks, intelligence export/import, weekly review, backup validation, portfolio image utilities, financial calculations.
- `docs/firestore-schema.md`: current documented Firestore shape.
- `firestore.rules`: current allowed Firestore collections.

Repo hygiene note: `aequitas-thai-nav/` and `ai-trading-dashboard/` are unrelated sibling project directories currently untracked in this workspace. They should not be treated as part of Be Blank Studio OS upgrade scope.

## Current Feature Inventory

### Routing and Surfaces

- Public archive routes exist: `/`, `/about`, `/journal`, `/work`, `/portfolio`, `/portfolio/:portfolioId`.
- Desktop Studio OS exists at `/dashboard` and `/os/*`.
- Mobile OS exists at `/m`.
- Studio OS tabs are currently `flow`, `projects`, `artwork`, `timeline`, `content`, `portfolio`.

### Project Workspace

Project workspace already exists in `ProjectWorkspace` with tabs for overview, timeline, artwork space, notes/logs, assets, deliverables, presentation, and AI insights.

Reuse this as the primary place for project-level upgrades. Do not create a second project workspace.

Known overlaps:

- `ProjectWorkspace` is the active project detail experience.
- `ProjectDashboard.jsx` also contains an older `ProjectDetailView` with site logs, financials, and field reports. This appears superseded and should not be extended unless intentionally revived or removed in a cleanup PR.

### Timeline and Critical Path

Existing modules:

- `src/utils/dashboard.js` has `calculateTimeline(project)`.
- `src/utils/timeline.js` has `getTimelinePhases(project, timeline)`.
- `src/utils/criticalPath.js` defines the critical path schema, statuses, risk levels, milestone templates, dependency normalization, and merge helpers.
- `TimelineCalculator` provides all-project schedule overview/detail.
- `CriticalPathPanel` provides per-project dependency chain editing.
- `EditorialLayoutDashboard` also renders an operational timeline summary in the daily flow surface.

Current milestone chain:

1. Design Freeze
2. BOQ Approval
3. Contractor Lock
4. Procurement Start
5. Site Handover
6. Construction Start
7. Store Ready
8. Opening

This already covers dependency logic and procurement/construction anchors. PR 2 should upgrade this visual layer rather than introduce a separate Gantt module.

Gap:

- The timeline does not yet visually separate Design, Procurement, Construction, Client Review, Risk, and Dependencies in a cinematic Gantt layout.
- Client Review is not a first-class timeline phase, except in demo data.

### Portfolio and Media Manager

Existing modules:

- `PortfolioManager` handles portfolio CMS records, cover upload, gallery upload/order, captions, alt text, preview modal, URL fallbacks, and public homepage editor handoff.
- `PublicHomepage` renders the editorial archive and contains desktop-only signed-in layout editing.
- `PortfolioDetailPage` renders client/public-facing project detail pages and image lightbox.
- `portfolioImages.js` normalizes cover/gallery image metadata.

Reuse this media model for material/FF&E approval imagery. Do not create an unrelated media manager.

Gap:

- No explicit material/furniture/FF&E approval schema exists.
- Portfolio items are public-facing case studies; material approvals should live on `projects` or a new narrow project subcollection/model, with optional image references using the existing image metadata shape.

### AI Intelligence and Weekly Review

Existing modules:

- `studioIntelligence.js` exports normalized project, portfolio, task, critical path, procurement, handover, site log, and risk data.
- It also defines the AI analysis JSON schema and parser.
- `dataSafety.js` previews safe AI diffs, applies allowed project updates, merges critical path updates, and stores AI import recovery snapshots in local storage.
- `weeklyReview.js` builds weekly project risk, blocked/waiting, critical deadline, pressure change, and recommended focus outputs.
- `StudioOSApp` exposes copy/export/import actions and recovery flows.

Reuse this for upgrade intelligence. Do not add direct LLM calls or background agents in these PRs.

### Procurement and Tasks

Existing task model:

- Collection name: `tasks`.
- Fields include `projectId`, `status`, `priority`, `dueDate`, `owner`, `blockedBy`, `waitingFor`, `dependencies`, `linkedMilestone`, `linkedParty`, `procurementFlag`, `handoverFlag`, and notes.

Existing procurement signals:

- `project.procurementStatus` is supported by intelligence import/export.
- `task.procurementFlag` exists and is surfaced in narrative/intelligence.
- Critical path has `procurementStart`.

Gap:

- There is no structured procurement package, supplier, lead time, room/area, alternative, or approval state model.
- Add material/FF&E approval as an editorial archive inside project data, not as a grid database.

### Site Visits and Issue Logging

Existing project field:

- `project.siteLogs` exists in seed data and project creation defaults.
- Current log shape: `id`, `date`, `notes`, `issues`, `imageLink`.
- `ProjectWorkspace` exposes Site Logs in Notes & Logs.
- `ProjectDashboard.jsx` older `ProjectDetailView` also exposes Field Reports.
- `studioIntelligence.js` exports `siteLogs`.

Gap:

- The requested shape is richer: `title`, `date`, `attendees`, `contractor`, `notes`, `photos`, `issues`, `status`, `assignedTo`, `deadline`.
- Current site logs are nested on project and not mobile-first.
- Issues are currently free text, not typed records linkable to timeline later.

Recommendation:

- Evolve `project.siteLogs` in a backward-compatible way, preserving existing simple logs and normalizing missing fields in UI helpers.
- Add structured `issues` array inside each visit while continuing to tolerate legacy string `issues`.

### Billing and Financials

Existing project financials:

- `calculateProjectFinancials(project)` handles area/rate, manual project value, cost categories, time cost, profit, and margin.
- `ProjectWorkspace` overview includes Studio Financials.
- No invoice/payment milestone schema exists.

Gap:

- No `billingMilestones`, invoice status, due date, or payment status model.

Recommendation:

- Add lightweight `project.billingMilestones` only.
- Do not add tax, ledger, receipts, accounting integrations, line items, payment processing, or invoice PDFs in this upgrade.

### Client/Public Sharing

Existing client/public layers:

- Public portfolio archive and detail routes.
- Public share behavior in `PortfolioDetailPage`.
- Project workspace has an internal `PresentationOverlay`.

Gap:

- No client-safe project view mode exists for active projects.
- Current presentation mode can show internal workspace context depending on active tab.
- No password/share token system exists.

Recommendation:

- PR 3 should create a client-safe view mode inside authenticated Studio OS first.
- It should use a projection/sanitizer function that hides blockers, pressure state, private notes, operational flags, AI history, cost/profit internals, and internal tasks.
- Do not add password/public sharing until a separate security design exists.

### Mobile Field Workflow

Existing mobile:

- `/m` authenticated app with Home, Calendar, Quick Add, Projects, More.
- Mobile quick add parses natural project/date/time text and writes tasks.
- Mobile project views read projects/tasks/notes.

Gaps:

- No mobile-first site visit capture.
- Mobile notes subscribe to `notes`, but `firestore.rules` does not currently allow a `notes` collection.
- Mobile task CRUD writes to `tasks`, but `firestore.rules` does not include `tasks`.
- Mobile falls back to demo mode when data is absent, so missing rules may be hidden until real use.

Recommendation:

- Fix Firestore rules/schema documentation before relying on mobile field workflows.
- Field workflow should capture into the same project/site visit model used by desktop, not a mobile-only data island.

## Duplication and Overlap Risks

- Do not create a second timeline model. Upgrade `criticalPath` and `TimelineCalculator`/`CriticalPathPanel`.
- Do not create a second project detail route. Extend `ProjectWorkspace`.
- Do not create a second media system. Reuse portfolio image metadata and upload helpers.
- Do not create a second task system. Use existing `tasks` and add narrow linking fields only when needed.
- Do not create a second financial engine. Add billing milestones beside current financials.
- Do not create public client portal auth now. Start with authenticated client-safe presentation mode.
- Do not build general procurement database tables. Build project-level material/FF&E approvals.
- Do not build accounting software.
- Do not add realtime autosave loops. Use explicit create/update actions and existing Firestore writes.

## Refactor Recommendations Before Feature Work

1. Document and normalize data models in `docs/firestore-schema.md`.
2. Add missing Firestore rules for current live collections, especially `tasks`; decide whether `notes` is real or demo-only.
3. Create lightweight normalizer utilities for nested project arrays:
   - `siteVisits` / legacy `siteLogs`
   - `materialApprovals`
   - `billingMilestones`
4. Treat `ProjectDashboard.jsx`'s `ProjectDetailView` as dead or legacy code. Either remove later or stop extending it.
5. Keep client-safe display as a sanitized projection of project data, not duplicated project data.

## What Should Not Be Built

- No generic Kanban or issue tracker clone.
- No Airtable-like material database.
- No public password/share system in this phase.
- No payment processing or accounting ledger.
- No always-on background AI/autosave agent.
- No large Gantt dependency package unless the existing CSS/React approach proves insufficient.
- No schema migration that overwrites existing nested project arrays.
- No separate mobile-only site visit collection unless project-level nesting becomes unworkable.

## Recommended Architecture

Keep a project-centric architecture:

```txt
projects/{projectId}
  core project fields
  criticalPath[]
  siteLogs[] or siteVisits[]
  materialApprovals[]
  billingMilestones[]
  intelligenceHistory[]

tasks/{taskId}
  projectId
  linkedMilestone
  linkedSiteVisitId
  linkedIssueId
  procurementFlag
  handoverFlag

portfolioItems/{itemId}
  public archive and media metadata

contentPosts or local contentItems
  editorial/journal content
```

For this repo's current style, nested arrays on `projects` are the safest short-term move. They preserve export/import, AI snapshots, and manual backup behavior. If these arrays grow large later, split them into project subcollections in a dedicated migration PR.

## Jules PR Roadmap

### PR 1.5 - Workspace Consolidation + Overlap Cleanup

Scope:

- Keep `ProjectWorkspace` as the only active project detail/workflow extension surface.
- Keep `ProjectDashboard` focused on project list, filtering, creation, deletion, and opening `ProjectWorkspace`.
- Retain `ProjectDetailView` as legacy inactive code only until a later removal PR.
- Keep `PresentationOverlay` as an internal presentation shell until a client-safe projection exists.
- Add Firestore rules and schema docs for existing `tasks` and `notes` collection usage.
- Consolidate schedule phase definitions in `src/utils/timeline.js`.

Validation:

- No schema-breaking migrations.
- Existing project records still work without `clientReviewDate`, `revisionCompleteDate`, `criticalPath`, `siteLogs`, `tasks`, or `notes`.
- Future project-level modules should extend `ProjectWorkspace` only.

### PR 1 - Repository Audit + Upgrade Plan

Scope:

- Add `docs/studio-os-upgrade-roadmap.md`.
- Include repo map, current feature inventory, duplication risk, reuse/refactor guidance, and PR plan.
- No UI changes.
- No data writes.

Validation:

- Documentation review only.
- Confirm no runtime files changed.

### PR 2 - Cinematic Gantt / Critical Path Timeline UI

Scope:

- Upgrade `src/components/dashboard/TimelineCalculator.jsx`.
- Upgrade `src/components/dashboard/CriticalPathPanel.jsx`.
- Reuse `src/utils/criticalPath.js` and `src/utils/timeline.js`.
- Add helper functions only if needed for phase bands and date scaling.

Design:

- Warm paper background.
- Thin architectural grid.
- Mono metadata.
- Calm milestone markers.
- Restrained risk colors.
- No SaaS dashboard styling.

Capabilities:

- Show Design, Procurement, Construction, Client Review, Risk, Dependencies.
- Preserve existing `criticalPath` data.
- Use backward-compatible defaults for any new milestone/phase metadata.

Avoid:

- New Gantt dependency unless justified.
- Duplicate schedule route.
- Realtime autosave loops.

### PR 3 - Client Presentation Layer Foundation

Scope:

- Add a client-safe project projection utility, for example `src/utils/clientPresentation.js`.
- Add a client-safe mode/view inside `ProjectWorkspace` or `PresentationOverlay`.
- Reuse existing portfolio/media and timeline components where safe.
- Keep the mode authenticated-only; it is a presentation surface, not a public portal.
- Read only whitelisted project fields through the projection layer.

Show:

- Project overview.
- Timeline.
- Visualizations.
- Decisions needed.
- Approved materials.
- Key documents.

Hide:

- Internal pressure.
- Blockers.
- Private notes.
- AI history.
- Profit/cost internals.
- Operational flags.
- Internal task queue.
- Sensitive financial calculations.

Avoid:

- Public password system.
- Token links.
- Separate client project data model.

### PR 4 - Site Visit / Issue Logging Foundation

Scope:

- Evolve project site log model with backward-compatible defaults.
- Add normalizers for legacy `siteLogs`.
- Upgrade `ProjectWorkspace` Notes & Logs into a mobile-first field notebook.
- Add mobile entry point from `/m` Projects or Quick Add if scope remains small.

Suggested shape:

```js
{
  id,
  title,
  date,
  attendees,
  contractor,
  notes,
  photos: [],
  issues: [
    { id, title, notes, status, assignedTo, deadline, linkedMilestone }
  ],
  status,
  assignedTo,
  deadline
}
```

Avoid:

- Separate issue tracker UI.
- Complex assignment permissions.
- Timeline linking beyond storing optional IDs.

### PR 5 - Material / FF&E Approval Workflow

Scope:

- Add `materialApprovals` or `ffeApprovals` on projects.
- Reuse existing image metadata shape where images are needed.
- Add project workspace tab/section with editorial archive presentation.
- Optionally expose approved materials in client-safe presentation.

Fields:

- `id`
- `name`
- `category`
- `roomArea`
- `supplier`
- `leadTime`
- `approvalState`
- `notes`
- `alternatives`
- `images`

Approval states:

- `proposed`
- `waiting_review`
- `approved`
- `rejected`
- `revised`

Avoid:

- Airtable-like dense grid.
- New standalone procurement app.
- Large inventory system.

### PR 6 - Lightweight Billing Milestones

Scope:

- Add `billingMilestones` on projects.
- Add a compact billing section inside existing financial/project workspace.
- Keep it separate from current profit/cost calculations unless clearly needed.

Fields:

- `id`
- `label`
- `amount`
- `dueDate`
- `status`
- `notes`

Statuses:

- `draft`
- `sent`
- `paid`
- `overdue`

Avoid:

- Accounting software.
- Tax rules.
- Invoice PDF generation.
- Payment integrations.

### PR 7 - Motion and Editorial Polish

Scope:

- Add subtle transitions only after PRs 2-6 are stable.
- Apply to timeline reveal, project presentation, field logs, and material archive interactions.

Motion rules:

- Soft fade.
- Slow reveal.
- Calm hover states.
- No flashy animation.
- No motion that obscures field workflow speed.

## Migration and Safety Rules

- New nested arrays must default to `[]`.
- Existing `siteLogs` must continue to render.
- Existing string `issues` values must be preserved.
- Existing `criticalPath` arrays must be merged, not replaced.
- Backups must include new project fields automatically by keeping them inside project records.
- AI import should only write allowed fields through explicit review.
- Firestore rules and docs must be updated whenever a collection becomes real.
- Manual export/import remains the recovery baseline.

## Recommended First Implementation Order

1. Land PR 1 documentation.
2. Update Firestore schema/rules for already-used `tasks` before mobile features depend on them.
3. Build PR 2 timeline UI with no schema break.
4. Build PR 3 client-safe projection before exposing more project internals.
5. Build PR 4 site visit normalizer and UI.
6. Build PR 5 material approvals and reuse image metadata.
7. Build PR 6 billing milestones.
8. Apply PR 7 motion polish after core workflows are tested.

## Implementation Status (2026-05-23)

- PR 1.5 - Workspace Consolidation + Overlap Cleanup: Completed
- PR 2 - Cinematic Gantt / Critical Path Timeline UI: Completed
- PR 3 - Client Presentation Layer Foundation: Completed
- PR 4 - Site Visit / Issue Logging Foundation: Completed
- PR 5 - Material / FF&E Approval Workflow: Completed
- PR 6 - Lightweight Billing Milestones: Completed
- PR 7 - Motion and Editorial Polish: Completed
