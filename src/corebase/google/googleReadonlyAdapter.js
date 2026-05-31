import { getGoogleCorebaseProviderConfig } from './providerConfig.js';
import {
  mapAlertRow,
  mapCalendarRow,
  mapCostDiffRow,
  mapDecisionLogRow,
  mapDocumentRow,
  mapImageRow,
  mapProjectRow,
  mapWorkScopeRow,
} from './googleRowMappers.js';

const KNOWN_ERROR_CODES = new Set([
  'auth_required',
  'rate_limited',
  'not_found',
  'invalid_resource',
  'invalid_response',
  'network_error',
  'timeout',
  'unknown',
]);

const ERROR_RETRY_HINTS = {
  auth_required: { retryable: false, suggestedRetryMs: null },
  invalid_resource: { retryable: false, suggestedRetryMs: null },
  invalid_response: { retryable: true, suggestedRetryMs: 30000 },
  network_error: { retryable: true, suggestedRetryMs: 10000 },
  not_found: { retryable: false, suggestedRetryMs: null },
  rate_limited: { retryable: true, suggestedRetryMs: 60000 },
  timeout: { retryable: true, suggestedRetryMs: 15000 },
  unknown: { retryable: false, suggestedRetryMs: 30000 },
};

function normalizeErrorCode(code) {
  const normalized = String(code || '').trim().toLowerCase();
  return KNOWN_ERROR_CODES.has(normalized) ? normalized : 'unknown';
}

export function mapReadonlyError(error = {}) {
  const normalizedCode = normalizeErrorCode(typeof error === 'string' ? error : error.code || error.name);
  const retryHint = ERROR_RETRY_HINTS[normalizedCode] || ERROR_RETRY_HINTS.unknown;

  if (typeof error === 'string') {
    return {
      code: normalizedCode,
      message: 'Google readonly request failed.',
      retryable: retryHint.retryable,
      suggestedRetryMs: retryHint.suggestedRetryMs,
    };
  }

  return {
    code: normalizedCode,
    message: String(error.message || 'Google readonly request failed.'),
    retryable: typeof error.retryable === 'boolean' ? error.retryable : retryHint.retryable,
    suggestedRetryMs: Number.isFinite(Number(error.suggestedRetryMs))
      ? Number(error.suggestedRetryMs)
      : retryHint.suggestedRetryMs,
  };
}

function buildResourceUrl(endpoint, resource, projectId) {
  const base = endpoint.includes('?') ? endpoint : `${endpoint}?`;
  const url = new URL(base, 'http://localhost');
  url.searchParams.set('resource', resource);
  if (projectId) {
    url.searchParams.set('project_id', projectId);
  }
  return endpoint.startsWith('http') ? url.toString().replace('http://localhost', '') : url.toString();
}

async function safeFetchJson(fetchImpl, url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { method: 'GET', signal: controller.signal });
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, error: mapReadonlyError({ code: 'invalid_response', message: 'Response is not valid JSON.' }) };
    }
    if (!response.ok) {
      return { ok: false, error: mapReadonlyError(json?.error || { code: 'network_error', message: `HTTP ${response.status}` }) };
    }
    if (!json?.ok || !Array.isArray(json?.data)) {
      return { ok: false, error: mapReadonlyError({ code: 'invalid_response', message: 'Response payload shape is invalid.' }) };
    }
    return { ok: true, resource: json.resource, updatedAt: json.updated_at || new Date().toISOString(), data: json.data };
  } catch (error) {
    if (error?.name === 'AbortError') {
      return { ok: false, error: mapReadonlyError({ code: 'timeout', message: 'Request timed out.' }) };
    }
    return { ok: false, error: mapReadonlyError({ code: 'network_error', message: String(error?.message || 'Network request failed.') }) };
  } finally {
    clearTimeout(timer);
  }
}

export function createGoogleReadonlyAdapter(config = getGoogleCorebaseProviderConfig(), fetchImpl = fetch) {
  const status = {
    endpointHost: '',
    endpointConfigured: config.endpointConfigured,
    fallback: null,
    lastErrorCode: null,
    lastErrorMessage: '',
    lastErrorRetryable: false,
    lastErrorSuggestedRetryMs: null,
    lastSyncAt: null,
    mode: config.mode,
    readOnly: true,
    stale: false,
  };

  async function loadResource(resource, mapper, projectId) {
    if (!config.endpointConfigured || !config.endpoint) {
      return [];
    }
    const url = buildResourceUrl(config.endpoint, resource, projectId);
    const result = await safeFetchJson(fetchImpl, url, config.timeoutMs);
    if (!result.ok) {
      status.lastErrorCode = result.error.code;
      status.lastErrorMessage = result.error.message;
      status.lastErrorRetryable = Boolean(result.error.retryable);
      status.lastErrorSuggestedRetryMs = Number.isFinite(Number(result.error.suggestedRetryMs))
        ? Number(result.error.suggestedRetryMs)
        : null;
      return [];
    }
    status.lastSyncAt = result.updatedAt;
    status.lastErrorCode = null;
    status.lastErrorMessage = '';
    status.lastErrorRetryable = false;
    status.lastErrorSuggestedRetryMs = null;
    return result.data.map((row) => mapper(row));
  }

  return {
    getStatus() {
      return { ...status };
    },
    async listAlerts(projectId) {
      return loadResource('alerts', mapAlertRow, projectId);
    },
    async listCalendar(projectId) {
      return loadResource('calendar', mapCalendarRow, projectId);
    },
    async listCostDiff(projectId) {
      return loadResource('costdiff', mapCostDiffRow, projectId);
    },
    async listDecisionLog(projectId) {
      return loadResource('decisionlog', mapDecisionLogRow, projectId);
    },
    async listDocuments(projectId) {
      return loadResource('documents', mapDocumentRow, projectId);
    },
    async listImages(projectId) {
      return loadResource('images', mapImageRow, projectId);
    },
    async listProjects() {
      return loadResource('projects', mapProjectRow);
    },
    async listWorkScope(projectId) {
      return loadResource('workscope', mapWorkScopeRow, projectId);
    },
  };
}

export { normalizeErrorCode };

