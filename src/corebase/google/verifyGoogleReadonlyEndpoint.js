import { createGoogleReadonlyAdapter } from './googleReadonlyAdapter.js';
import { getEndpointHost } from './googleReadonlyDiagnostics.js';
import { createKarunLiveControlAdapter } from './karunLiveControlAdapter.js';
import { getGoogleCorebaseProviderConfig } from './providerConfig.js';

const RESOURCE_HANDLERS = {
  alerts: {
    expectedKeys: ['id', 'level', 'message'],
    read: (adapter) => adapter.listAlerts(),
  },
  calendar: {
    expectedKeys: ['id', 'title', 'startAt', 'endAt'],
    read: (adapter) => adapter.listCalendar(),
  },
  documents: {
    expectedKeys: ['id', 'projectId', 'title', 'revision'],
    read: (adapter) => adapter.listDocuments(),
  },
  images: {
    expectedKeys: ['id', 'projectId', 'title', 'mediaType'],
    read: (adapter) => adapter.listImages(),
  },
  projects: {
    expectedKeys: ['id', 'name'],
    read: (adapter) => adapter.listProjects(),
  },
  workscope: {
    expectedKeys: ['id', 'projectId', 'title', 'status'],
    read: (adapter) => adapter.listWorkScope(),
  },
};

function buildResult({
  ok,
  mode,
  endpointConfigured,
  endpointHost,
  resource,
  errorCode,
  retryable,
  message,
  suggestedRetryMs,
  checks,
  firstItemId,
  rowCount,
  workscopeCount,
  workscopeFirstItemId,
  workscopeSource,
  calendarStatus,
  skippedResources,
} = {}) {
  return {
    checks,
    endpointConfigured: Boolean(endpointConfigured),
    endpointHost: endpointHost || '',
    errorCode: errorCode || undefined,
    message: message || '',
    mode: mode || 'mock',
    ok: Boolean(ok),
    resource: resource || undefined,
    firstItemId: firstItemId || undefined,
    retryable: typeof retryable === 'boolean' ? retryable : undefined,
    rowCount: Number.isFinite(Number(rowCount)) ? Number(rowCount) : undefined,
    suggestedRetryMs: Number.isFinite(Number(suggestedRetryMs)) ? Number(suggestedRetryMs) : undefined,
    workscopeCount: Number.isFinite(Number(workscopeCount)) ? Number(workscopeCount) : undefined,
    workscopeFirstItemId: workscopeFirstItemId || undefined,
    workscopeSource: workscopeSource || undefined,
    calendarStatus: calendarStatus || undefined,
    skippedResources: Array.isArray(skippedResources) ? skippedResources : undefined,
  };
}

function resolveDeps(deps = {}) {
  const providerConfig = deps.providerConfig || getGoogleCorebaseProviderConfig();
  const fetchImpl = deps.fetchImpl || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
  const safeFetch = fetchImpl || (async () => {
    throw new Error('fetch unavailable');
  });
  const adapter = deps.adapter || (
    providerConfig.mode === 'karun-live-control'
      ? createKarunLiveControlAdapter(providerConfig, safeFetch)
      : createGoogleReadonlyAdapter(providerConfig, safeFetch)
  );
  return { adapter, fetchImpl, providerConfig };
}

function checkRowShape(resource, rows) {
  const descriptor = RESOURCE_HANDLERS[resource];
  if (!descriptor) {
    return { errorCode: 'invalid_resource', message: `Unsupported resource: ${resource}`, ok: false };
  }

  if (!Array.isArray(rows)) {
    return { errorCode: 'invalid_response', message: `Resource ${resource} did not return an array.`, ok: false };
  }

  const expectedKeys = descriptor.expectedKeys || [];
  const firstRow = rows[0];
  if (firstRow && expectedKeys.some((key) => !Object.prototype.hasOwnProperty.call(firstRow, key))) {
    return { errorCode: 'invalid_response', message: `Resource ${resource} is missing expected keys.`, ok: false };
  }

  return { message: `${resource} shape looks valid.`, ok: true };
}

export function verifyEndpointConfigured(deps = {}) {
  const { providerConfig } = resolveDeps(deps);
  const mode = providerConfig.mode || 'mock';
  const endpointConfigured = Boolean(providerConfig.endpointConfigured && providerConfig.endpoint);

  if (!endpointConfigured) {
    return buildResult({
      ok: true,
      mode: 'mock',
      endpointConfigured: false,
      endpointHost: '',
      message: 'Google endpoint is not configured. Using mock mode.',
    });
  }

  return buildResult({
    ok: true,
    mode,
    endpointConfigured: true,
    endpointHost: getEndpointHost(providerConfig.endpoint),
    message: 'Google endpoint is configured.',
  });
}

export async function verifyResourceShape(resource, deps = {}) {
  const normalizedResource = String(resource || '').trim().toLowerCase();
  const descriptor = RESOURCE_HANDLERS[normalizedResource];
  const configured = verifyEndpointConfigured(deps);

  if (!descriptor) {
    return buildResult({
      ok: false,
      mode: configured.mode,
      endpointConfigured: configured.endpointConfigured,
      endpointHost: configured.endpointHost,
      resource: normalizedResource,
      errorCode: 'invalid_resource',
      retryable: false,
      message: `Unsupported resource: ${normalizedResource}`,
    });
  }

  if (!configured.endpointConfigured) {
    return buildResult({
      ok: true,
      mode: configured.mode,
      endpointConfigured: false,
      endpointHost: '',
      resource: normalizedResource,
      message: 'Endpoint is missing. Mock mode remains active.',
    });
  }

  const { adapter } = resolveDeps(deps);

  try {
    const rows = await descriptor.read(adapter);
    const shapeResult = checkRowShape(normalizedResource, rows);
    if (!shapeResult.ok) {
      return buildResult({
        ok: false,
        mode: configured.mode,
        endpointConfigured: true,
        endpointHost: configured.endpointHost,
        resource: normalizedResource,
        errorCode: shapeResult.errorCode,
        retryable: false,
        message: shapeResult.message,
      });
    }

    return buildResult({
      ok: true,
      mode: configured.mode,
      endpointConfigured: true,
      endpointHost: configured.endpointHost,
      resource: normalizedResource,
      firstItemId: rows[0]?.id ? String(rows[0].id) : undefined,
      message: `${normalizedResource} verified (${rows.length} row(s)).`,
      rowCount: rows.length,
    });
  } catch (error) {
    const status = adapter.getStatus?.() || {};
    return buildResult({
      ok: false,
      mode: configured.mode,
      endpointConfigured: true,
      endpointHost: configured.endpointHost,
      resource: normalizedResource,
      errorCode: status.lastErrorCode || 'unknown',
      retryable: status.lastErrorRetryable,
      suggestedRetryMs: status.lastErrorSuggestedRetryMs,
      message: status.lastErrorMessage || String(error?.message || 'Verification failed.'),
    });
  }
}

export async function verifyEndpointHealth(deps = {}) {
  const configured = verifyEndpointConfigured(deps);
  if (!configured.endpointConfigured) {
    return buildResult({
      ok: true,
      mode: configured.mode,
      endpointConfigured: false,
      endpointHost: '',
      resource: 'health',
      message: 'Endpoint not configured. Operating in mock mode.',
    });
  }

  const { fetchImpl, providerConfig } = resolveDeps(deps);
  if (!fetchImpl) {
    return buildResult({
      ok: false,
      mode: configured.mode,
      endpointConfigured: true,
      endpointHost: configured.endpointHost,
      resource: 'health',
      errorCode: 'network_error',
      retryable: true,
      suggestedRetryMs: 10000,
      message: 'Fetch is unavailable in this runtime.',
    });
  }

  const base = providerConfig.endpoint.includes('?') ? providerConfig.endpoint : `${providerConfig.endpoint}?`;
  const url = new URL(base, 'http://localhost');
  url.searchParams.set('resource', 'health');
  const target = providerConfig.endpoint.startsWith('http') ? url.toString().replace('http://localhost', '') : url.toString();

  try {
    const response = await fetchImpl(target, { method: 'GET' });
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return buildResult({
        ok: false,
        mode: configured.mode,
        endpointConfigured: true,
        endpointHost: configured.endpointHost,
        resource: 'health',
        errorCode: 'invalid_response',
        retryable: true,
        suggestedRetryMs: 30000,
        message: 'Health response is not valid JSON.',
      });
    }

    if (!response.ok) {
      const err = json?.error || {};
      return buildResult({
        ok: false,
        mode: configured.mode,
        endpointConfigured: true,
        endpointHost: configured.endpointHost,
        resource: 'health',
        errorCode: err.code || 'network_error',
        retryable: typeof err.retryable === 'boolean' ? err.retryable : false,
        message: err.message || `HTTP ${response.status}`,
      });
    }

    if (json?.ok && json?.resource === 'health') {
      return buildResult({
        ok: true,
        mode: configured.mode,
        endpointConfigured: true,
        endpointHost: configured.endpointHost,
        resource: 'health',
        message: 'Health resource verified.',
      });
    }

    if (json?.ok === false && json?.error?.code === 'invalid_resource') {
      return buildResult({
        ok: true,
        mode: configured.mode,
        endpointConfigured: true,
        endpointHost: configured.endpointHost,
        resource: 'health',
        message: 'Health resource unavailable. Fallback resource checks can still proceed.',
      });
    }

    return buildResult({
      ok: false,
      mode: configured.mode,
      endpointConfigured: true,
      endpointHost: configured.endpointHost,
      resource: 'health',
      errorCode: 'invalid_response',
      retryable: true,
      suggestedRetryMs: 30000,
      message: 'Health resource shape is invalid.',
    });
  } catch (error) {
    return buildResult({
      ok: false,
      mode: configured.mode,
      endpointConfigured: true,
      endpointHost: configured.endpointHost,
      resource: 'health',
      errorCode: 'network_error',
      retryable: true,
      suggestedRetryMs: 10000,
      message: String(error?.message || 'Health request failed.'),
    });
  }
}

export async function verifyAllCoreResources(deps = {}) {
  const configured = verifyEndpointConfigured(deps);

  if (!configured.endpointConfigured) {
    return buildResult({
      ok: true,
      mode: configured.mode,
      endpointConfigured: false,
      endpointHost: '',
      message: 'Endpoint not configured. Mock mode is active.',
      checks: [],
    });
  }

  if (configured.mode === 'karun-live-control') {
    const { adapter } = resolveDeps(deps);
    const checks = [];
    const skippedResources = [];

    const required = [
      { key: 'workscope', read: () => adapter.listWorkScope(), expectedKeys: ['id', 'projectId', 'title', 'status'] },
      { key: 'materials', read: () => adapter.listImages(), expectedKeys: ['id', 'projectId', 'title', 'mediaType'] },
      { key: 'costdiff', read: () => adapter.listCostDiff(), expectedKeys: ['id', 'projectId'] },
      { key: 'decisions', read: () => adapter.listDecisionLog(), expectedKeys: ['id', 'projectId', 'title'] },
      {
        key: 'alerts',
        read: async () => {
          if (typeof adapter.listAlerts === 'function') return adapter.listAlerts();
          if (typeof adapter.listAll === 'function') return adapter.listAll();
          return [];
        },
        expectedKeys: [],
      },
    ];

    for (const item of required) {
      try {
        const rows = await item.read();
        if (!Array.isArray(rows)) {
          return buildResult({
            ok: false,
            mode: configured.mode,
            endpointConfigured: true,
            endpointHost: configured.endpointHost,
            errorCode: 'invalid_response',
            message: `Verification failed on ${item.key}: response is not an array.`,
            checks,
          });
        }
        if (rows[0] && item.expectedKeys.some((key) => !Object.prototype.hasOwnProperty.call(rows[0], key))) {
          return buildResult({
            ok: false,
            mode: configured.mode,
            endpointConfigured: true,
            endpointHost: configured.endpointHost,
            errorCode: 'invalid_response',
            message: `Verification failed on ${item.key}: missing expected keys.`,
            checks,
          });
        }
        checks.push(buildResult({
          ok: true,
          mode: configured.mode,
          endpointConfigured: true,
          endpointHost: configured.endpointHost,
          resource: item.key,
          rowCount: rows.length,
          firstItemId: rows[0]?.id ? String(rows[0].id) : undefined,
          message: `${item.key} verified (${rows.length} row(s)).`,
        }));
      } catch (error) {
        const status = adapter.getStatus?.() || {};
        return buildResult({
          ok: false,
          mode: configured.mode,
          endpointConfigured: true,
          endpointHost: configured.endpointHost,
          errorCode: status.lastErrorCode || 'unknown',
          retryable: status.lastErrorRetryable,
          suggestedRetryMs: status.lastErrorSuggestedRetryMs,
          message: `Verification failed on ${item.key}: ${status.lastErrorMessage || String(error?.message || 'unknown error')}`,
          checks,
        });
      }
    }

    checks.push(buildResult({
      ok: true,
      mode: configured.mode,
      endpointConfigured: true,
      endpointHost: configured.endpointHost,
      resource: 'calendar',
      message: 'Calendar verification skipped for Karun live-control mode',
    }));
    skippedResources.push('calendar');

    const workScopeCheck = checks.find((check) => check.resource === 'workscope');
    const workscopeCount = workScopeCheck?.rowCount || 0;
    const workscopeFirstItemId = workScopeCheck?.firstItemId;
    const workscopeSource = adapter.getStatus?.().lastWorkScopeSource || 'karun_workscope';
    if (!workscopeCount) {
      return buildResult({
        ok: false,
        mode: configured.mode,
        endpointConfigured: true,
        endpointHost: configured.endpointHost,
        errorCode: 'not_found',
        message: 'Verification failed on workscope: no rows available.',
        checks,
        workscopeCount,
        workscopeFirstItemId,
        workscopeSource,
        calendarStatus: 'skipped',
        skippedResources,
      });
    }

    return buildResult({
      ok: true,
      mode: configured.mode,
      endpointConfigured: true,
      endpointHost: configured.endpointHost,
      resource: 'all',
      message: 'Karun live-control verification passed. Calendar verification skipped for Karun live-control mode',
      checks,
      workscopeCount,
      workscopeFirstItemId,
      workscopeSource,
      calendarStatus: 'skipped',
      skippedResources,
    });
  }

  const health = await verifyEndpointHealth(deps);
  const resources = Object.keys(RESOURCE_HANDLERS);
  const checks = [];

  for (const resource of resources) {
    const result = await verifyResourceShape(resource, deps);
    checks.push(result);
  }

  const failed = checks.find((check) => !check.ok);
  const workScopeCheck = checks.find((check) => check.resource === 'workscope');
  const workscopeCount = workScopeCheck?.rowCount;
  const workscopeFirstItemId = workScopeCheck?.firstItemId;
  if (failed) {
    return buildResult({
      ok: false,
      mode: configured.mode,
      endpointConfigured: true,
      endpointHost: configured.endpointHost,
      errorCode: failed.errorCode,
      retryable: failed.retryable,
      suggestedRetryMs: failed.suggestedRetryMs,
      message: `Verification failed on ${failed.resource}: ${failed.message}`,
      checks: [health, ...checks],
      workscopeCount,
      workscopeFirstItemId,
    });
  }

  return buildResult({
    ok: true,
    mode: configured.mode,
    endpointConfigured: true,
    endpointHost: configured.endpointHost,
    resource: 'all',
    message: 'All core resources verified for read-only mode.',
    checks: [health, ...checks],
    workscopeCount,
    workscopeFirstItemId,
  });
}
