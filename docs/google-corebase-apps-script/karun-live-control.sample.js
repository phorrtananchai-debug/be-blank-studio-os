/**
 * BE BLANK OS - Karun Phuket live-control sample (read/write)
 *
 * Replace only:
 *   const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
 *
 * Do not commit private IDs, webhooks, or credentials.
 * This sample is read/write but intentionally safe:
 * - no delete
 * - no bulk overwrite
 * - whitelisted column patching only
 */

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

const TAB_NAME_ALIASES = {
  ALERT_SETUP: 'Alert Automation Setup',
  COSTDIFF: ['03 Flooring Diff - 2F / Kitchen', '03 Flooring Diff — 2F / Kitchen'],
  DASHBOARD: 'Dashboard',
  DECISIONS_AC: '04 Air Conditioning System',
  DECISIONS_ELEC: '05 Electrical / Meter Upgrade',
  DECISIONS_FACADE: '06 Facade / Front Elevation',
  MATERIALS: '02 Material Board',
  WORKSCOPE: '01 Work Scope Master',
};

function getSheetByAlias(ss, tabAlias) {
  const aliases = Array.isArray(tabAlias) ? tabAlias : [tabAlias];
  for (const alias of aliases) {
    const sheet = ss.getSheetByName(alias);
    if (sheet) return sheet;
  }
  return null;
}

const READ_RESOURCES = new Set([
  'karun_dashboard',
  'karun_workscope',
  'karun_materials',
  'karun_costdiff',
  'karun_decisions',
  'karun_alerts',
  'karun_all',
  'health',
]);

const WRITE_ACTIONS = new Set([
  'update_workscope_item',
  'add_workscope_item',
  'update_status',
  'update_priority',
  'update_notes',
  'acknowledge_alert',
  'run_alert_check',
]);

const WORKSCOPE_PATCH_COLUMN_MAP = {
  alert_channel: 'Alert Channel',
  alert_note: 'Alert Note',
  alert_sent: 'Alert Sent',
  decision_needed: 'Decision Needed',
  due_date: 'Due / Target',
  notes: 'Notes',
  priority: 'Priority',
  responsible: 'Responsible',
  status: 'Status',
  title: 'Item / Scope',
  waiting_for: 'Decision Needed',
};

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok(resource, data, updatedAt) {
  return jsonResponse({
    ok: true,
    mode: 'karun-live-control',
    resource,
    updated_at: updatedAt || new Date().toISOString(),
    data,
  });
}

function fail(code, message, retryable) {
  return jsonResponse({
    ok: false,
    error: {
      code: code || 'unknown',
      message: message || 'Unknown error',
      retryable: Boolean(retryable),
    },
  });
}

function getSpreadsheet() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID_HERE') {
    throw new Error('Spreadsheet ID is not configured.');
  }
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function sheetToObjects(sheet) {
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (!values.length) return [];
  const headers = values[0].map((header) => String(header || '').trim());

  return values.slice(1).map((row) => {
    return headers.reduce((acc, header, index) => {
      acc[header] = row[index];
      return acc;
    }, {});
  }).filter((row) => Object.values(row).some((value) => String(value || '').trim() !== ''));
}

function getSheetRowsByTabName(ss, tabAlias) {
  const sheet = getSheetByAlias(ss, tabAlias);
  return sheetToObjects(sheet);
}

function toIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function asProjectRows(rows, projectId) {
  if (!projectId) return rows;
  return rows.filter((row) => {
    const rowProject = String(row['Project ID'] || row['project_id'] || projectId || '').trim();
    return !rowProject || rowProject === projectId;
  });
}

function buildHealthData(ss) {
  const tabs = Object.entries(TAB_NAME_ALIASES).reduce((acc, [key, tabAlias]) => {
    const aliases = Array.isArray(tabAlias) ? tabAlias : [tabAlias];
    acc[key] = aliases.some((name) => Boolean(ss.getSheetByName(name)));
    return acc;
  }, {});

  return {
    spreadsheetConfigured: true,
    tabs,
  };
}

function loadResource(resource, projectId) {
  const ss = getSpreadsheet();

  if (resource === 'health') {
    return buildHealthData(ss);
  }

  if (resource === 'karun_dashboard') {
    return getSheetRowsByTabName(ss, TAB_NAME_ALIASES.DASHBOARD);
  }

  if (resource === 'karun_workscope') {
    return asProjectRows(getSheetRowsByTabName(ss, TAB_NAME_ALIASES.WORKSCOPE), projectId);
  }

  if (resource === 'karun_materials') {
    return asProjectRows(getSheetRowsByTabName(ss, TAB_NAME_ALIASES.MATERIALS), projectId);
  }

  if (resource === 'karun_costdiff') {
    return asProjectRows(getSheetRowsByTabName(ss, TAB_NAME_ALIASES.COSTDIFF), projectId);
  }

  if (resource === 'karun_decisions') {
    return [
      ...asProjectRows(getSheetRowsByTabName(ss, TAB_NAME_ALIASES.DECISIONS_AC), projectId),
      ...asProjectRows(getSheetRowsByTabName(ss, TAB_NAME_ALIASES.DECISIONS_ELEC), projectId),
      ...asProjectRows(getSheetRowsByTabName(ss, TAB_NAME_ALIASES.DECISIONS_FACADE), projectId),
    ];
  }

  if (resource === 'karun_alerts') {
    return getSheetRowsByTabName(ss, TAB_NAME_ALIASES.ALERT_SETUP);
  }

  if (resource === 'karun_all') {
    return {
      alerts: getSheetRowsByTabName(ss, TAB_NAME_ALIASES.ALERT_SETUP),
      costdiff: asProjectRows(getSheetRowsByTabName(ss, TAB_NAME_ALIASES.COSTDIFF), projectId),
      dashboard: getSheetRowsByTabName(ss, TAB_NAME_ALIASES.DASHBOARD),
      decisions: [
        ...asProjectRows(getSheetRowsByTabName(ss, TAB_NAME_ALIASES.DECISIONS_AC), projectId),
        ...asProjectRows(getSheetRowsByTabName(ss, TAB_NAME_ALIASES.DECISIONS_ELEC), projectId),
        ...asProjectRows(getSheetRowsByTabName(ss, TAB_NAME_ALIASES.DECISIONS_FACADE), projectId),
      ],
      materials: asProjectRows(getSheetRowsByTabName(ss, TAB_NAME_ALIASES.MATERIALS), projectId),
      workscope: asProjectRows(getSheetRowsByTabName(ss, TAB_NAME_ALIASES.WORKSCOPE), projectId),
    };
  }

  return null;
}

function findRowIndexById(headers, values, idOrItemId) {
  const idColumns = ['ID', 'Item ID', 'item_id', 'id'];
  const columnIndexes = idColumns
    .map((columnName) => headers.indexOf(columnName))
    .filter((index) => index >= 0);

  if (!columnIndexes.length) return -1;
  const target = String(idOrItemId || '').trim();
  if (!target) return -1;

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    const matched = columnIndexes.some((index) => String(row[index] || '').trim() === target);
    if (matched) return rowIndex;
  }

  return -1;
}

function applyWhitelistedPatchToRow(sheet, rowIndex, headers, patch) {
  const before = {};
  const after = {};

  Object.keys(patch || {}).forEach((patchKey) => {
    const columnName = WORKSCOPE_PATCH_COLUMN_MAP[patchKey];
    if (!columnName) return;

    const colIndex = headers.indexOf(columnName);
    if (colIndex < 0) return;

    const current = sheet.getRange(rowIndex + 1, colIndex + 1).getValue();
    before[columnName] = current;
    sheet.getRange(rowIndex + 1, colIndex + 1).setValue(patch[patchKey]);
    after[columnName] = patch[patchKey];
  });

  return { before, after };
}

function updateAlertMarkersIfNeeded(sheet, rowIndex, headers, action) {
  if (action !== 'acknowledge_alert' && action !== 'run_alert_check') return;

  const lastAlertAtIndex = headers.indexOf('Last Alert At');
  if (lastAlertAtIndex >= 0) {
    sheet.getRange(rowIndex + 1, lastAlertAtIndex + 1).setValue(new Date());
  }

  const alertSentIndex = headers.indexOf('Alert Sent');
  if (alertSentIndex >= 0) {
    sheet.getRange(rowIndex + 1, alertSentIndex + 1).setValue('TRUE');
  }
}

function handleWrite(requestBody) {
  const action = String(requestBody.action || '').trim();
  if (!WRITE_ACTIONS.has(action)) {
    return fail('invalid_resource', `Unsupported action: ${action}`, false);
  }

  if (action.indexOf('delete') >= 0 || action.indexOf('bulk') >= 0) {
    return fail('invalid_resource', 'Delete and bulk overwrite are blocked.', false);
  }

  const projectId = String(requestBody.project_id || '').trim();
  const resource = String(requestBody.resource || '').trim();
  const rowId = String(requestBody.row_id || requestBody.item_id || '').trim();
  const patch = requestBody.patch || {};
  const updatedBy = String(requestBody.updated_by || '').trim();
  const updatedAt = toIso(requestBody.updated_at) || new Date().toISOString();
  const clientRequestId = String(requestBody.client_request_id || '').trim();

  if (!projectId || !resource || !rowId || !updatedBy || !clientRequestId) {
    return fail('invalid_response', 'Missing required write fields.', false);
  }

  const ss = getSpreadsheet();
  const sheet = getSheetByAlias(ss, TAB_NAME_ALIASES.WORKSCOPE);
  if (!sheet) {
    return fail('not_found', 'Sheet tab not found: 01 Work Scope Master', false);
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map((header) => String(header || '').trim());

  if (action === 'add_workscope_item') {
    const rowTemplate = headers.map((header) => {
      if (header === 'ID') return rowId;
      if (header === 'Project ID') return projectId;
      if (header === 'Updated At') return updatedAt;
      if (header === 'Updated By') return updatedBy;
      const patchKey = Object.keys(WORKSCOPE_PATCH_COLUMN_MAP).find((key) => WORKSCOPE_PATCH_COLUMN_MAP[key] === header);
      if (!patchKey) return '';
      return patch[patchKey] || '';
    });

    sheet.appendRow(rowTemplate);

    return ok(resource, {
      request: { action, client_request_id: clientRequestId, item_id: rowId },
      before: null,
      after: rowTemplate,
    }, updatedAt);
  }

  const rowIndex = findRowIndexById(headers, values, rowId);
  if (rowIndex < 0) {
    return fail('not_found', `No row found for ID/item_id: ${rowId}`, false);
  }

  const summary = applyWhitelistedPatchToRow(sheet, rowIndex, headers, patch);
  updateAlertMarkersIfNeeded(sheet, rowIndex, headers, action);

  const updatedAtIndex = headers.indexOf('Updated At');
  if (updatedAtIndex >= 0) {
    sheet.getRange(rowIndex + 1, updatedAtIndex + 1).setValue(updatedAt);
  }

  const updatedByIndex = headers.indexOf('Updated By');
  if (updatedByIndex >= 0) {
    sheet.getRange(rowIndex + 1, updatedByIndex + 1).setValue(updatedBy);
  }

  return ok(resource, {
    request: { action, client_request_id: clientRequestId, item_id: rowId },
    before: summary.before,
    after: summary.after,
  }, updatedAt);
}

function parseRequestBody(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw new Error(`Invalid JSON request body: ${error.message}`);
  }
}

function maybeRunAlertCheck() {
  // Optional integration point:
  // 1. Keep existing alert logic in the sheet untouched.
  // 2. If alerts should run after write, call that function here.
  // 3. Keep webhook endpoints in Script Properties, not source code.
}

function doGet(e) {
  try {
    const resource = String((e && e.parameter && e.parameter.resource) || 'karun_all').trim();
    const projectId = String((e && e.parameter && e.parameter.project_id) || 'KARUN-PHUKET-OLDTOWN').trim();

    if (!READ_RESOURCES.has(resource)) {
      return fail('invalid_resource', `Unsupported resource: ${resource}`, false);
    }

    const data = loadResource(resource, projectId);
    if (data === null || data === undefined) {
      return fail('invalid_resource', `No handler for resource: ${resource}`, false);
    }

    return ok(resource, data, new Date().toISOString());
  } catch (error) {
    return fail('unknown', error.message || 'Unhandled error in doGet.', false);
  }
}

function doPost(e) {
  try {
    const body = parseRequestBody(e);
    const response = handleWrite(body);

    if (body.action === 'run_alert_check' || body.patch?.alert_sent === true) {
      maybeRunAlertCheck();
    }

    return response;
  } catch (error) {
    return fail('invalid_response', error.message || 'Unhandled error in doPost.', false);
  }
}
