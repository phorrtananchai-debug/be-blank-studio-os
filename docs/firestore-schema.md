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
  "handoverDate": "2026-05-18",
  "openingDate": "2026-06-01",
  "notes": "Project notes",
  "nextAction": "Confirm sequence",
  "blocker": "Lead time confirmation",
  "blockers": "Lead time confirmation",
  "riskLevel": "High",
  "deliveryPressure": "tight",
  "areaSqm": "185",
  "ratePerSqm": "15000",
  "projectValue": "2775000",
  "targetCost": "2100000",
  "actualCost": "1480000",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

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

    match /{document=**} {
      allow read, write: if isStudioOwner();
    }
  }
}
```
