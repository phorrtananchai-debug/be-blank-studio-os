import {
  normalizeAlertLevel,
  normalizeDocumentStatus,
  normalizeProjectId,
  normalizeTaskStatus,
} from './googleRowMappers.js';

export const KARUN_PROJECT_ID = 'KARUN-PHUKET-OLDTOWN';

export const KARUN_SHEET_TAB_ALIASES = {
  alertAutomationSetup: ['Alert Automation Setup'],
  dashboard: ['Dashboard', 'main summary area'],
  materialBoard: ['02 Material Board'],
  systemAirConditioning: ['04 Air Conditioning System'],
  systemElectrical: ['05 Electrical / Meter Upgrade'],
  systemFacade: ['06 Facade / Front Elevation'],
  workScopeCostDiff: ['03 Flooring Diff - 2F / Kitchen'],
  workScopeMaster: ['01 Work Scope Master'],
};

const MATERIAL_TO_DECISION_STATUS = {
  approved: 'DONE',
  rejected: 'BLOCKED',
  review: 'WAITING',
};

function readField(row = {}, keys = []) {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
    const value = row[key];
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    return value;
  }
  return undefined;
}

function asString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}

function asIsoOrUndefined(value) {
  if (value === null || value === undefined || String(value).trim() === '') return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function asNumber(value, fallback = 0) {
  if (value === null || value === undefined || String(value).trim() === '') return fallback;
  const parsed = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBoolean(value, fallback = false) {
  if (value === null || value === undefined || String(value).trim() === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  return fallback;
}

function resolveProjectId(row = {}) {
  const explicitProjectId = readField(row, ['Project ID', 'Project', 'project_id', 'projectId']);
  return normalizeProjectId(explicitProjectId || KARUN_PROJECT_ID);
}

function resolveItemId(prefix, value) {
  const raw = asString(value || '');
  if (raw) return raw;
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function mapKarunWorkScopeMasterRow(row = {}) {
  const decisionText = asString(readField(row, ['Decision Needed', 'decision_needed', 'waiting_for', 'blocker']) || '');
  const statusRaw = asString(readField(row, ['Status', 'status']) || 'OPEN');
  return {
    alertChannel: asString(readField(row, ['Alert Channel', 'alert_channel']) || ''),
    alertNote: asString(readField(row, ['Alert Note', 'alert_note']) || ''),
    alertSent: asBoolean(readField(row, ['Alert Sent', 'alert_sent']), false),
    area: asString(readField(row, ['Area / Location', 'area', 'location']) || ''),
    assignee: asString(readField(row, ['Responsible', 'responsible', 'assignee']) || ''),
    blockedBy: decisionText,
    category: asString(readField(row, ['Category', 'category']) || ''),
    decisionNeeded: decisionText,
    dueDate: asString(readField(row, ['Due / Target', 'due_date', 'dueDate']) || ''),
    estimatedDiff: asNumber(readField(row, ['Estimated Diff (THB)', 'estimated_diff', 'delta']), 0),
    id: resolveItemId('TASK', readField(row, ['ID', 'item_id', 'id'])),
    lastAlertAt: asIsoOrUndefined(readField(row, ['Last Alert At', 'last_alert_at'])) || undefined,
    notes: asString(readField(row, ['Notes', 'notes']) || ''),
    phase: asString(readField(row, ['Phase', 'phase']) || ''),
    priority: asString(readField(row, ['Priority', 'priority']) || 'NORMAL').toUpperCase(),
    projectId: resolveProjectId(row),
    responsible: asString(readField(row, ['Responsible', 'responsible']) || ''),
    status: normalizeTaskStatus(statusRaw),
    title: asString(readField(row, ['Item / Scope', 'title', 'task_title']) || 'Untitled task'),
    updatedAt: asIsoOrUndefined(readField(row, ['Updated At', 'updated_at'])) || new Date().toISOString(),
    waitingFor: decisionText,
  };
}

export function mapKarunMaterialRow(row = {}) {
  const id = resolveItemId('MAT', readField(row, ['ID', 'Material ID', 'id']));
  const projectId = resolveProjectId(row);
  const materialName = asString(readField(row, ['Material', 'Name', 'Item', 'title']) || 'Material selection');
  const state = asString(readField(row, ['Status', 'State', 'state']) || 'review').toLowerCase();
  const imageUrl = asString(readField(row, ['Image URL', 'Image', 'Preview URL', 'url']) || '');
  const updatedAt = asIsoOrUndefined(readField(row, ['Updated At', 'updated_at'])) || new Date().toISOString();

  return {
    decisionLogItem: {
      body: asString(readField(row, ['Notes', 'Decision Note', 'note']) || ''),
      createdAt: updatedAt,
      id: `DEC-${id}`,
      projectId,
      source: 'karun-material-board',
      status: MATERIAL_TO_DECISION_STATUS[state] || 'WAITING',
      title: `${materialName} material decision`,
      type: 'decision',
    },
    imageItem: {
      id: `IMG-${id}`,
      mediaType: 'image',
      previewUrl: imageUrl,
      projectId,
      role: 'board',
      title: materialName,
      updatedAt,
    },
    material: {
      category: asString(readField(row, ['Category', 'category']) || ''),
      id,
      name: materialName,
      notes: asString(readField(row, ['Notes', 'note']) || ''),
      projectId,
      status: state,
      supplier: asString(readField(row, ['Supplier', 'Vendor']) || ''),
      updatedAt,
      url: imageUrl,
    },
  };
}

export function mapKarunCostDiffRow(row = {}) {
  const projectId = resolveProjectId(row);
  const baselineCost = asNumber(readField(row, ['Baseline Cost (THB)', 'Baseline', 'baseline_cost']), 0);
  const currentCost = asNumber(readField(row, ['Current Cost (THB)', 'Current', 'current_cost']), 0);
  return {
    baselineCost,
    category: asString(readField(row, ['Category', 'Scope']) || ''),
    currentCost,
    delta: asNumber(readField(row, ['Diff (THB)', 'Estimated Diff (THB)', 'delta']), currentCost - baselineCost),
    id: resolveItemId('COST', readField(row, ['ID', 'cost_diff_id', 'id'])),
    notes: asString(readField(row, ['Notes', 'note']) || ''),
    projectId,
    title: asString(readField(row, ['Item / Scope', 'Item', 'title']) || 'Cost diff item'),
    updatedAt: asIsoOrUndefined(readField(row, ['Updated At', 'updated_at'])) || new Date().toISOString(),
  };
}

export function mapKarunSystemRow(row = {}, source = 'karun-system') {
  const workScope = mapKarunWorkScopeMasterRow(row);
  const decisionText = asString(readField(row, ['Decision Needed', 'Notes', 'decision_needed']) || '');
  const updatedAt = asIsoOrUndefined(readField(row, ['Updated At', 'updated_at'])) || new Date().toISOString();

  const decisionLogItem = {
    body: decisionText,
    createdAt: updatedAt,
    id: `DEC-${workScope.id}`,
    projectId: workScope.projectId,
    source,
    title: workScope.title,
    type: decisionText ? 'decision' : 'site-update',
  };

  const costDiffItem = {
    baselineCost: 0,
    currentCost: workScope.estimatedDiff || 0,
    delta: workScope.estimatedDiff || 0,
    id: `COST-${workScope.id}`,
    projectId: workScope.projectId,
    updatedAt,
  };

  return {
    costDiffItem,
    decisionLogItem,
    workScope,
  };
}

export function mapKarunFacadeRow(row = {}) {
  const system = mapKarunSystemRow(row, 'karun-facade-front-elevation');
  const documentItem = {
    id: `DOC-${system.workScope.id}`,
    projectId: system.workScope.projectId,
    revision: asString(readField(row, ['Revision', 'Version']) || 'R0'),
    status: normalizeDocumentStatus(readField(row, ['Document Status', 'Status'])) || 'Draft',
    title: asString(readField(row, ['Document', 'Drawing', 'Title']) || system.workScope.title),
    updatedAt: system.workScope.updatedAt,
    url: asString(readField(row, ['Document URL', 'Link', 'url']) || ''),
  };

  const imageUrl = asString(readField(row, ['Image URL', 'Preview URL', 'Image']) || '');
  const imageItem = {
    id: `IMG-${system.workScope.id}`,
    mediaType: 'image',
    previewUrl: imageUrl,
    projectId: system.workScope.projectId,
    role: 'board',
    title: `${system.workScope.title} facade`,
    updatedAt: system.workScope.updatedAt,
  };

  return {
    ...system,
    documentItem,
    imageItem,
  };
}

export function mapKarunAlertConfigRow(row = {}) {
  return {
    active: asBoolean(readField(row, ['Active', 'active']), true),
    alertChannel: asString(readField(row, ['Alert Channel', 'Channel', 'alert_channel']) || ''),
    acknowledged: asBoolean(readField(row, ['Acknowledged', 'acknowledged']), false),
    key: asString(readField(row, ['Key', 'Setting']) || ''),
    level: normalizeAlertLevel(readField(row, ['Level', 'level'])),
    projectId: resolveProjectId(row),
    value: asString(readField(row, ['Value', 'value']) || ''),
  };
}

export function createKarunWritePatchPayload({
  action,
  resource,
  itemId,
  patch = {},
  projectId = KARUN_PROJECT_ID,
  updatedBy = 'studio-os',
  rowId,
  clientRequestId,
  updatedAt,
} = {}) {
  const now = updatedAt || new Date().toISOString();
  const requestId = clientRequestId || `karun-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    action,
    client_request_id: requestId,
    item_id: itemId || rowId || '',
    patch,
    project_id: normalizeProjectId(projectId || KARUN_PROJECT_ID),
    resource,
    row_id: rowId || itemId || '',
    updated_at: now,
    updated_by: updatedBy,
  };
}

export function isBlockedKarunMutation(action = '') {
  const normalizedAction = String(action || '').trim().toLowerCase();
  return normalizedAction.includes('delete') || normalizedAction.includes('bulk');
}

export function sanitizeKarunPatch(patch = {}) {
  const whitelist = new Set([
    'alert_channel',
    'alert_note',
    'alert_sent',
    'decision_needed',
    'due_date',
    'notes',
    'priority',
    'responsible',
    'status',
    'title',
    'updated_at',
    'waiting_for',
  ]);

  return Object.entries(patch).reduce((acc, [key, value]) => {
    const normalized = String(key || '').trim();
    if (!whitelist.has(normalized)) return acc;
    acc[normalized] = value;
    return acc;
  }, {});
}
