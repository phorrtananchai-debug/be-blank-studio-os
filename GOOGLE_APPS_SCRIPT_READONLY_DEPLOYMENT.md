# GOOGLE APPS SCRIPT READ-ONLY DEPLOYMENT GUIDE

This guide explains how to run BE BLANK OS in `google-readonly` mode using a Google Apps Script Web App.

## Scope
- Read-only only.
- No write-back.
- No OAuth flow in this phase.

## 1) Create Google Sheet from templates
1. Create a new Google Sheet workbook.
2. Add tabs using the exact names:
   - `00_ProjectMaster`
   - `01_WorkScope`
   - `02_DecisionLog`
   - `03_CostDiff`
   - `04_AlertLog`
   - `05_Documents`
   - `06_Images`
   - `09_CalendarMirror`
3. Import each CSV from:
   - `docs/google-corebase-templates/`
4. Include all tabs for complete setup:
   - `07_Team`
   - `08_Settings`

## 2) Create Apps Script project
1. In Google Sheet, open `Extensions -> Apps Script`.
2. Replace default script content with:
   - `docs/google-corebase-apps-script/readonly-doGet.sample.js`
3. In the sample, replace:
   - `YOUR_SPREADSHEET_ID_HERE`
   with your spreadsheet ID.

## 3) Deploy as Web App
1. Click `Deploy -> New deployment`.
2. Choose type: `Web app`.
3. Execute as: choose account with read access to the workbook.
4. Who has access: prefer least-permissive setting that still allows your internal app to read.
5. Deploy and copy the Web App URL.

## 4) Configure BE BLANK OS
1. In local env, set:
   - `VITE_GOOGLE_COREBASE_ENDPOINT=<YOUR_WEB_APP_URL>`
2. Restart app.
3. If endpoint is blank, app stays in `mock` mode by design.

## 5) Quick endpoint checks in browser
Use your Web App URL with query params:
- `?resource=projects`
- `?resource=workscope`
- `?resource=documents&project_id=KARUN-PHUKET-OLDTOWN`
- `?resource=images&project_id=KARUN-PHUKET-OLDTOWN`
- `?resource=calendar&project_id=KARUN-PHUKET-OLDTOWN`
- `?resource=alerts`
- `?resource=all`

Expected success shape:
```json
{
  "ok": true,
  "mode": "google-readonly",
  "resource": "projects",
  "updated_at": "...",
  "data": []
}
```

## 6) Verify in BE BLANK OS
Open `/os/settings` and check Corebase Sync Status:
- Corebase mode
- Endpoint configured yes/no
- Endpoint host (sanitized)
- Last sync / Last error
- Fallback source / stale indicator
- Retry metadata
- `Verify Google Corebase` action is available for safe endpoint/resource checks.

## Security notes
- Do not commit private production endpoints or credentials.
- Do not store secrets in repository files.
- Keep this integration read-only until write-back PR is explicitly approved.
