# GOOGLE COREBASE READ-ONLY MVP

## Purpose
This document defines the Google Sheet workbook structure for BE BLANK OS read-only Corebase mode.

- Mode: `google-readonly`
- Fallback: if endpoint is missing or fails, app remains in `mock` mode.
- No write-back is included in this phase.

## Workbook Tabs

### 00_ProjectMaster
- Required columns: `project_id`, `project_name`, `phase`
- Optional columns: `status`, `client`, `location`, `slug`, `aliases`, `updated_at`
- Example row:

```csv
project_id,project_name,phase,status,client,location,slug,aliases,updated_at
KARUN-PHUKET-OLDTOWN,Karun Phuket Oldtown,design,active,Karun,Phuket,karun-phuket,"karun-phuket|karun-phuket-oldtown",2026-06-01T09:00:00Z
```

- Mapped model: `Project` / `CorebaseProjectRef`
- Consumed by screens: `/os/projects`, `/projects`, `/projects/karun-phuket`, `/os/settings`

### 01_WorkScope
- Required columns: `task_id`, `project_id`, `task_title`, `status`
- Optional columns: `priority`, `assignee`, `due_date`, `notes`, `updated_at`
- Example row:

```csv
task_id,project_id,task_title,status,priority,assignee,due_date,notes,updated_at
TASK-001,KARUN-PHUKET-OLDTOWN,Finalize lighting schedule,IN_PROGRESS,HIGH,Studio Lead,2026-06-10,Pending supplier response,2026-06-01T09:05:00Z
```

- Mapped model: `WorkScopeItem` / `CorebaseTask`
- Consumed by screens: `/os/work-queue`, `/work-queue`, project workspace panels

### 02_DecisionLog
- Required columns: `decision_id`, `project_id`, `title`, `body`
- Optional columns: `type`, `source`, `created_at`
- Example row:

```csv
decision_id,project_id,title,body,type,source,created_at
DEC-001,KARUN-PHUKET-OLDTOWN,Stone finish locked,Client approved travertine batch,decision,google-readonly,2026-05-30T13:00:00Z
```

- Mapped model: `DecisionLogItem`
- Consumed by screens: `/os/content`, `/journal`, `/os/site-watch` (site-related entries)

### 03_CostDiff
- Required columns: `cost_diff_id`, `project_id`, `baseline_cost`, `current_cost`
- Optional columns: `delta`, `updated_at`
- Example row:

```csv
cost_diff_id,project_id,baseline_cost,current_cost,delta,updated_at
COST-001,KARUN-PHUKET-OLDTOWN,2400000,2525000,125000,2026-06-01T09:10:00Z
```

- Mapped model: `CostDiffItem`
- Consumed by screens: internal financial summaries and future settings diagnostics

### 04_AlertLog
- Required columns: `alert_id`, `project_id`, `level`, `message`
- Optional columns: `status`, `created_at`
- Example row:

```csv
alert_id,project_id,level,message,status,created_at
ALERT-001,KARUN-PHUKET-OLDTOWN,WATCH,Drawing set waiting on MEP revision,open,2026-06-01T09:12:00Z
```

- Mapped model: `AlertItem`
- Consumed by screens: `/os/site-watch`, `/site-watch`, future dashboard alert panels

### 05_Documents
- Required columns: `document_id`, `project_id`, `title`, `revision`, `status`
- Optional columns: `owner`, `url`, `updated_at`
- Example row:

```csv
document_id,project_id,title,revision,status,owner,url,updated_at
DOC-001,KARUN-PHUKET-OLDTOWN,Architectural Drawing Package,R2,Review,Design Director,https://example.com/docs/karun-r2,2026-06-01T09:15:00Z
```

- Mapped model: `DocumentItem`
- Consumed by screens: `/os/documents`, `/documents`, document overlay drawer

### 06_Images
- Required columns: `image_id`, `project_id`, `title`, `media_type`
- Optional columns: `role`, `preview_url`, `url`, `updated_at`
- Example row:

```csv
image_id,project_id,title,media_type,role,preview_url,url,updated_at
IMG-001,KARUN-PHUKET-OLDTOWN,Lobby Concept Board,image,board,https://example.com/img/karun-lobby.jpg,https://example.com/img/karun-lobby.jpg,2026-06-01T09:20:00Z
```

- Mapped model: `ProjectImage`
- Consumed by screens: `/os/artwork`, `/artwork`, `/os/portfolio`, `/gallery`

### 07_Team
- Required columns: `member_id`, `name`, `role`
- Optional columns: `email`, `phone`, `active`, `updated_at`
- Example row:

```csv
member_id,name,role,email,active,updated_at
TEAM-001,Studio Principal,Principal,studio@example.com,TRUE,2026-06-01T09:25:00Z
```

- Mapped model: future team profile model (not fully consumed yet)
- Consumed by screens: future internal team settings surface

### 08_Settings
- Required columns: `key`, `value`
- Optional columns: `active`, `acknowledged`, `updated_at`
- Example row:

```csv
key,value,active,acknowledged,updated_at
reviewCadence,Weekly,TRUE,FALSE,2026-06-01T09:30:00Z
```

- Mapped model: settings key/value map (read-only)
- Consumed by screens: `/os/settings`, `/settings`

### 09_CalendarMirror
- Required columns: `event_id`, `title`, `start_at`, `end_at`
- Optional columns: `project_id`, `category`, `location`, `source`, `updated_at`
- Example row:

```csv
event_id,project_id,title,category,start_at,end_at,location,source,updated_at
EVT-001,KARUN-PHUKET-OLDTOWN,Site coordination,timeline,2026-06-03T03:00:00Z,2026-06-03T04:00:00Z,Phuket,google-readonly,2026-06-01T09:35:00Z
```

- Mapped model: `CalendarEvent`
- Consumed by screens: `/os/timeline`, `/timeline`

## Notes
- Keep `project_id` canonical where possible.
- Alias slugs may still be provided in `slug` or `aliases` for route compatibility.
- This MVP intentionally excludes OAuth and write-back.
