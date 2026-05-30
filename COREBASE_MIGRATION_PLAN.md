# COREBASE_MIGRATION_PLAN

## Purpose
Migration foundation plan for moving legacy BE BLANK OS operational data into Corebase-compatible structures while keeping current UI behavior stable.

## Implemented in this PR
1. Read-only legacy mapper in `/src/corebase/google/legacyToCorebase.ts`.
2. Adapter-backed selectors in `/src/corebase/google/selectors.ts`.
3. Canonical project ID + alias mapping strategy.
4. Route aliases that map required URLs to existing Studio OS surfaces.
5. Centralized overlay contract scaffolding without replacing existing command palette.
6. Smoke route coverage for internal and alias routes.

## Data mapped into Corebase domain
- Projects -> `CorebaseProjectRef`
- Tasks -> `WorkScopeItem`
- Journal + site context -> `DecisionLogItem`
- Timeline dates -> `CalendarEvent`
- Documents -> `DocumentItem`
- Artwork/gallery -> `ProjectImage`
- Site logs -> `SiteUpdateItem`
- Operational pressure -> `AlertItem`
- Cost delta -> `CostDiffItem`

## Next execution phases
1. Bind selectors to Studio OS read paths and progressively replace legacy direct reads.
2. Expand project canonical model beyond refs and add normalization for missing document fields.
3. Add dedicated route-level document/work-queue/settings surfaces using existing visual language.
4. Attach overlay contract payloads to real triggers (task row, document row, artwork preview, filters, destructive confirmations).
5. Introduce live Google adapters (read-only first), then controlled write-back.
