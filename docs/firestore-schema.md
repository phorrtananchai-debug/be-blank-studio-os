# Firestore Schema

Be Blank Studio OS uses Firebase Firestore as the primary online database and keeps the local API/localStorage path as fallback for local development.

## Collections

### `projects`

Project documents use the project ID as the document ID when one already exists.

```json
{
  "name": "Aurum Residence",
  "client": "Private Client",
  "location": "Bangkok, TH",
  "status": "construction",
  "owner": "Design Lead",
  "startDate": "2026-04-01",
  "designCompleteDate": "2026-04-22",
  "clientReviewDate": "2026-04-25",
  "revisionCompleteDate": "2026-04-30",
  "handoverDate": "2026-05-18",
  "openingDate": "2026-06-01",
  "notes": "Project notes",
  "nextAction": "Confirm sequence",
  "blocker": "Lead time confirmation",
  "blockers": "Lead time confirmation",
  "riskLevel": "High",
  "deliveryPressure": "tight",
  "procurementStatus": "Waiting for furniture lead time",
  "handoverReadiness": "Draft checklist started",
  "dependencies": "BOQ approval before contractor lock",
  "criticalPath": [],
  "siteLogs": [],
  "intelligenceHistory": [],
  "areaSqm": "185",
  "ratePerSqm": "15000",
  "projectValue": "2775000",
  "targetCost": "2100000",
  "actualCost": "1480000",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

Project-level upgrade modules should extend this document with optional, backward-compatible fields. Existing records must tolerate missing arrays and strings.

Current project workspace ownership:

- `ProjectWorkspace` is the active project detail surface.
- `ProjectDashboard` owns the project list and opens `ProjectWorkspace`.
- `ProjectDetailView` in `ProjectDashboard.jsx` is a legacy inactive detail surface retained for reference only.
- `PresentationOverlay` is an internal presentation shell; client-safe presentation should use a sanitized project projection before rendering.

Timeline ownership:

- `criticalPath` is the canonical project dependency chain.
- `src/utils/criticalPath.js` owns milestone normalization, status/risk defaults, dependency checks, and safe merge helpers.
- `src/utils/timeline.js` owns project phase definitions and phase/date calculations.
- Timeline UI should extend `TimelineCalculator` and `CriticalPathPanel` rather than create a separate Gantt system.

### `contentPosts`

```json
{
  "title": "Post title",
  "platform": "Instagram",
  "captionTH": "Thai caption",
  "captionEN": "English caption",
  "status": "draft",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

### `portfolioItems`

```json
{
  "title": "Project title",
  "category": "Residential Interior",
  "imageUrl": "https://...",
  "description": "Portfolio description",
  "tags": "residential, Bangkok",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

### `agentInbox`

Future agent/mobile workflows can write normalized import requests here.

```json
{
  "type": "project",
  "status": "pending",
  "payload": {
    "name": "Agent-created project"
  },
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

### `projects.siteLogs` (legacy + rich site visit support)

Existing projects may contain legacy `siteLogs` entries and should continue to work:

```json
{
  "id": "site-legacy-01",
  "date": "2026-05-24",
  "notes": "Ceiling frame inspection complete.",
  "issues": "Confirm AC access panel alignment.",
  "imageLink": "https://example.com/site-photo.jpg"
}
```

Richer site visit entries are now supported in the same `projects.siteLogs` array:

```json
{
  "id": "visit-01",
  "title": "Site Visit - Main Ceiling",
  "date": "2026-05-24",
  "attendees": "Design Lead, Site Supervisor",
  "contractor": "ABC Build Co.",
  "notes": "Reviewed joinery interface and lighting rough-in.",
  "photos": [
    "https://example.com/site-photo-01.jpg"
  ],
  "issues": [
    {
      "id": "issue-01",
      "title": "Access panel misalignment",
      "notes": "Rework centerline before gypsum close.",
      "status": "open",
      "assignedTo": "Site Supervisor",
      "deadline": "2026-05-28",
      "linkedMilestone": "constructionStart",
      "visibility": "internal"
    }
  ],
  "status": "in_progress",
  "assignedTo": "Design Lead",
  "deadline": "2026-05-30",
  "visibility": "internal",
  "imageLink": "https://example.com/site-photo-01.jpg",
  "legacyIssuesText": ""
}
```

Status values:

- `open`
- `in_progress`
- `resolved`
- `deferred`

Visibility values:

- `internal` (default)
- `client_visible`

### `projects.materialApprovals` (project-level material / FF&E workflow)

Optional project-scoped material approvals should live directly on the project document:

```json
{
  "id": "material-01",
  "name": "Oak Veneer Panel",
  "category": "Joinery",
  "roomArea": "Living Room",
  "supplier": "Timber Studio",
  "leadTime": "5 weeks",
  "approvalState": "waiting_review",
  "notes": "Match final sample to approved stain reference.",
  "alternatives": [
    "White oak veneer",
    "Ash veneer"
  ],
  "images": [
    {
      "url": "https://example.com/material-01.jpg",
      "alt": "Oak veneer sample"
    }
  ],
  "visibility": "internal"
}
```

Approval state values:

- `proposed`
- `waiting_review`
- `approved`
- `rejected`
- `revised`

Visibility values:

- `internal` (default)
- `client_visible`

Notes:

- Missing `materialApprovals` should be treated as `[]` in UI only (no migration write required).
- Client presentation should only expose entries where `visibility` is `client_visible`.

### `projects.billingMilestones` (lightweight payment tracking)

Optional project-scoped billing milestones should remain lightweight and non-accounting:

```json
{
  "id": "billing-01",
  "label": "Design Development Deposit",
  "amount": "150000",
  "dueDate": "2026-06-10",
  "status": "sent",
  "notes": "Payable after DD package issue.",
  "visibility": "internal",
  "clientNotes": "Payable after DD package issue.",
  "publicNotes": ""
}
```

Status values:

- `draft`
- `sent`
- `paid`
- `overdue`

Visibility values:

- `internal` (default)
- `client_visible`

Notes:

- Missing `billingMilestones` should be treated as `[]` in UI only (no migration write required).
- Client presentation should only expose client-safe milestone fields for entries where `visibility` is `client_visible`.
- Do not expose internal cost/profit/margin calculations through client billing projection.

### `tasks`

Operational task documents are used by desktop and mobile workflows. They are intentionally lightweight and can link back to projects and milestones without becoming a full PM system.

```json
{
  "title": "Confirm stone sample",
  "projectId": "project-aurum",
  "status": "OPEN",
  "priority": "NORMAL",
  "dueDate": "2026-05-28",
  "owner": "Design Lead",
  "blockedBy": "",
  "waitingFor": "Client approval",
  "dependencies": "",
  "linkedMilestone": "BOQApproval",
  "linkedParty": "Supplier",
  "procurementFlag": true,
  "handoverFlag": false,
  "notes": "Use existing operational task shape.",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

### `notes`

The mobile app currently subscribes to `notes`. Treat this as a real lightweight field-note collection for mobile read workflows, not as a replacement for project `siteLogs` or editorial `contentPosts`.

```json
{
  "title": "Site note",
  "body": "Field observation or mobile note.",
  "projectId": "project-aurum",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

## Auth

The app uses Firebase Auth with Google sign-in. Set `VITE_ALLOWED_STUDIO_EMAIL` to the only account allowed in the UI.

Recommended Firestore rules should also enforce the same email restriction server-side:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isStudioOwner() {
      return request.auth != null && request.auth.token.email == "you@example.com";
    }

    match /projects/{projectId} {
      allow read, write: if isStudioOwner();
    }

    match /contentPosts/{postId} {
      allow read, write: if isStudioOwner();
    }

    match /portfolioItems/{itemId} {
      allow read, write: if isStudioOwner();
    }

    match /tasks/{taskId} {
      allow read, write: if isStudioOwner();
    }

    match /notes/{noteId} {
      allow read, write: if isStudioOwner();
    }

    match /agentInbox/{itemId} {
      allow read, write: if isStudioOwner();
    }
  }
}
```
