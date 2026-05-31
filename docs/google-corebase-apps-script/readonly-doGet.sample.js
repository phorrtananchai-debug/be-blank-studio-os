/**
 * BE BLANK OS Google Corebase read-only sample endpoint.
 *
 * NOTE:
 * - Sample only. Do not store production secrets in script source.
 * - Replace YOUR_SPREADSHEET_ID_HERE with your sheet ID before deployment.
 * - Read-only doGet only. No write-back in this phase.
 *
 * Resource tests:
 * - ?resource=projects
 * - ?resource=all
 * - ?resource=workscope&project_id=KARUN-PHUKET-OLDTOWN
 * - ?resource=health
 */

// Paste your spreadsheet ID here. Keep this value out of public repositories.
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

// Resource to tab mapping for read-only fetches.
const RESOURCE_TO_TAB = {
  alerts: '04_AlertLog',
  calendar: '09_CalendarMirror',
  documents: '05_Documents',
  images: '06_Images',
  projects: '00_ProjectMaster',
  workscope: '01_WorkScope',
};

function doGet(e) {
  try {
    const resource = String((e && e.parameter && e.parameter.resource) || '').trim().toLowerCase();
    const projectId = String((e && e.parameter && e.parameter.project_id) || '').trim();

    if (!resource) {
      return json(errorResponse('invalid_resource', 'Missing resource parameter.', false));
    }

    if (resource === 'health') {
      const tabs = Object.entries(RESOURCE_TO_TAB).reduce(function (acc, entry) {
        var key = entry[0];
        var tabName = entry[1];
        acc[key] = Boolean(SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(tabName));
        return acc;
      }, {});

      return json(successResponse('health', {
        spreadsheetConfigured: SPREADSHEET_ID !== 'YOUR_SPREADSHEET_ID_HERE',
        tabs: tabs,
      }));
    }

    if (resource === 'all') {
      const data = {
        alerts: readTabAsObjects(RESOURCE_TO_TAB.alerts),
        calendar: readTabAsObjects(RESOURCE_TO_TAB.calendar),
        documents: readTabAsObjects(RESOURCE_TO_TAB.documents),
        images: readTabAsObjects(RESOURCE_TO_TAB.images),
        projects: readTabAsObjects(RESOURCE_TO_TAB.projects),
        workscope: readTabAsObjects(RESOURCE_TO_TAB.workscope),
      };
      return json(successResponse('all', data));
    }

    const tabName = RESOURCE_TO_TAB[resource];
    if (!tabName) {
      return json(errorResponse('invalid_resource', 'Unsupported resource requested.', false));
    }

    const rows = readTabAsObjects(tabName);
    const filtered = projectId ? filterByProjectId(rows, projectId) : rows;
    return json(successResponse(resource, filtered));
  } catch (error) {
    return json(errorResponse('unknown', String((error && error.message) || 'Unknown error.'), false));
  }
}

function readTabAsObjects(tabName) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(tabName);
  if (!sheet) {
    throw new Error('Tab not found: ' + tabName);
  }

  const values = sheet.getDataRange().getValues();
  if (!values || !values.length) {
    return [];
  }

  const headers = values[0].map(function (value) {
    return String(value || '').trim();
  });

  const rows = [];
  for (var r = 1; r < values.length; r += 1) {
    var row = {};
    var hasValue = false;
    for (var c = 0; c < headers.length; c += 1) {
      var key = headers[c];
      if (!key) continue;
      var value = values[r][c];
      if (value !== '' && value !== null && value !== undefined) {
        hasValue = true;
      }
      row[key] = value;
    }
    if (hasValue) rows.push(row);
  }

  return rows;
}

function filterByProjectId(rows, projectId) {
  const normalized = String(projectId || '').trim().toLowerCase();
  if (!normalized) return rows;

  // Filter rows by project_id (or projectId alias) for workspace-specific reads.
  return rows.filter(function (row) {
    const candidate = String(row.project_id || row.projectId || '').trim().toLowerCase();
    return candidate === normalized;
  });
}

function successResponse(resource, data) {
  return {
    ok: true,
    mode: 'google-readonly',
    resource: resource,
    updated_at: new Date().toISOString(),
    data: data,
  };
}

function errorResponse(code, message, retryable) {
  return {
    ok: false,
    error: {
      code: code,
      message: message,
      retryable: Boolean(retryable),
    },
  };
}

function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
