# GOOGLE APPS SCRIPT KARUN LIVE CONTROL CONTRACT

## Purpose
Use the existing Google Sheet **KARUN PHUKET OLD TOWN - PROJECT CONTROL** as the source of truth for Karun workspace operations in BE BLANK OS.

This contract is scoped to:
- `project_id`: `KARUN-PHUKET-OLDTOWN`
- routes: `/projects/karun-phuket` and `/os/projects/karun-phuket`

This contract does **not** include delete or bulk overwrite.

## Required Tabs (existing names preserved)
- `Dashboard` (main summary area)
- `01 Work Scope Master`
- `02 Material Board`
- `03 Flooring Diff - 2F / Kitchen`
- `04 Air Conditioning System`
- `05 Electrical / Meter Upgrade`
- `06 Facade / Front Elevation`
- `Alert Automation Setup`

## Read Endpoints (GET)
- `?resource=karun_dashboard`
- `?resource=karun_workscope`
- `?resource=karun_materials`
- `?resource=karun_costdiff`
- `?resource=karun_decisions`
- `?resource=karun_alerts`
- `?resource=karun_all`

Optional:
- `?resource=health`

## Write Endpoints (POST)
Allowed `action` values:
- `update_workscope_item`
- `add_workscope_item`
- `update_status`
- `update_priority`
- `update_notes`
- `acknowledge_alert`

Optional:
- `run_alert_check`

Blocked in this phase:
- delete actions
- bulk overwrite actions

## Write Request Shape
```json
{
  "action": "update_workscope_item",
  "project_id": "KARUN-PHUKET-OLDTOWN",
  "resource": "karun_workscope",
  "row_id": "WS-001",
  "item_id": "WS-001",
  "patch": {
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "notes": "Updated by Studio OS"
  },
  "updated_by": "studio-os",
  "updated_at": "2026-06-01T09:00:00.000Z",
  "client_request_id": "karun-1717232400000-ab12cd"
}
```

Every write must include:
- `project_id`
- `resource`
- `row_id` or `item_id`
- `patch`
- `updated_by`
- `updated_at`
- `client_request_id`

## Success Response Shape
```json
{
  "ok": true,
  "mode": "karun-live-control",
  "resource": "karun_workscope",
  "updated_at": "2026-06-01T09:00:01.000Z",
  "data": {
    "request": { "action": "update_workscope_item", "item_id": "WS-001" },
    "before": { "ID": "WS-001", "Status": "TODO" },
    "after": { "ID": "WS-001", "Status": "IN_PROGRESS" }
  }
}
```

## Error Response Shape
```json
{
  "ok": false,
  "error": {
    "code": "invalid_response",
    "message": "...",
    "retryable": true
  }
}
```

Allowed error codes:
- `auth_required`
- `rate_limited`
- `not_found`
- `invalid_resource`
- `invalid_response`
- `network_error`
- `timeout`
- `unknown`

## Security Notes
- Do not commit live endpoint secrets or private Sheet IDs.
- Use `YOUR_SPREADSHEET_ID_HERE` in shared code samples.
- Do not hardcode Discord/email/webhook secrets; store in Script Properties.
- Keep write scope limited to Karun until multi-project safeguards are ready.
