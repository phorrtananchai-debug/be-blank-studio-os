# GOOGLE_COREBASE_PLAN

## Goal
Prepare a production-ready adapter boundary for Google Sheets, Calendar, and Drive while keeping the current BE BLANK OS prototype UI and data flow intact.

## What was added now (mock-only)
- Typed domain models for project/task/document/artwork/calendar/drive payloads.
- Adapter interfaces for three providers:
  - `GoogleSheetsAdapter`
  - `GoogleCalendarAdapter`
  - `GoogleDriveAdapter`
- Mock dataset and mock adapter implementations.
- Single composition export: `createMockGoogleCorebaseAdapters()`.

## File map
- `/src/corebase/google/models.ts`
- `/src/corebase/google/adapters.ts`
- `/src/corebase/google/mockData.ts`
- `/src/corebase/google/mockAdapters.ts`
- `/src/corebase/google/index.ts`

## Adapter contract
### Sheets adapter
- `listProjects(projectId?)`
- `listTasks(projectId?)`
- `listDocuments(projectId?)`
- `sync()`

### Calendar adapter
- `listEvents(projectId?)`
- `sync()`

### Drive adapter
- `listFiles(projectId?)`
- `listArtwork(projectId?)`
- `sync()`

All current adapters return `mode: 'mock'` sync metadata and deterministic in-repo mock data.

## Integration strategy (next)
1. Add `corebase/google/live` adapters beside mocks, matching the same interfaces.
2. Add a provider selector (`mock` vs `google-live`) from environment config.
3. Keep UI components consuming existing hook shapes; introduce mapping utilities from adapter models to current view models.
4. Add failure handling contract (`retryable`, `auth_required`, `rate_limited`) before enabling live credentials.
5. Add contract tests for all adapters (same expected behavior for mock/live).

## Non-goals in this pass
- No OAuth or service-account setup.
- No backend credential vault.
- No syncing to external Google APIs.
- No redesign or module renaming.
