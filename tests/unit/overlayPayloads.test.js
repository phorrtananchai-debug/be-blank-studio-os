import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildArtworkPreviewPayload,
  buildConfirmationPayload,
  buildDocumentRevisionPayload,
  buildFilterDrawerPayload,
  buildNewProjectPayload,
  buildTaskDetailPayload,
} from '../../src/overlays/overlayPayloads.js';

const bannedNames = ['BE BLANKOS', 'Blank OS', 'BlankOS', 'Atelier OS'];

function assertNoBannedNaming(payload) {
  const json = JSON.stringify(payload);
  bannedNames.forEach((name) => {
    assert.equal(json.includes(name), false, `Payload should not include banned naming: ${name}`);
  });
}

test('buildTaskDetailPayload returns stable task metadata and safe fallbacks', () => {
  const payload = buildTaskDetailPayload({}, undefined);

  assert.equal(payload.title, 'Task Detail');
  assert.equal(payload.task.id, 'TASK-UNSPECIFIED');
  assert.equal(payload.task.title, 'Untitled task');
  assert.equal(payload.task.projectId, 'UNASSIGNED');
  assert.equal(payload.task.status, 'OPEN');
  assert.equal(payload.source, '/os/work-queue');
  assert.ok(payload.task.updatedAt);
  assertNoBannedNaming(payload);
});

test('buildTaskDetailPayload preserves provided metadata', () => {
  const payload = buildTaskDetailPayload({
    id: 'TASK-1',
    projectId: 'KARUN-PHUKET-OLDTOWN',
    status: 'WAITING',
    title: 'Review millwork',
  }, '/os/projects');

  assert.equal(payload.task.id, 'TASK-1');
  assert.equal(payload.task.projectId, 'KARUN-PHUKET-OLDTOWN');
  assert.equal(payload.task.status, 'WAITING');
  assert.equal(payload.task.title, 'Review millwork');
  assert.equal(payload.source, '/os/projects');
  assertNoBannedNaming(payload);
});

test('buildDocumentRevisionPayload returns stable document metadata and revision fallback', () => {
  const payload = buildDocumentRevisionPayload({}, undefined);

  assert.equal(payload.title, 'Document Revision');
  assert.equal(payload.document.id, 'DOC-UNSPECIFIED');
  assert.equal(payload.document.title, 'Untitled document');
  assert.equal(payload.document.projectId, 'UNASSIGNED');
  assert.equal(payload.document.status, 'Draft');
  assert.equal(payload.document.revision, 'R0');
  assert.equal(payload.source, '/os/documents');
  assert.ok(payload.document.updatedAt);
  assertNoBannedNaming(payload);
});

test('buildArtworkPreviewPayload returns stable artwork metadata and safe name fallback', () => {
  const payload = buildArtworkPreviewPayload({}, undefined);

  assert.equal(payload.title, 'Artwork Preview');
  assert.equal(payload.artwork.id, 'ART-UNSPECIFIED');
  assert.equal(payload.artwork.title, 'Artwork');
  assert.equal(payload.artwork.name, 'Artwork');
  assert.equal(payload.artwork.projectId, 'UNASSIGNED');
  assert.equal(payload.artwork.status, 'review');
  assert.equal(payload.source, '/os/artwork');
  assert.ok(payload.artwork.updatedAt);
  assertNoBannedNaming(payload);
});

test('buildFilterDrawerPayload returns filter contract keys and unknown source passthrough', () => {
  const payload = buildFilterDrawerPayload({
    query: '',
    source: '/unknown-route',
    status: 'all',
  });

  assert.equal(payload.title, 'Filter Drawer');
  assert.equal(payload.filter.id, 'FILTER-all');
  assert.equal(payload.filter.query, '');
  assert.equal(payload.filter.status, 'all');
  assert.equal(payload.filter.source, '/unknown-route');
  assert.equal(payload.source, '/unknown-route');
  assert.ok(payload.filter.updatedAt);
  assertNoBannedNaming(payload);
});

test('buildConfirmationPayload returns action metadata and safe fallbacks', () => {
  const payload = buildConfirmationPayload();

  assert.equal(payload.title, 'Confirm Action');
  assert.equal(payload.confirmation.id, 'CONFIRMATION-UNSPECIFIED');
  assert.equal(payload.confirmation.name, 'Confirm Action');
  assert.equal(payload.confirmation.projectId, 'UNASSIGNED');
  assert.equal(payload.confirmation.status, 'pending');
  assert.equal(payload.source, '/os/projects');
  assert.ok(payload.confirmation.updatedAt);
  assertNoBannedNaming(payload);
});

test('buildConfirmationPayload preserves provided action metadata', () => {
  const onConfirm = () => {};
  const payload = buildConfirmationPayload({
    confirmLabel: 'Delete',
    id: 'DELETE-PROJECT-1',
    name: 'Aurum Residence',
    onConfirm,
    projectId: 'KARUN-PHUKET-OLDTOWN',
    source: '/os/projects',
    status: 'ready',
    title: 'Delete Project',
  });

  assert.equal(payload.title, 'Delete Project');
  assert.equal(payload.confirmLabel, 'Delete');
  assert.equal(payload.confirmation.id, 'DELETE-PROJECT-1');
  assert.equal(payload.confirmation.name, 'Aurum Residence');
  assert.equal(payload.confirmation.projectId, 'KARUN-PHUKET-OLDTOWN');
  assert.equal(payload.confirmation.status, 'ready');
  assert.equal(payload.onConfirm, onConfirm);
  assertNoBannedNaming(payload);
});

test('buildNewProjectPayload returns stable creation contract metadata', () => {
  const onConfirm = () => {};
  const payload = buildNewProjectPayload(onConfirm, '/os/projects');

  assert.equal(payload.title, 'New Project');
  assert.equal(payload.confirmLabel, 'Create Project');
  assert.equal(payload.source, '/os/projects');
  assert.equal(payload.workspace.id, 'NEW-PROJECT');
  assert.equal(payload.workspace.name, 'New Project');
  assert.equal(payload.workspace.source, '/os/projects');
  assert.equal(payload.onConfirm, onConfirm);
  assert.ok(payload.workspace.updatedAt);
  assertNoBannedNaming(payload);
});

