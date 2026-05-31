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

function normalizeErrorCode(code) {
  const normalized = String(code || '').trim().toLowerCase();
  return KNOWN_ERROR_CODES.has(normalized) ? normalized : 'unknown';
}

export function mapReadonlyError(error = {}) {
  if (typeof error === 'string') {
    return {
      code: normalizeErrorCode(error),
      message: 'Google readonly request failed.',
      retryable: false,
    };
  }

  return {
    code: normalizeErrorCode(error.code || error.name),
    message: String(error.message || 'Google readonly request failed.'),
    retryable: Boolean(error.retryable),
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
      return { ok: false, error: { code: 'invalid_response', message: 'Response is not valid JSON.', retryable: false } };
    }
    if (!response.ok) {
      return { ok: false, error: mapReadonlyError(json?.error || { code: 'network_error', message: `HTTP ${response.status}` }) };
    }
    if (!json?.ok || !Array.isArray(json?.data)) {
      return { ok: false, error: { code: 'invalid_response', message: 'Response payload shape is invalid.', retryable: false } };
    }
    return { ok: true, resource: json.resource, updatedAt: json.updated_at || new Date().toISOString(), data: json.data };
  } catch (error) {
    if (error?.name === 'AbortError') {
      return { ok: false, error: { code: 'timeout', message: 'Request timed out.', retryable: true } };
    }
    return { ok: false, error: mapReadonlyError({ code: 'network_error', message: String(error?.message || 'Network request failed.') }) };
  } finally {
    clearTimeout(timer);
  }
}

export function createGoogleReadonlyAdapter(config = getGoogleCorebaseProviderConfig(), fetchImpl = fetch) {
  const status = {
    endpointConfigured: config.endpointConfigured,
    lastErrorCode: null,
    lastErrorMessage: '',
    lastSyncAt: null,
    mode: config.mode,
    readOnly: true,
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
      return [];
    }
    status.lastSyncAt = result.updatedAt;
    status.lastErrorCode = null;
    status.lastErrorMessage = '';
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

