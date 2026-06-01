# Google Corebase Quickstart (Read-only)

This quickstart makes BE BLANK OS usable with Google Sheet + Apps Script in read-only mode.

## 1) Create Google Sheet
Create a new Google Sheet workbook for Corebase read-only data.

## 2) Import template tabs
Import CSV files from `docs/google-corebase-templates/` and ensure tab names are exactly:
- `00_ProjectMaster`
- `01_WorkScope`
- `02_DecisionLog`
- `03_CostDiff`
- `04_AlertLog`
- `05_Documents`
- `06_Images`
- `07_Team`
- `08_Settings`
- `09_CalendarMirror`

## 3) Open Apps Script
In the sheet, open `Extensions -> Apps Script`.

## 4) Paste read-only sample
Use:
- `docs/google-corebase-apps-script/readonly-doGet.sample.js`

## 5) Replace only spreadsheet ID
In the sample script, replace:
- `YOUR_SPREADSHEET_ID_HERE`

## 6) Deploy as Web App
- Deploy type: `Web app`
- Access: least permissive setting that still supports your internal read-only use
- Copy the Web App URL

## 7) Set endpoint locally
Create `.env.local` from `.env.local.example` and set:
- `VITE_GOOGLE_COREBASE_ENDPOINT=<YOUR_WEB_APP_URL>`
- `VITE_GOOGLE_COREBASE_MODE=google-readonly` (default readonly)

Leave it blank to keep mock mode.

## 7b) Karun live-control mode (first live project)
For Karun Phuket scoped live-control (safe write patch actions only), set:
- `VITE_GOOGLE_COREBASE_MODE=karun-live-control`

Then verify:
- `/os/settings` shows Corebase mode `karun-live-control`
- `/projects/karun-phuket` loads and shows WorkScope edit controls
- update one non-critical row first (status/priority/notes)

## 8) Run BE BLANK OS locally
Start app normally and open internal OS.

## 9) Verify in Settings / Studio System
Go to `/os/settings` and confirm:
- Corebase mode: `google-readonly`
- Endpoint configured: `yes`
- Read-only badge/state visible
- Last sync or last error metadata visible

## 10) Use built-in verification action
In Settings, click:
- `Verify Google Corebase`

It runs safe read-only checks for:
- projects
- workscope
- documents
- images
- calendar
- alerts

## 11) Troubleshooting
- `auth_required`: access policy/auth for web app is blocking request
- `invalid_resource`: endpoint resource key unsupported
- `invalid_response`: JSON or shape mismatch
- `rate_limited`: endpoint throttled; retry later
- `network_error`: URL/network/firewall issue
- `timeout`: endpoint too slow; retry
- stale fallback: app fell back to mock after readonly failure

## 12) Safety notes
- Read-only only in this phase.
- No write-back is enabled.
- Do not share private endpoint URLs if the sheet contains sensitive data.
- Do not commit `.env.local`.
