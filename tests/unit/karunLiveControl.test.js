import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { getGoogleCorebaseProviderConfig } from '../../src/corebase/google/providerConfig.js';
import {
  KARUN_PROJECT_ID,
  createKarunWritePatchPayload,
  isBlockedKarunMutation,
  mapKarunWorkScopeMasterRow,
  sanitizeKarunPatch,
} from '../../src/corebase/google/karunPhuketSheetMap.js';
import {
  buildKarunWritePayloadForTest,
  createKarunLiveControlAdapter,
} from '../../src/corebase/google/karunLiveControlAdapter.js';

test('provider config supports karun-live-control only when endpoint exists', () => {
  const withoutEndpoint = getGoogleCorebaseProviderConfig({
    VITE_GOOGLE_COREBASE_MODE: 'karun-live-control',
  });
  assert.equal(withoutEndpoint.mode, 'mock');

  const withEndpoint = getGoogleCorebaseProviderConfig({
    VITE_GOOGLE_COREBASE_ENDPOINT: 'https://script.google.com/macros/s/mock/exec',
    VITE_GOOGLE_COREBASE_MODE: 'karun-live-control',
  });
  assert.equal(withEndpoint.mode, 'karun-live-control');
  assert.equal(withEndpoint.endpointConfigured, true);
});

test('karun workscope mapper reads existing sheet columns safely', () => {
  const row = mapKarunWorkScopeMasterRow({
    'Alert Channel': 'discord',
    'Decision Needed': 'Client final sign-off',
    'Due / Target': '2026-06-15',
    'Estimated Diff (THB)': '125000',
    'ID': 'WS-001',
    'Item / Scope': 'Finalize staircase detail',
    'Priority': 'HIGH',
    'Responsible': 'Design Director',
    'Status': 'IN_PROGRESS',
  });

  assert.equal(row.id, 'WS-001');
  assert.equal(row.projectId, KARUN_PROJECT_ID);
  assert.equal(row.title, 'Finalize staircase detail');
  assert.equal(row.status, 'IN_PROGRESS');
  assert.equal(row.priority, 'HIGH');
  assert.equal(row.estimatedDiff, 125000);
  assert.equal(row.waitingFor, 'Client final sign-off');
});

test('write payload builder includes required contract fields', () => {
  const payload = createKarunWritePatchPayload({
    action: 'update_workscope_item',
    itemId: 'WS-001',
    patch: { status: 'DONE' },
    projectId: 'karun-phuket',
    resource: 'karun_workscope',
    updatedBy: 'qa-user',
    clientRequestId: 'req-123',
    updatedAt: '2026-06-01T10:00:00.000Z',
  });

  assert.equal(payload.action, 'update_workscope_item');
  assert.equal(payload.project_id, KARUN_PROJECT_ID);
  assert.equal(payload.resource, 'karun_workscope');
  assert.equal(payload.item_id, 'WS-001');
  assert.equal(payload.row_id, 'WS-001');
  assert.equal(payload.updated_by, 'qa-user');
  assert.equal(payload.updated_at, '2026-06-01T10:00:00.000Z');
  assert.equal(payload.client_request_id, 'req-123');
});

test('sanitizeKarunPatch whitelists only safe update keys', () => {
  const patch = sanitizeKarunPatch({
    delete_all: true,
    notes: 'ok',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
  });

  assert.equal(Object.prototype.hasOwnProperty.call(patch, 'delete_all'), false);
  assert.equal(patch.status, 'IN_PROGRESS');
  assert.equal(patch.priority, 'HIGH');
  assert.equal(patch.notes, 'ok');
});

test('adapter blocks delete and bulk mutation patterns', async () => {
  const adapter = createKarunLiveControlAdapter({
    endpoint: 'https://script.google.com/macros/s/mock/exec',
    endpointConfigured: true,
    mode: 'karun-live-control',
    timeoutMs: 100,
  }, async () => ({
    ok: true,
    text: async () => JSON.stringify({ ok: true, data: {} }),
  }));

  assert.equal(isBlockedKarunMutation('delete_workscope_item'), true);
  assert.equal(isBlockedKarunMutation('bulk_overwrite_workscope'), true);
  assert.equal(isBlockedKarunMutation('update_workscope_item'), false);

  const deleteResult = adapter.noDelete();
  const bulkResult = adapter.noBulkOverwrite();
  assert.equal(deleteResult.ok, false);
  assert.equal(bulkResult.ok, false);
});

test('karun adapter returns safe mock fallback when endpoint is missing', async () => {
  const adapter = createKarunLiveControlAdapter({
    endpoint: '',
    endpointConfigured: false,
    mode: 'mock',
    timeoutMs: 100,
  }, async () => {
    throw new Error('fetch should not run when endpoint missing');
  });

  const result = await adapter.updateStatus('WS-001', 'DONE', { projectId: KARUN_PROJECT_ID });
  assert.equal(result.ok, true);
  assert.equal(result.mode, 'mock');
  assert.equal(result.fallback, 'mock');
});

test('karun adapter maps successful write response shape', async () => {
  const adapter = createKarunLiveControlAdapter({
    endpoint: 'https://script.google.com/macros/s/mock/exec',
    endpointConfigured: true,
    mode: 'karun-live-control',
    timeoutMs: 100,
  }, async (_url, init) => {
    assert.equal(init.method, 'POST');
    return {
      ok: true,
      text: async () => JSON.stringify({
        ok: true,
        mode: 'karun-live-control',
        resource: 'karun_workscope',
        updated_at: '2026-06-01T10:10:00.000Z',
        data: {
          after: { ID: 'WS-001', Status: 'DONE' },
          before: { ID: 'WS-001', Status: 'IN_PROGRESS' },
          request: { action: 'update_status' },
        },
      }),
    };
  });

  const result = await adapter.updateStatus('WS-001', 'DONE', { projectId: KARUN_PROJECT_ID });
  assert.equal(result.ok, true);
  assert.equal(result.mode, 'karun-live-control');
  assert.equal(result.summary.before.Status, 'IN_PROGRESS');
  assert.equal(result.summary.after.Status, 'DONE');
});

test('test helper payload builder matches write contract', () => {
  const payload = buildKarunWritePayloadForTest('update_notes', 'WS-009', {
    notes: 'Need PM approval',
    unsupported_key: 'ignored',
  }, {
    clientRequestId: 'req-77',
    updatedAt: '2026-06-01T10:30:00.000Z',
    updatedBy: 'unit-test',
  });

  assert.equal(payload.action, 'update_notes');
  assert.equal(payload.item_id, 'WS-009');
  assert.equal(payload.client_request_id, 'req-77');
  assert.equal(payload.updated_by, 'unit-test');
  assert.equal(payload.updated_at, '2026-06-01T10:30:00.000Z');
  assert.equal(Object.prototype.hasOwnProperty.call(payload.patch, 'unsupported_key'), false);
});

test('karun apps script sample contains placeholder only and no obvious secret leakage', () => {
  const samplePath = path.resolve(process.cwd(), 'docs/google-corebase-apps-script/karun-live-control.sample.js');
  const sample = fs.readFileSync(samplePath, 'utf8');

  assert.equal(sample.includes('YOUR_SPREADSHEET_ID_HERE'), true);
  assert.equal(sample.includes('https://discord.com/api/webhooks'), false);
  assert.equal(sample.toLowerCase().includes('private_key'), false);
});
