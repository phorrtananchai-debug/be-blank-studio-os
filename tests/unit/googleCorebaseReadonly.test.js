import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  mapReadonlyError,
  createGoogleReadonlyAdapter,
  normalizeErrorCode,
} from '../../src/corebase/google/googleReadonlyAdapter.js';
import { getEndpointHost, getGoogleReadonlyDiagnostics } from '../../src/corebase/google/googleReadonlyDiagnostics.js';
import {
  getGoogleCorebaseProviderConfig,
  getGoogleCorebaseRuntimeOverride,
  setGoogleCorebaseRuntimeOverride,
  clearGoogleCorebaseRuntimeOverride,
} from '../../src/corebase/google/providerConfig.js';
import {
  mapAlertRow,
  mapCalendarRow,
  mapDocumentRow,
  mapProjectRow,
  mapSettingsRow,
  mapWorkScopeRow,
} from '../../src/corebase/google/googleRowMappers.js';
import {
  verifyAllCoreResources,
  verifyEndpointConfigured,
  verifyEndpointHealth,
  verifyResourceShape,
} from '../../src/corebase/google/verifyGoogleReadonlyEndpoint.js';

test('provider config defaults to mock without endpoint', () => {
  const config = getGoogleCorebaseProviderConfig({});

  assert.equal(config.mode, 'mock');
  assert.equal(config.endpointConfigured, false);
  assert.equal(config.endpoint, '');
  assert.equal(config.timeoutMs, 8000);
});

test('provider config switches to google-readonly when endpoint exists', () => {
  const config = getGoogleCorebaseProviderConfig({
    VITE_GOOGLE_COREBASE_ENDPOINT: 'https://script.google.com/macros/s/mock/exec',
  });

  assert.equal(config.mode, 'google-readonly');
  assert.equal(config.endpointConfigured, true);
  assert.equal(config.endpoint, 'https://script.google.com/macros/s/mock/exec');
});

test('provider config uses runtime override when env endpoint is absent', () => {
  const previousWindow = globalThis.window;
  const store = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      removeItem: (key) => store.delete(key),
      setItem: (key, value) => store.set(key, String(value)),
    },
  };

  setGoogleCorebaseRuntimeOverride({
    mode: 'karun-live-control',
    endpoint: 'https://script.google.com/macros/s/runtime/exec',
  });
  const override = getGoogleCorebaseRuntimeOverride();
  assert.equal(override.mode, 'karun-live-control');

  const config = getGoogleCorebaseProviderConfig({});
  assert.equal(config.mode, 'karun-live-control');
  assert.equal(config.endpointConfigured, true);
  assert.equal(config.overrideActive, true);
  assert.equal(config.source, 'localStorage-override');

  clearGoogleCorebaseRuntimeOverride();
  globalThis.window = previousWindow;
});

test('provider config keeps env priority over runtime override', () => {
  const previousWindow = globalThis.window;
  const store = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      removeItem: (key) => store.delete(key),
      setItem: (key, value) => store.set(key, String(value)),
    },
  };

  setGoogleCorebaseRuntimeOverride({
    mode: 'mock',
    endpoint: 'https://script.google.com/macros/s/override/exec',
  });

  const config = getGoogleCorebaseProviderConfig({
    VITE_GOOGLE_COREBASE_MODE: 'karun-live-control',
    VITE_GOOGLE_COREBASE_ENDPOINT: 'https://script.google.com/macros/s/env/exec',
  });

  assert.equal(config.source, 'env');
  assert.equal(config.mode, 'karun-live-control');
  assert.equal(config.endpoint, 'https://script.google.com/macros/s/env/exec');
  assert.equal(config.endpointConfigured, true);

  clearGoogleCorebaseRuntimeOverride();
  globalThis.window = previousWindow;
});

test('google readonly adapter returns safe fallback without endpoint', async () => {
  const adapter = createGoogleReadonlyAdapter({
    mode: 'mock',
    endpoint: '',
    endpointConfigured: false,
    timeoutMs: 100,
  }, async () => {
    throw new Error('should not fetch without endpoint');
  });

  const [projects, documents] = await Promise.all([
    adapter.listProjects(),
    adapter.listDocuments('KARUN-PHUKET-OLDTOWN'),
  ]);

  assert.deepEqual(projects, []);
  assert.deepEqual(documents, []);
  const status = adapter.getStatus();
  assert.equal(status.mode, 'mock');
  assert.equal(status.endpointConfigured, false);
  assert.equal(status.lastErrorCode, null);
});

test('google readonly adapter maps invalid JSON as invalid_response', async () => {
  const adapter = createGoogleReadonlyAdapter({
    mode: 'google-readonly',
    endpoint: 'https://example.com/exec',
    endpointConfigured: true,
    timeoutMs: 500,
  }, async () => ({
    ok: true,
    status: 200,
    text: async () => 'not json',
  }));

  const rows = await adapter.listProjects();
  assert.deepEqual(rows, []);
  const status = adapter.getStatus();
  assert.equal(status.lastErrorCode, 'invalid_response');
});

test('error mapper normalizes known and unknown error codes', () => {
  assert.equal(normalizeErrorCode('auth_required'), 'auth_required');
  assert.equal(normalizeErrorCode('AUTH_REQUIRED'), 'auth_required');
  assert.equal(normalizeErrorCode('unexpected_code'), 'unknown');

  const mappedKnown = mapReadonlyError({ code: 'rate_limited', message: 'Too many requests', retryable: true });
  assert.equal(mappedKnown.code, 'rate_limited');
  assert.equal(mappedKnown.retryable, true);
  assert.equal(mappedKnown.suggestedRetryMs, 60000);

  const mappedUnknown = mapReadonlyError({ code: 'mystery', message: 'x' });
  assert.equal(mappedUnknown.code, 'unknown');
  assert.equal(mappedUnknown.suggestedRetryMs, 30000);
});

test('row mappers handle missing optional fields safely', () => {
  const project = mapProjectRow({ project_id: 'karun-phuket' });
  const task = mapWorkScopeRow({ project_id: '', task_title: '', status: 'OPEN' });
  const document = mapDocumentRow({ project_id: 'KARUN-PHUKET-OLDTOWN', status: 'unknown' });
  const alert = mapAlertRow({});
  const calendar = mapCalendarRow({});

  assert.equal(project.id, 'KARUN-PHUKET-OLDTOWN');
  assert.equal(project.name, 'Untitled Project');

  assert.equal(task.projectId, 'UNASSIGNED');
  assert.equal(task.title, 'Untitled task');
  assert.equal(task.status, 'TODO');
  assert.ok(task.id.startsWith('TASK-'));

  assert.equal(document.title, 'Untitled document');
  assert.equal(document.status, 'Draft');
  assert.equal(document.revision, 'R0');

  assert.equal(alert.level, 'WATCH');
  assert.equal(alert.source, 'operational-pressure');

  assert.equal(calendar.title, 'Calendar event');
  assert.ok(calendar.startAt);
  assert.ok(calendar.endAt);
});

test('settings row booleans parse from string values', () => {
  const enabled = mapSettingsRow({ key: 'readOnly', value: 'true', active: 'YES', acknowledged: '0' });
  const disabled = mapSettingsRow({ key: 'alerts', value: 'false', active: 'no', acknowledged: '1' });

  assert.equal(enabled.active, true);
  assert.equal(enabled.acknowledged, false);
  assert.equal(disabled.active, false);
  assert.equal(disabled.acknowledged, true);
});

test('diagnostics exposes endpoint host only', () => {
  assert.equal(getEndpointHost('https://script.google.com/macros/s/example-id/exec?x=1'), 'script.google.com');

  const diagnostics = getGoogleReadonlyDiagnostics({
    adapterStatus: {
      endpointConfigured: true,
      mode: 'google-readonly',
    },
    providerConfig: {
      endpoint: 'https://script.google.com/macros/s/private-token/exec?key=123',
      endpointConfigured: true,
      mode: 'google-readonly',
    },
  });

  assert.equal(diagnostics.endpointHost, 'script.google.com');
  assert.equal(diagnostics.endpointHost.includes('private-token'), false);
  assert.equal(diagnostics.endpointHost.includes('key='), false);
});

test('diagnostics marks stale fallback when readonly errors and mock fallback is used', () => {
  const diagnostics = getGoogleReadonlyDiagnostics({
    adapterStatus: {
      lastErrorCode: 'network_error',
      lastErrorRetryable: true,
      lastErrorSuggestedRetryMs: 10000,
      mode: 'google-readonly',
    },
    fallback: 'mock',
    providerConfig: {
      endpoint: 'https://script.google.com/macros/s/example/exec',
      endpointConfigured: true,
      mode: 'google-readonly',
    },
  });

  assert.equal(diagnostics.mode, 'google-readonly');
  assert.equal(diagnostics.fallback, 'mock');
  assert.equal(diagnostics.stale, true);
  assert.equal(diagnostics.lastErrorCode, 'network_error');
  assert.equal(diagnostics.retryable, true);
  assert.equal(diagnostics.suggestedRetryMs, 10000);
});

test('apps script sample includes expected resources and placeholder spreadsheet id', () => {
  const samplePath = path.resolve(process.cwd(), 'docs/google-corebase-apps-script/readonly-doGet.sample.js');
  const sample = fs.readFileSync(samplePath, 'utf8');

  [
    'projects',
    'workscope',
    'documents',
    'images',
    'calendar',
    'alerts',
    'health',
    'all',
    'YOUR_SPREADSHEET_ID_HERE',
  ].forEach((token) => {
    assert.equal(sample.includes(token), true, `Expected sample to include ${token}`);
  });
});

test('verifyEndpointConfigured returns mock mode when endpoint is missing', () => {
  const result = verifyEndpointConfigured({
    providerConfig: {
      endpoint: '',
      endpointConfigured: false,
      mode: 'mock',
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.mode, 'mock');
  assert.equal(result.endpointConfigured, false);
});

test('verifyEndpointConfigured keeps karun-live-control mode when endpoint is configured', () => {
  const result = verifyEndpointConfigured({
    providerConfig: {
      endpoint: 'https://script.google.com/macros/s/mock/exec',
      endpointConfigured: true,
      mode: 'karun-live-control',
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.mode, 'karun-live-control');
  assert.equal(result.endpointConfigured, true);
  assert.equal(result.endpointHost, 'script.google.com');
});

test('verifyEndpointHealth supports health success response', async () => {
  const result = await verifyEndpointHealth({
    fetchImpl: async () => ({
      ok: true,
      text: async () => JSON.stringify({
        ok: true,
        resource: 'health',
        data: { spreadsheetConfigured: true, tabs: {} },
      }),
    }),
    providerConfig: {
      endpoint: 'https://script.google.com/macros/s/mock/exec',
      endpointConfigured: true,
      mode: 'google-readonly',
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.resource, 'health');
  assert.equal(result.mode, 'google-readonly');
});

test('verifyEndpointHealth maps known error metadata', async () => {
  const result = await verifyEndpointHealth({
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({
        ok: false,
        error: { code: 'rate_limited', message: 'Too many requests', retryable: true },
      }),
    }),
    providerConfig: {
      endpoint: 'https://script.google.com/macros/s/mock/exec',
      endpointConfigured: true,
      mode: 'google-readonly',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'rate_limited');
  assert.equal(result.retryable, true);
});

test('verifyResourceShape validates core resources with expected shape', async () => {
  const adapter = {
    listAlerts: async () => [{ id: 'AL-1', level: 'WATCH', message: 'x' }],
    listCalendar: async () => [{ id: 'EV-1', title: 'Kickoff', startAt: '2026-01-01', endAt: '2026-01-02' }],
    listDocuments: async () => [{ id: 'DOC-1', projectId: 'KARUN-PHUKET-OLDTOWN', revision: 'R1', title: 'Doc' }],
    listImages: async () => [{ id: 'IMG-1', projectId: 'KARUN-PHUKET-OLDTOWN', title: 'Board', mediaType: 'image' }],
    listProjects: async () => [{ id: 'KARUN-PHUKET-OLDTOWN', name: 'Karun' }],
    listWorkScope: async () => [{ id: 'TASK-1', projectId: 'KARUN-PHUKET-OLDTOWN', status: 'OPEN', title: 'Task' }],
    getStatus: () => ({}),
  };
  const providerConfig = {
    endpoint: 'https://script.google.com/macros/s/mock/exec',
    endpointConfigured: true,
    mode: 'google-readonly',
  };

  const resources = ['projects', 'workscope', 'documents', 'images', 'calendar', 'alerts'];
  for (const resource of resources) {
    const result = await verifyResourceShape(resource, { adapter, providerConfig });
    assert.equal(result.ok, true, `Expected ${resource} to validate`);
  }
});

test('verifyResourceShape uses karun adapter path when mode is karun-live-control', async () => {
  let capturedUrl = '';
  const fetchImpl = async (url) => {
    capturedUrl = String(url);
    return {
      ok: true,
      text: async () => JSON.stringify({
        ok: true,
        mode: 'karun-live-control',
        resource: 'karun_workscope',
        data: [{
          ID: 'WS-001',
          'Item / Scope': 'Scope',
          Status: 'TODO',
          Priority: 'HIGH',
        }],
      }),
    };
  };

  const result = await verifyResourceShape('workscope', {
    fetchImpl,
    providerConfig: {
      endpoint: 'https://script.google.com/macros/s/mock/exec',
      endpointConfigured: true,
      mode: 'karun-live-control',
      timeoutMs: 1000,
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.mode, 'karun-live-control');
  assert.equal(capturedUrl.includes('resource=karun_workscope'), true);
});

test('verifyAllCoreResources returns structured mock fallback result when endpoint missing', async () => {
  const result = await verifyAllCoreResources({
    providerConfig: { endpoint: '', endpointConfigured: false, mode: 'mock' },
  });

  assert.equal(result.ok, true);
  assert.equal(result.mode, 'mock');
  assert.equal(result.endpointConfigured, false);
  assert.equal(Array.isArray(result.checks), true);
});

test('karun verifyAllCoreResources passes when workscope exists even if calendar is unavailable', async () => {
  const adapter = {
    listAlerts: async () => [{ id: 'AL-1', level: 'WATCH', message: 'ok' }],
    listCostDiff: async () => [{ id: 'CD-1', projectId: 'KARUN-PHUKET-OLDTOWN' }],
    listDecisionLog: async () => [{ id: 'DL-1', projectId: 'KARUN-PHUKET-OLDTOWN', title: 'Decision' }],
    listImages: async () => [{ id: 'IMG-1', projectId: 'KARUN-PHUKET-OLDTOWN', title: 'Board', mediaType: 'image' }],
    listWorkScope: async () => [{ id: 'WS-001', projectId: 'KARUN-PHUKET-OLDTOWN', title: 'Task', status: 'TODO' }],
    getStatus: () => ({}),
  };

  const result = await verifyAllCoreResources({
    adapter,
    providerConfig: {
      endpoint: 'https://script.google.com/macros/s/mock/exec',
      endpointConfigured: true,
      mode: 'karun-live-control',
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.mode, 'karun-live-control');
  assert.equal(result.workscopeCount, 1);
  assert.equal(result.workscopeFirstItemId, 'WS-001');
  assert.equal(result.calendarStatus, 'skipped');
  assert.equal(result.message.includes('Calendar verification skipped for Karun live-control mode'), true);
});

test('karun verifyAllCoreResources falls back to karun_all workscope data when direct resources are empty', async () => {
  const fetchImpl = async (url) => {
    const target = String(url);
    const resource = new URL(target).searchParams.get('resource');
    if (resource === 'karun_workscope' || resource === 'workscope') {
      return {
        ok: true,
        text: async () => JSON.stringify({ ok: true, mode: 'karun-live-control', resource, data: [] }),
      };
    }
    if (resource === 'karun_all') {
      return {
        ok: true,
        text: async () => JSON.stringify({
          ok: true,
          mode: 'karun-live-control',
          resource,
          data: {
            workscope: [
              { ID: 'WS-001', 'Item / Scope': 'Scope A', Status: 'TODO', Priority: 'HIGH' },
            ],
          },
        }),
      };
    }
    if (resource === 'karun_materials') {
      return {
        ok: true,
        text: async () => JSON.stringify({
          ok: true,
          mode: 'karun-live-control',
          resource,
          data: [{ 'Item ID': 'MAT-1', 'Image URL': 'https://example.com/a.jpg' }],
        }),
      };
    }
    if (resource === 'karun_costdiff') {
      return {
        ok: true,
        text: async () => JSON.stringify({
          ok: true,
          mode: 'karun-live-control',
          resource,
          data: [{ 'Item ID': 'CD-1' }],
        }),
      };
    }
    if (resource === 'karun_decisions') {
      return {
        ok: true,
        text: async () => JSON.stringify({
          ok: true,
          mode: 'karun-live-control',
          resource,
          data: [{ ID: 'DEC-1', 'Item / Scope': 'Decision A', Status: 'TODO', Priority: 'NORMAL' }],
        }),
      };
    }
    if (resource === 'karun_alerts') {
      return {
        ok: true,
        text: async () => JSON.stringify({
          ok: true,
          mode: 'karun-live-control',
          resource,
          data: [{ ID: 'AL-1', Level: 'WATCH', Message: 'Alert' }],
        }),
      };
    }
    return {
      ok: true,
      text: async () => JSON.stringify({ ok: true, mode: 'karun-live-control', resource, data: [] }),
    };
  };

  const result = await verifyAllCoreResources({
    fetchImpl,
    providerConfig: {
      endpoint: 'https://script.google.com/macros/s/mock/exec',
      endpointConfigured: true,
      mode: 'karun-live-control',
      timeoutMs: 1000,
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.workscopeCount >= 1, true);
  assert.equal(result.workscopeFirstItemId, 'WS-001');
  assert.equal(result.workscopeSource, 'karun_all');
});

test('diagnostics include configured env metadata when endpoint is available', () => {
  const diagnostics = getGoogleReadonlyDiagnostics({
    adapterStatus: {
      mode: 'karun-live-control',
    },
    providerConfig: {
      endpoint: 'https://script.google.com/macros/s/mock/exec',
      endpointConfigured: true,
      envEndpointConfigured: true,
      envModeConfigured: true,
      mode: 'karun-live-control',
      source: 'env',
      overrideActive: false,
      requestedMode: 'karun-live-control',
    },
  });

  assert.equal(diagnostics.endpointConfigured, true);
  assert.equal(diagnostics.endpointHost, 'script.google.com');
  assert.equal(diagnostics.mode, 'karun-live-control');
});
