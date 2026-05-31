# GOOGLE APPS SCRIPT ENDPOINT CONTRACT

## Purpose
This contract defines a read-only JSON API for BE BLANK OS Google Corebase mode.

- Method: `GET`
- Auth: optional in this MVP (future OAuth/service checks)
- Mode returned by API: `google-readonly`

## Endpoint pattern
- Base URL example: `https://script.google.com/macros/s/APP_ID/exec`
- Query parameter: `resource`
- Optional filter: `project_id`

## Supported resources
- `GET ?resource=projects`
- `GET ?resource=workscope`
- `GET ?resource=workscope&project_id=KARUN-PHUKET-OLDTOWN`
- `GET ?resource=documents&project_id=KARUN-PHUKET-OLDTOWN`
- `GET ?resource=images&project_id=KARUN-PHUKET-OLDTOWN`
- `GET ?resource=calendar&project_id=KARUN-PHUKET-OLDTOWN`
- `GET ?resource=alerts`
- `GET ?resource=all`

## Success response
```json
{
  "ok": true,
  "mode": "google-readonly",
  "resource": "projects",
  "updated_at": "2026-06-01T09:00:00Z",
  "data": []
}
```

## Error response
```json
{
  "ok": false,
  "error": {
    "code": "auth_required",
    "message": "Authorization is required.",
    "retryable": false
  }
}
```

## Allowed error codes
- `auth_required`
- `rate_limited`
- `not_found`
- `invalid_resource`
- `invalid_response`
- `network_error`
- `timeout`
- `unknown`

## Resource payload expectations
- `projects`: rows compatible with `Project` / `CorebaseProjectRef`
- `workscope`: rows compatible with `WorkScopeItem`
- `documents`: rows compatible with `DocumentItem`
- `images`: rows compatible with `ProjectImage`
- `calendar`: rows compatible with `CalendarEvent`
- `alerts`: rows compatible with `AlertItem`
- `all`: object with keys `{ projects, workscope, documents, images, calendar, alerts, decisionlog, costdiff }`

## Client-side behavior requirements
- Client must not crash on empty `data` arrays.
- Missing endpoint must keep app in `mock` mode.
- Non-200 responses must map to known error codes and preserve fallback behavior.
- No write endpoints are included in this MVP.
