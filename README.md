# Be Blank Studio OS

Production-ready React + Vite + TailwindCSS internal dashboard for an architecture and interior design studio.

## Setup

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal, usually `http://localhost:5173`.

On Windows PowerShell, if script execution blocks `npm`, use:

```bash
npm.cmd install
npm.cmd run dev
```

## Production Build

```bash
npm run build
npm run preview
```

For web-only production builds, including Vercel, Vite uses `/` as the asset base. Electron/local packaged builds keep relative assets.

## Vercel Deployment

This project is ready for Vercel as a Vite app.

1. Push the repo to GitHub.
2. Import the project in Vercel.
3. Use the included `vercel.json` settings:

```txt
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

4. Add these Vercel Environment Variables for Production, Preview, and Development:

```bash
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
VITE_ALLOWED_STUDIO_EMAIL=studio@example.com
```

The same template is available in `.env.production.example`.

5. In Firebase Authentication, add your Vercel domains to Authorized domains:

```txt
your-project.vercel.app
your-custom-domain.com
```

## Desktop App

Run the Electron desktop app in development:

```bash
npm run electron:dev
```

Build Windows installer and portable app outputs:

```bash
npm run electron:build
```

Packaged files are written to `release/`. The desktop app keeps browser `localStorage` behavior inside Electron.

## Local API

Run the private local API server:

```bash
npm run server
```

Run the API and Vite app together:

```bash
npm run dev:full
```

The API runs at `http://127.0.0.1:8787` and stores shared data in `data/studio-os.json`. If the API is not running, the frontend automatically falls back to browser `localStorage`.

Health check:

```bash
curl http://127.0.0.1:8787/api/health
```

List projects:

```bash
curl http://127.0.0.1:8787/api/projects
```

Create a project:

```bash
curl -X POST http://127.0.0.1:8787/api/projects \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"New Retail Fitout\",\"client\":\"Private Client\",\"location\":\"Bangkok\",\"status\":\"concept\",\"startDate\":\"2026-05-01\",\"handoverDate\":\"2026-06-15\",\"openingDate\":\"2026-06-22\",\"notes\":\"Initial local API test\",\"nextAction\":\"Confirm site survey\",\"blocker\":\"\",\"riskLevel\":\"Low\",\"areaSqm\":\"120\",\"ratePerSqm\":\"15000\",\"projectValue\":\"1800000\",\"targetCost\":\"1200000\",\"actualCost\":\"0\"}"
```

Update a project:

```bash
curl -X PATCH http://127.0.0.1:8787/api/projects/project-aurum \
  -H "Content-Type: application/json" \
  -d "{\"nextAction\":\"Send updated drawing package\",\"status\":\"review\"}"
```

Delete a project:

```bash
curl -X DELETE http://127.0.0.1:8787/api/projects/project-aurum
```

## Data

The app prefers the private local API when it is running and falls back to browser `localStorage` when it is not. The browser storage helpers live in `src/services/storage.js`, and the API client lives in `src/services/api.js`.

## Firebase Online Sync

Firebase is the primary online architecture when configured. The local API and `localStorage` stay available for local/dev fallback.

1. Create a Firebase project.
2. Enable Firestore.
3. Enable Firebase Auth with Google sign-in.
4. Copy `.env.example` to `.env.local`.
5. Fill in:

```bash
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
VITE_ALLOWED_STUDIO_EMAIL=studio@example.com
```

Install dependencies after pulling this change:

```bash
npm install
```

Firestore collections:

```txt
projects
contentPosts
portfolioItems
agentInbox
```

Deploy or paste the rules from `firestore.rules`, replacing `REPLACE_WITH_ALLOWED_STUDIO_EMAIL` with your email. The full schema is documented in `docs/firestore-schema.md`.

## Online ChatGPT Agent Endpoint

This repo includes a Firebase Cloud Function for a 100% online ChatGPT Action endpoint. It writes directly to Firestore and keeps the local API fallback untouched.

Install Firebase tooling if needed:

```bash
npm install -g firebase-tools
firebase login
```

Install function dependencies:

```bash
cd functions
npm install
cd ..
```

Set the agent API key secret:

```bash
firebase functions:secrets:set AGENT_KEY
```

Deploy the function:

```bash
firebase deploy --only functions:agent
```

Your endpoint will look like:

```txt
https://asia-southeast1-YOUR_PROJECT_ID.cloudfunctions.net/agent/project
```

Test from a terminal:

```bash
curl -X POST https://asia-southeast1-YOUR_PROJECT_ID.cloudfunctions.net/agent/project \
  -H "Content-Type: application/json" \
  -H "x-agent-key: YOUR_AGENT_KEY" \
  -d "{\"action\":\"create_project\",\"payload\":{\"name\":\"ChatGPT Test Project\",\"client\":\"Studio Client\",\"location\":\"Bangkok\",\"status\":\"concept\",\"notes\":\"Created from online agent endpoint\"}}"
```

Expected response:

```json
{
  "ok": true,
  "action": "create_project",
  "projectId": "...",
  "message": "Created project: ChatGPT Test Project"
}
```

Connect as a ChatGPT Action:

1. Open `docs/chatgpt-action-openapi.yaml`.
2. Replace the server URL with your deployed Firebase Function base URL.
3. Add authentication as an API key header named `x-agent-key`.
4. Use your `AGENT_KEY` secret value as the action credential.
5. Test with: `Create a project named ChatGPT Test Project for Studio Client in Bangkok.`

Supported actions:

```txt
create_project
update_project
delete_project
add_note
create_calendar_event_later
```
