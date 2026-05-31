const PROJECT_ID_ALIASES = {
  'KARUN-PHUKET-OLDTOWN': ['karun-phuket', 'karun-phuket-oldtown'],
  'KARUN-CENTRAL-KHONKAEN': ['karun-central-khonkaen'],
  'AVERY-GAYSORN-AMARIN': ['avery-gaysorn-amarin'],
  'ULTIMATE-BKK': ['ultimate-bkk'],
};

const ALIAS_TO_CANONICAL = Object.entries(PROJECT_ID_ALIASES).reduce((acc, [canonical, aliases]) => {
  acc[canonical.toLowerCase()] = canonical;
  aliases.forEach((alias) => {
    acc[String(alias).toLowerCase()] = canonical;
  });
  return acc;
}, {});

function field(row = {}, ...keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== '') {
      return row[key];
    }
  }
  return undefined;
}

function toIsoMaybe(value) {
  if (value === null || value === undefined || String(value).trim() === '') return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || String(value).trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value, fallback = false) {
  if (value === null || value === undefined || String(value).trim() === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  return fallback;
}

export function normalizeProjectId(projectId) {
  const normalized = String(projectId || '').trim();
  if (!normalized) return 'UNASSIGNED';
  return ALIAS_TO_CANONICAL[normalized.toLowerCase()] || normalized;
}

export function normalizeTaskStatus(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'OPEN') return 'TODO';
  if (normalized === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (normalized === 'WAITING') return 'WAITING';
  if (normalized === 'BLOCKED') return 'BLOCKED';
  if (normalized === 'DONE') return 'DONE';
  return 'TODO';
}

export function normalizeDocumentStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'review') return 'Review';
  if (normalized === 'approved') return 'Approved';
  if (normalized === 'superseded') return 'Superseded';
  return 'Draft';
}

export function normalizeAlertLevel(level) {
  const normalized = String(level || '').trim().toUpperCase();
  if (['SAFE', 'WATCH', 'RISK', 'CRITICAL'].includes(normalized)) return normalized;
  return 'WATCH';
}

export function normalizeMediaType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['image', 'pdf', 'board'].includes(normalized)) return normalized;
  return 'image';
}

export function mapProjectRow(row = {}) {
  return {
    aliases: [field(row, 'alias', 'project_alias')].filter(Boolean),
    id: normalizeProjectId(field(row, 'project_id', 'id')),
    name: String(field(row, 'project_name', 'name') || 'Untitled Project'),
    phase: String(field(row, 'phase', 'project_phase') || 'concept'),
  };
}

export function mapWorkScopeRow(row = {}) {
  return {
    assignee: String(field(row, 'assignee') || ''),
    dueDate: field(row, 'due_date', 'dueDate') || undefined,
    id: String(field(row, 'task_id', 'id') || `TASK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`),
    notes: String(field(row, 'notes', 'description') || ''),
    priority: String(field(row, 'priority') || 'NORMAL').toUpperCase(),
    projectId: normalizeProjectId(field(row, 'project_id', 'projectId')),
    status: normalizeTaskStatus(field(row, 'status')),
    title: String(field(row, 'task_title', 'title') || 'Untitled task'),
    updatedAt: toIsoMaybe(field(row, 'updated_at', 'updatedAt')) || new Date().toISOString(),
  };
}

export function mapDecisionLogRow(row = {}) {
  return {
    body: String(field(row, 'body', 'content', 'notes') || ''),
    createdAt: toIsoMaybe(field(row, 'created_at', 'createdAt')) || new Date().toISOString(),
    id: String(field(row, 'decision_id', 'id') || `DEC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`),
    projectId: normalizeProjectId(field(row, 'project_id', 'projectId')),
    source: String(field(row, 'source') || 'google-readonly'),
    title: String(field(row, 'title', 'decision_title') || 'Decision log item'),
    type: String(field(row, 'type') || 'decision'),
  };
}

export function mapCostDiffRow(row = {}) {
  const baselineCost = toNumber(field(row, 'baseline_cost'));
  const currentCost = toNumber(field(row, 'current_cost'));
  return {
    baselineCost,
    currentCost,
    delta: toNumber(field(row, 'delta'), currentCost - baselineCost),
    id: String(field(row, 'cost_diff_id', 'id') || `COST-${Math.random().toString(36).slice(2, 8).toUpperCase()}`),
    projectId: normalizeProjectId(field(row, 'project_id')),
    updatedAt: toIsoMaybe(field(row, 'updated_at')) || new Date().toISOString(),
  };
}

export function mapAlertRow(row = {}) {
  return {
    createdAt: toIsoMaybe(field(row, 'created_at')) || new Date().toISOString(),
    id: String(field(row, 'alert_id', 'id') || `ALERT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`),
    level: normalizeAlertLevel(field(row, 'level', 'status')),
    message: String(field(row, 'message', 'title') || 'Operational alert'),
    projectId: normalizeProjectId(field(row, 'project_id')),
    source: 'operational-pressure',
  };
}

export function mapDocumentRow(row = {}) {
  return {
    id: String(field(row, 'document_id', 'id') || `DOC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`),
    legacySource: String(field(row, 'source') || 'google-readonly'),
    owner: String(field(row, 'owner') || ''),
    projectId: normalizeProjectId(field(row, 'project_id')),
    revision: String(field(row, 'revision', 'version') || 'R0'),
    status: normalizeDocumentStatus(field(row, 'status')),
    title: String(field(row, 'title', 'document_title') || 'Untitled document'),
    updatedAt: toIsoMaybe(field(row, 'updated_at')) || new Date().toISOString(),
    url: String(field(row, 'url', 'link') || ''),
  };
}

export function mapImageRow(row = {}) {
  return {
    id: String(field(row, 'image_id', 'id') || `IMG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`),
    legacySource: String(field(row, 'source') || 'google-readonly'),
    mediaType: normalizeMediaType(field(row, 'media_type', 'type')),
    previewUrl: String(field(row, 'preview_url', 'thumbnail_url', 'url') || ''),
    projectId: normalizeProjectId(field(row, 'project_id')),
    role: String(field(row, 'role') || 'board'),
    title: String(field(row, 'title', 'name') || 'Artwork'),
    updatedAt: toIsoMaybe(field(row, 'updated_at')) || new Date().toISOString(),
  };
}

export function mapCalendarRow(row = {}) {
  const startAt = toIsoMaybe(field(row, 'start_at', 'start_time'));
  const endAt = toIsoMaybe(field(row, 'end_at', 'end_time'));
  return {
    category: String(field(row, 'category') || 'timeline'),
    id: String(field(row, 'event_id', 'id') || `EVT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`),
    legacySource: String(field(row, 'source') || 'google-readonly'),
    location: String(field(row, 'location') || ''),
    projectId: normalizeProjectId(field(row, 'project_id')),
    startAt: startAt || new Date().toISOString(),
    endAt: endAt || startAt || new Date().toISOString(),
    title: String(field(row, 'title', 'event_title') || 'Calendar event'),
  };
}

export function mapSettingsRow(row = {}) {
  return {
    active: toBoolean(field(row, 'active'), true),
    acknowledged: toBoolean(field(row, 'acknowledged'), false),
    key: String(field(row, 'key') || ''),
    value: String(field(row, 'value') || ''),
  };
}

