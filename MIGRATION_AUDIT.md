# MIGRATION_AUDIT

## Scope
- Audit date: 2026-05-31
- Repository: `be-blank-studio-os`
- Branch/worktree audited: `codex/beblank-os-corebase-adapter`
- Constraints observed: read-only scan of existing code behavior; no migration executed.

## 1) Current app structure

### Public landing / website routes
Defined in [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/App.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/App.jsx)
- `/` -> `PublicHomepage`
- `/about` -> `PublicHomepage`
- `/journal` -> `PublicHomepage` (public behavior, not internal journal workspace)
- `/work` -> `PortfolioPage`
- `/portfolio` -> `PortfolioPage`
- `/portfolio/:portfolioId` -> `PortfolioDetailPage`
- `*` fallback -> `PublicHomepage`

### Internal OS routes
Defined in [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/App.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/App.jsx) and tab-derived in [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/pages/StudioOSApp.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/pages/StudioOSApp.jsx)
- `/dashboard` -> Studio OS shell
- `/os/*` -> Studio OS shell
- `/os` (flow)
- `/os/projects`
- `/os/artwork`
- `/os/artwork/:projectId`
- `/os/timeline`
- `/os/content`
- `/os/portfolio`
- `/m` -> mobile shell

### Existing dashboard / StudioOS files
- Shell orchestration: [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/pages/StudioOSApp.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/pages/StudioOSApp.jsx)
- Tab container: [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/studio-os/StudioOSWorkspaceContent.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/studio-os/StudioOSWorkspaceContent.jsx)
- Dashboard composition: [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/studio-os/EditorialLayoutDashboard.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/studio-os/EditorialLayoutDashboard.jsx)
- Project management: [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/ProjectDashboard.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/ProjectDashboard.jsx)
- Project workspace: [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/ProjectWorkspace.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/ProjectWorkspace.jsx)
- Timeline view: [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/TimelineCalculator.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/TimelineCalculator.jsx)
- Content/journal-like planner: [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/ContentPlanner.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/ContentPlanner.jsx)
- Portfolio/gallery management: [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/PortfolioManager.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/PortfolioManager.jsx)
- Artwork board: [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/artwork/ArtworkSpace.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/artwork/ArtworkSpace.jsx)

### Existing mock data files
- Seed data: [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/data/seed.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/data/seed.js)
- Mobile demo data: [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/pages/mobileDemoData.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/pages/mobileDemoData.js)
- New Corebase mock layer:
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/corebase/google/mockData.ts](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/corebase/google/mockData.ts)
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/corebase/google/mockAdapters.ts](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/corebase/google/mockAdapters.ts)

### Existing utility/computation files (migration-relevant)
- Project/task math and creation: [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/dashboard.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/dashboard.js)
- Task normalization/signals: [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/operationalTasks.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/operationalTasks.js)
- Timeline phases/date ranges: [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/timeline.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/timeline.js)
- Critical path normalization: [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/criticalPath.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/criticalPath.js)
- Backup parse/validate: [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/backupValidation.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/backupValidation.js)
- AI export/import schema tools: [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/studioIntelligence.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/studioIntelligence.js)
- AI safety snapshots: [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/dataSafety.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/dataSafety.js)
- Site visit transforms: [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/siteVisits.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/siteVisits.js)
- Material approvals transforms: [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/materialApprovals.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/materialApprovals.js)
- Billing milestones transforms: [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/billingMilestones.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/billingMilestones.js)

## 2) Legacy data inventory

### Projects
- Source paths:
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/data/seed.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/data/seed.js)
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/services/firebaseProjects.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/services/firebaseProjects.js)
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/dashboard.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/dashboard.js) (`createProject` fields)
- Backing store: Firestore `projects` collection when configured; otherwise empty live subscription with seed used in other domains.

### Tasks
- Source paths:
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/hooks/useOperationalTasks.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/hooks/useOperationalTasks.js)
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/operationalTasks.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/operationalTasks.js)
- Backing store: Firestore `tasks` collection or localStorage key `beBlank.tasks`.

### Timeline / phases
- Source paths:
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/timeline.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/timeline.js)
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/criticalPath.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/criticalPath.js)
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/TimelineCalculator.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/TimelineCalculator.jsx)
- Data lives in project date fields + critical path milestone arrays.

### Journal entries
- Source paths:
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/data/seed.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/data/seed.js) (`initialContentItems`)
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/pages/StudioOSApp.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/pages/StudioOSApp.jsx) (`contentItems` state)
- Backing store: localStorage key `beBlank.content`.

### Documents
- Source paths:
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/ProjectWorkspace.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/ProjectWorkspace.jsx) (`project.documents` rendering)
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/clientPresentation.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/clientPresentation.js)
- Status: project-level document arrays are referenced but not strongly standardized across all create/update flows.

### Artwork / gallery
- Source paths:
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/artwork/ArtworkSpace.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/artwork/ArtworkSpace.jsx)
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/hooks/useArtworkBoard.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/hooks/useArtworkBoard.js)
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/PortfolioManager.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/PortfolioManager.jsx)
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/portfolioImages.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/portfolioImages.js)
- Backing store: Firestore collections (`artwork_board_<projectId>`, `portfolioItems`) with seed fallback.

### Site updates
- Source paths:
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/siteVisits.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/siteVisits.js)
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/ProjectWorkspace.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/ProjectWorkspace.jsx) (`siteLogs` edit flows)
- Stored on each project as `siteLogs`.

### Alerts
- Current alerting is UI-toast based (ephemeral), not persisted alert records.
- Source paths:
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/hooks/useToastMessage.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/hooks/useToastMessage.js)
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/StatusToast.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/StatusToast.jsx)

### Settings
- No dedicated settings module/route in current internal shell.
- Partial user/device settings in mobile helpers:
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/pages/mobileUtils.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/pages/mobileUtils.js) (profile image key)
- Editorial dashboard personalization keys:
  - `beBlank.studioEditorialLayout.v1`
  - `beBlank.studioEditorialNotes.v1`
  - in [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/studio-os/EditorialLayoutDashboard.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/studio-os/EditorialLayoutDashboard.jsx)

### Backup / localStorage data
- Backup export/import schema and preview:
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/pages/StudioOSApp.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/pages/StudioOSApp.jsx)
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/backupValidation.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/backupValidation.js)
- Local keys seen:
  - `beBlank.content`
  - `beBlank.tasks`
  - `beBlank.studioEditorialLayout.v1`
  - `beBlank.studioEditorialNotes.v1`
  - `beBlank.aiImportSnapshots.v1`
  - `studio_mock_user`

## 3) Function inventory (user-facing)

### Dashboard summaries
- Operational summary cards and pressure/risk signals in:
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/studio-os/EditorialLayoutDashboard.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/studio-os/EditorialLayoutDashboard.jsx)
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/DailyFlow.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/DailyFlow.jsx)

### Project workspace behavior
- Search/filter/edit project cards; open detailed workspace in:
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/ProjectDashboard.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/ProjectDashboard.jsx)
- Workspace tabs: overview, timeline, artwork, notes, materials, assets, deliverables, ai in:
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/ProjectWorkspace.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/ProjectWorkspace.jsx)

### Task actions
- Create/infer/update/mark-done tasks in:
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/hooks/useOperationalTasks.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/hooks/useOperationalTasks.js)
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/operationalTasks.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/operationalTasks.js)

### Timeline calculations
- Date-derived phases, critical path pressure, milestone edits in:
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/TimelineCalculator.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/TimelineCalculator.jsx)
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/timeline.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/timeline.js)

### Document controls
- Project document lists, drawing metadata fields, document visibility in:
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/ProjectWorkspace.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/ProjectWorkspace.jsx)
- No dedicated global Document Control route/controller yet.

### Artwork/gallery behavior
- Board gallery, project board select, draggable artwork elements in:
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/artwork/BoardGallery.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/artwork/BoardGallery.jsx)
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/artwork/ArtworkSpace.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/artwork/ArtworkSpace.jsx)
- Portfolio/gallery management and export in:
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/PortfolioManager.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/PortfolioManager.jsx)

### Import/export
- JSON export/import, AI analysis import, weekly/intelligence exports in:
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/pages/StudioOSApp.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/pages/StudioOSApp.jsx)
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/studioIntelligence.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/studioIntelligence.js)

### Backup / restore
- Backup create, validation, preview, confirm restore in:
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/backupValidation.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/backupValidation.js)
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/studio-os/StudioOSImportPreview.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/studio-os/StudioOSImportPreview.jsx)

### Quick capture
- Floating quick capture modal supporting task/project/note plus staged modes in:
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/QuickCapture.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/dashboard/QuickCapture.jsx)

### Command palette
- Global keyboard-open command palette (`Ctrl/Cmd+K`) in:
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/CommandPalette.jsx](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/components/CommandPalette.jsx)

### Alerts or notifications
- Toast notification lifecycle in:
  - [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/hooks/useToastMessage.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/hooks/useToastMessage.js)

## 4) Gap matrix

| Legacy function/data | Current new BE BLANK OS support | Status | Recommended migration target | Priority |
|---|---|---|---|---|
| Project master records | Corebase mock has `CorebaseProjectRef` only (light fields) | Partial | Expand to `Project` model in Corebase domain with full operational fields | Must-have |
| Task/work queue | Corebase mock has `CorebaseTask`; legacy task utilities still primary | Partial | `WorkScopeItem` adapter contract + mapper from legacy `tasks` | Must-have |
| Timeline phases + critical path | Legacy timeline fully in utils/components; Corebase mock calendar exists but disconnected | Missing | `CalendarEvent` pipeline derived from project dates + milestones | Must-have |
| Journal content/decision notes | Legacy `contentItems` localStorage + AI notes | Partial | `DecisionLogItem` with tags/source (`quick-capture`, `analysis`) | Should-have |
| Documents | Legacy project documents/drawing metadata is project-embedded | Partial | `DocumentItem` normalized collection in Corebase boundary | Must-have |
| Artwork boards | Legacy `artwork_board_<projectId>` collection and project artwork UI | Partial | `ProjectImage` + optional `BoardItem` model; maintain board IDs | Should-have |
| Portfolio/gallery archive | Legacy portfolio items and image normalization active | Partial | `ProjectImage` for internal OS; keep portfolio public model separate | Should-have |
| Site updates/logs | Legacy `siteLogs` per project with normalization | Partial | `DecisionLogItem` or dedicated `SiteUpdateItem` mapped to project | Should-have |
| Alerts | Only transient toast messages | Missing | `AlertItem` persistence model with severity/source/ack state | Later |
| Settings/preferences | Local-only layout/notes/profile image keys | Partial | `SettingsItem` in Corebase (user scope) + migration of known keys | Later |
| Backup/restore compatibility | Existing schema and validation present | Complete (legacy) | Add Corebase-aware backup schema v2 with v1 reader | Must-have |
| Route contract (`/projects`, `/documents`, etc.) | Mostly nested under `/os/*` | Missing | Route aliases to existing screens before full refactor | Must-have |
| Overlay contract (task/doc/artwork drawers/modals) | Command palette + quick capture + import previews only | Missing | Overlay provider/state map with selected entity payloads | Must-have |

## 5) Corebase mapping proposal

### Proposed canonical mappings
- `Legacy project` -> `Project`
  - Fields: identity, client/location, owner/status, financials, schedule dates, blockers/next action, narrative layer.
- `Legacy task / work scope` -> `WorkScopeItem`
  - Fields: `id`, `projectId`, `title`, normalized `status`, `priority`, due/start dates, dependencies, blockers/waiting, notes.
- `Legacy journal + decisions + AI notes + site summaries` -> `DecisionLogItem`
  - Fields: `id`, `projectId?`, `type` (`journal`, `decision`, `site-update`, `ai-note`), `title`, `body`, timestamps, author/source.
- `Legacy timeline` -> `CalendarEvent`
  - From project phase dates and critical path milestones; include source references and risk tags.
- `Legacy project documents + drawing metadata` -> `DocumentItem`
  - Fields: revision/version/status/url/visibility/owner, normalized from project-level arrays.
- `Legacy artwork + portfolio images` -> `ProjectImage`
  - Fields: `projectId`, source (`board`, `gallery`, `cover`), URLs/crops/meta, ordering.
- `Legacy operational pressures + blockers` -> `AlertItem`
  - Derived from overdue/blocked/waiting/handover risk; initially computed then persisted.
- `Legacy financial deltas` -> `CostDiffItem`
  - Derived from budget/estimated/actual plus timestamped changes for auditability.

### Mapping anchor files
- Legacy shapes and constructors: [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/dashboard.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/dashboard.js)
- Task normalization: [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/operationalTasks.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/operationalTasks.js)
- Timeline derivation: [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/timeline.js](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/utils/timeline.js)
- Existing Corebase mock contracts: [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/corebase/google/models.ts](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/corebase/google/models.ts), [C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/corebase/google/adapters.ts](C:/Users/UsEr/Documents/New project-worktrees/beblank-os-corebase-adapter/src/corebase/google/adapters.ts)

## 6) Recommended migration sequence

### Phase 1: migrate mock/local data into corebase mockData
- Build deterministic mappers from:
  - `seed.js` project/content/portfolio
  - `beBlank.tasks` local task shape
  - project embedded arrays (`siteLogs`, `materialApprovals`, `billingMilestones`, `documents` where present)
- Output into Corebase mock domain objects (no UI switch yet).

### Phase 2: wire pages to read from adapter boundary
- Introduce read-only selector/service layer used by StudioOS pages.
- Keep existing UI components and props stable; map adapter output into current view models.

### Phase 3: add route aliases and overlays
- Add top-level aliases for required internal routes while preserving `/os/*`.
- Implement missing overlay contract (`Task Detail`, `Document Revision`, `Artwork Preview`, `Filter`, `New Project`) using centralized overlay state.

### Phase 4: connect Google Sheet / Calendar / Drive via Apps Script or live adapters
- Keep same adapter interface.
- Add provider switch (`mock` vs `live`) and read-only rollout first.

### Phase 5: add write-back actions
- Enable controlled writes per entity (project/task/document/image/event).
- Add optimistic update + conflict resolution strategy.

## 7) Risks

- Route mismatch risk:
  - Required top-level internal routes are not yet implemented; deep links may break migration expectations.
- Missing overlay contract risk:
  - Required drawer/modal payload contracts are absent, making behavior parity testing difficult.
- Stale legacy naming risk:
  - Mixed naming strings still exist (`Be Blank Studio OS` text paths and metadata), may cause backup/schema labeling drift.
- Data shape mismatch risk:
  - Legacy project model contains nested/optional arrays and narrative fields not represented in current Corebase mock types.
- Duplicate project ID risk:
  - IDs originate from mixed sources (`seed`, Firebase docs, generated IDs), and `karun-phuket` appears in portfolio/corebase mocks.
- localStorage/backup compatibility risk:
  - Existing backup schema (`studio-os-backup`) and local keys must remain readable during phased migration.
- Partial document model risk:
  - Document controls are embedded per project and not uniformly shaped; revision drawer migration will require normalization first.

## Next recommended PR scope

1. Add a read-only `legacyToCorebase` mapper module (no UI redesign) covering projects, tasks, timeline events, journal, documents, artwork, site updates.
2. Add adapter-backed selectors consumed by `StudioOSApp` while preserving existing component props.
3. Add route aliases for required internal URLs that map to existing screens.
4. Add overlay contract scaffolding with typed payloads and no visual redesign.
5. Add migration smoke tests for key routes + open/close overlay states + backup compatibility read.
## Audit status update (migration step 2)
- Selector fallback reads are now bound in project workspace (tasks/documents/artwork).
- Overlay contract is now attached to real UI triggers (new project, filter, task row, document row, artwork card, destructive confirmations).
- Route aliases remain active and are covered in smoke tests.
- Full parity for dedicated document/work-queue/settings experiences is still pending.
