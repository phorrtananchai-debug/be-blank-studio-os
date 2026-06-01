import { getGoogleCorebaseProviderConfig } from './providerConfig.js';
import {
  KARUN_PROJECT_ID,
  createKarunWritePatchPayload,
  isBlockedKarunMutation,
  mapKarunAlertConfigRow,
  mapKarunCostDiffRow,
  mapKarunFacadeRow,
  mapKarunMaterialRow,
  mapKarunSystemRow,
  mapKarunWorkScopeMasterRow,
  sanitizeKarunPatch,
} from './karunPhuketSheetMap.js';
import { mapAlertRow } from './googleRowMappers.js';
import { mapReadonlyError } from './googleReadonlyAdapter.js';

const DEFAULT_UPDATED_BY = 'studio-os';

function buildResourceUrl(endpoint, resource, projectId = KARUN_PROJECT_ID) {
  const base = endpoint.includes('?') ? endpoint : `${endpoint}?`;
  const url = new URL(base, 'http://localhost');
  url.searchParams.set('resource', resource);
  if (projectId) {
    url.searchParams.set('project_id', projectId);
  }
  return endpoint.startsWith('http') ? url.toString().replace('http://localhost', '') : url.toString();
}

function asErrorPayload(error = {}) {
  const mapped = mapReadonlyError(error);
  return {
    code: mapped.code,
    message: mapped.message,
    retryable: mapped.retryable,
    suggestedRetryMs: mapped.suggestedRetryMs,
  };
}

async function safeFetchJson(fetchImpl, url, init, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, error: asErrorPayload({ code: 'invalid_response', message: 'Response is not valid JSON.' }) };
    }

    if (!response.ok || json?.ok === false) {
      return {
        ok: false,
        error: asErrorPayload(json?.error || { code: 'network_error', message: `HTTP ${response.status}` }),
      };
    }

    return {
      ok: true,
      data: json?.data,
      mode: json?.mode || 'karun-live-control',
      resource: json?.resource || '',
      updatedAt: json?.updated_at || new Date().toISOString(),
      raw: json,
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      return { ok: false, error: asErrorPayload({ code: 'timeout', message: 'Request timed out.' }) };
    }
    return { ok: false, error: asErrorPayload({ code: 'network_error', message: String(error?.message || 'Network request failed.') }) };
  } finally {
    clearTimeout(timer);
  }
}

function mapWorkScopeRows(rows = []) {
  return rows
    .map((row) => mapKarunWorkScopeMasterRow(row))
    .filter((item) => item.projectId === KARUN_PROJECT_ID);
}

function mapMaterialRows(rows = []) {
  return rows.map((row) => mapKarunMaterialRow(row));
}

function mapCostDiffRows(rows = []) {
  return rows.map((row) => mapKarunCostDiffRow(row));
}

function mapDecisionRowsFromSystem(rows = [], source = 'karun-system') {
  return rows.map((row) => mapKarunSystemRow(row, source).decisionLogItem);
}

function mapWorkScopeRowsFromSystem(rows = [], source = 'karun-system') {
  return rows.map((row) => ({
    ...mapKarunSystemRow(row, source).workScope,
    source,
  }));
}

function mapFacadeRows(rows = []) {
  return rows.map((row) => mapKarunFacadeRow(row));
}

function mapAlertRows(rows = []) {
  return rows.map((row) => mapAlertRow(row));
}

function normalizeWriteResult(result, fallbackItem = null) {
  if (!result.ok) {
    return {
      ok: false,
      errorCode: result.error.code,
      message: result.error.message,
      retryable: result.error.retryable,
      suggestedRetryMs: result.error.suggestedRetryMs,
    };
  }

  const responseData = result.data || {};
  const after = responseData.after || responseData.item || fallbackItem || null;
  return {
    ok: true,
    item: after,
    mode: result.mode || 'karun-live-control',
    resource: result.resource,
    summary: {
      after,
      before: responseData.before || null,
      request: responseData.request || null,
    },
    updatedAt: result.updatedAt,
  };
}

function withMockFallback({ action, item, message }) {
  return {
    fallback: 'mock',
    item,
    message,
    mode: 'mock',
    ok: true,
    resource: action,
    updatedAt: new Date().toISOString(),
  };
}

export function createKarunLiveControlAdapter(config = getGoogleCorebaseProviderConfig(), fetchImpl = fetch) {
  const status = {
    endpointConfigured: config.endpointConfigured,
    lastErrorCode: null,
    lastErrorMessage: '',
    lastSyncAt: null,
    mode: config.mode,
    readOnly: false,
    retryable: false,
    suggestedRetryMs: null,
  };

  function setError(error = null) {
    if (!error) {
      status.lastErrorCode = null;
      status.lastErrorMessage = '';
      status.retryable = false;
      status.suggestedRetryMs = null;
      return;
    }
    status.lastErrorCode = error.code;
    status.lastErrorMessage = error.message;
    status.retryable = Boolean(error.retryable);
    status.suggestedRetryMs = Number.isFinite(Number(error.suggestedRetryMs)) ? Number(error.suggestedRetryMs) : null;
  }

  async function getResource(resource, mapper) {
    if (!config.endpointConfigured || !config.endpoint) {
      return [];
    }

    const url = buildResourceUrl(config.endpoint, resource, KARUN_PROJECT_ID);
    const result = await safeFetchJson(fetchImpl, url, { method: 'GET' }, config.timeoutMs || 8000);
    if (!result.ok) {
      setError(result.error);
      return [];
    }

    status.lastSyncAt = result.updatedAt;
    setError(null);
    const rows = Array.isArray(result.data) ? result.data : [];
    return mapper(rows);
  }

  async function postAction(action, payload, fallbackItem) {
    if (isBlockedKarunMutation(action)) {
      return {
        ok: false,
        errorCode: 'invalid_resource',
        message: `${action} is blocked in karun-live-control mode.`,
        retryable: false,
      };
    }

    if (!config.endpointConfigured || !config.endpoint) {
      return withMockFallback({
        action,
        item: fallbackItem,
        message: 'Endpoint not configured. Applied in local mock fallback only.',
      });
    }

    const body = JSON.stringify(payload);
    const result = await safeFetchJson(
      fetchImpl,
      config.endpoint,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
      },
      config.timeoutMs || 8000,
    );

    if (!result.ok) {
      setError(result.error);
      return normalizeWriteResult(result, fallbackItem);
    }

    status.lastSyncAt = result.updatedAt;
    setError(null);
    return normalizeWriteResult(result, fallbackItem);
  }

  function buildPatchAction(action, itemId, patch = {}, options = {}) {
    const normalizedPatch = sanitizeKarunPatch({ ...patch, updated_at: new Date().toISOString() });
    return createKarunWritePatchPayload({
      action,
      itemId,
      patch: normalizedPatch,
      projectId: options.projectId || KARUN_PROJECT_ID,
      resource: options.resource || 'karun_workscope',
      updatedBy: options.updatedBy || DEFAULT_UPDATED_BY,
      clientRequestId: options.clientRequestId,
      updatedAt: options.updatedAt,
    });
  }

  return {
    getStatus() {
      return { ...status };
    },
    async listAlerts() {
      return getResource('karun_alerts', mapAlertRows);
    },
    async listAll() {
      return getResource('karun_all', (rows) => rows);
    },
    async listCostDiff() {
      const floorRows = await getResource('karun_costdiff', mapCostDiffRows);
      return floorRows;
    },
    async listDashboard() {
      return getResource('karun_dashboard', (rows) => rows);
    },
    async listDecisionLog() {
      const [airRows, electricRows, facadeRows, materialRows] = await Promise.all([
        getResource('karun_decisions', (rows) => rows),
        getResource('karun_decisions', (rows) => rows),
        getResource('karun_decisions', (rows) => rows),
        getResource('karun_materials', mapMaterialRows),
      ]);

      const decisions = [
        ...mapDecisionRowsFromSystem(airRows, 'karun-air-conditioning'),
        ...mapDecisionRowsFromSystem(electricRows, 'karun-electrical-meter-upgrade'),
        ...mapDecisionRowsFromSystem(facadeRows, 'karun-facade-front-elevation'),
        ...materialRows.map((item) => item.decisionLogItem),
      ];

      return decisions.filter(Boolean);
    },
    async listDocuments() {
      const rows = await getResource('karun_decisions', (items) => items.map((row) => mapKarunFacadeRow(row).documentItem));
      return rows.filter(Boolean);
    },
    async listImages() {
      const rows = await getResource('karun_materials', mapMaterialRows);
      return rows.map((item) => item.imageItem).filter(Boolean);
    },
    async listSettings() {
      return getResource('karun_alerts', (rows) => rows.map((row) => mapKarunAlertConfigRow(row)));
    },
    async listWorkScope() {
      const [masterRows, airRows, electricRows, facadeRows] = await Promise.all([
        getResource('karun_workscope', mapWorkScopeRows),
        getResource('karun_workscope', (rows) => mapWorkScopeRowsFromSystem(rows, 'karun-air-conditioning')),
        getResource('karun_workscope', (rows) => mapWorkScopeRowsFromSystem(rows, 'karun-electrical-meter-upgrade')),
        getResource('karun_workscope', (rows) => mapFacadeRows(rows).map((item) => item.workScope)),
      ]);

      return [...masterRows, ...airRows, ...electricRows, ...facadeRows];
    },
    async acknowledgeAlert(alertId, options = {}) {
      const payload = createKarunWritePatchPayload({
        action: 'acknowledge_alert',
        itemId: alertId,
        patch: {
          acknowledged: true,
          updated_at: new Date().toISOString(),
        },
        projectId: options.projectId || KARUN_PROJECT_ID,
        resource: 'karun_alerts',
        updatedBy: options.updatedBy || DEFAULT_UPDATED_BY,
        clientRequestId: options.clientRequestId,
      });
      return postAction('acknowledge_alert', payload, { id: alertId, acknowledged: true });
    },
    async addWorkScopeItem(payload = {}, options = {}) {
      const itemPayload = createKarunWritePatchPayload({
        action: 'add_workscope_item',
        itemId: payload.item_id || payload.id,
        patch: sanitizeKarunPatch({
          decision_needed: payload.decision_needed || payload.waiting_for || '',
          due_date: payload.due_date || payload.dueDate || '',
          notes: payload.notes || '',
          priority: payload.priority || 'NORMAL',
          responsible: payload.responsible || payload.assignee || '',
          status: payload.status || 'TODO',
          title: payload.title || 'Untitled task',
          updated_at: new Date().toISOString(),
        }),
        projectId: options.projectId || KARUN_PROJECT_ID,
        resource: 'karun_workscope',
        updatedBy: options.updatedBy || DEFAULT_UPDATED_BY,
        clientRequestId: options.clientRequestId,
      });

      return postAction('add_workscope_item', itemPayload, {
        id: payload.item_id || payload.id || `TASK-${Date.now()}`,
        projectId: options.projectId || KARUN_PROJECT_ID,
        title: payload.title || 'Untitled task',
      });
    },
    async runAlertCheck(itemId, options = {}) {
      const payload = createKarunWritePatchPayload({
        action: 'run_alert_check',
        itemId,
        patch: {
          alert_check_requested: true,
          updated_at: new Date().toISOString(),
        },
        projectId: options.projectId || KARUN_PROJECT_ID,
        resource: 'karun_alerts',
        updatedBy: options.updatedBy || DEFAULT_UPDATED_BY,
      });

      return postAction('run_alert_check', payload, { id: itemId, alert_check_requested: true });
    },
    async updateNotes(itemId, notes, options = {}) {
      return this.updateWorkScopeItem(itemId, { notes }, { ...options, action: 'update_notes' });
    },
    async updatePriority(itemId, priority, options = {}) {
      return this.updateWorkScopeItem(itemId, { priority }, { ...options, action: 'update_priority' });
    },
    async updateStatus(itemId, statusValue, options = {}) {
      return this.updateWorkScopeItem(itemId, { status: statusValue }, { ...options, action: 'update_status' });
    },
    async updateWorkScopeItem(itemId, patch = {}, options = {}) {
      const action = options.action || 'update_workscope_item';
      const payload = buildPatchAction(action, itemId, patch, options);
      return postAction(action, payload, {
        id: itemId,
        projectId: options.projectId || KARUN_PROJECT_ID,
        ...patch,
      });
    },
    blockedMutations: {
      bulkOverwrite: true,
      delete: true,
    },
    noBulkOverwrite() {
      return { ok: false, errorCode: 'invalid_resource', message: 'Bulk overwrite is blocked.' };
    },
    noDelete() {
      return { ok: false, errorCode: 'invalid_resource', message: 'Delete is blocked.' };
    },
  };
}

export function buildKarunWritePayloadForTest(action, itemId, patch, options = {}) {
  return createKarunWritePatchPayload({
    action,
    itemId,
    patch: sanitizeKarunPatch({ ...patch }),
    projectId: options.projectId || KARUN_PROJECT_ID,
    resource: options.resource || 'karun_workscope',
    updatedBy: options.updatedBy || DEFAULT_UPDATED_BY,
    clientRequestId: options.clientRequestId,
    updatedAt: options.updatedAt,
  });
}
