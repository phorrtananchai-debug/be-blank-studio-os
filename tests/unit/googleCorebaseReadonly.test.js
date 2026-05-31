import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapReadonlyError,
  createGoogleReadonlyAdapter,
  normalizeErrorCode,
} from '../../src/corebase/google/googleReadonlyAdapter.js';
import { getGoogleCorebaseProviderConfig } from '../../src/corebase/google/providerConfig.js';
import {
  mapAlertRow,
  mapCalendarRow,
  mapDocumentRow,
  mapProjectRow,
  mapSettingsRow,
  mapWorkScopeRow,
} from '../../src/corebase/google/googleRowMappers.js';

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

  const mappedUnknown = mapReadonlyError({ code: 'mystery', message: 'x' });
  assert.equal(mappedUnknown.code, 'unknown');
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
