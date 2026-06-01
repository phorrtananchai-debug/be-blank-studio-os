import { initialContentItems, initialPortfolioItems, initialProjects } from '../../data/seed.js';
import { createKarunLiveControlAdapter } from './karunLiveControlAdapter.js';
import { KARUN_PROJECT_ID } from './karunPhuketSheetMap.js';
import { createGoogleReadonlyAdapter } from './googleReadonlyAdapter.js';
import { getEndpointHost, getGoogleReadonlyDiagnostics } from './googleReadonlyDiagnostics.js';
import { normalizeProjectId } from './googleRowMappers.js';
import { mapLegacyToCorebase } from './legacyToCorebase';
import { createMockGoogleCorebaseAdapters } from './mockAdapters';
import { getCorebaseModeLabel, getGoogleCorebaseProviderConfig } from './providerConfig.js';

const mockAdapters = createMockGoogleCorebaseAdapters();
const providerConfig = getGoogleCorebaseProviderConfig();
const readonlyAdapter = createGoogleReadonlyAdapter(
  providerConfig,
  typeof fetch === 'function' ? fetch.bind(globalThis) : async () => {
    throw new Error('fetch unavailable');
  },
);
const karunLiveAdapter = createKarunLiveControlAdapter(
  providerConfig,
  typeof fetch === 'function' ? fetch.bind(globalThis) : async () => {
    throw new Error('fetch unavailable');
  },
);

const corebaseReadStatus = {
  endpointConfigured: Boolean(providerConfig.endpointConfigured),
  endpointHost: getEndpointHost(providerConfig.endpoint || ''),
  fallback: null,
  lastErrorCode: null,
  lastSyncAt: null,
  mode: getCorebaseModeLabel(providerConfig),
  readOnly: providerConfig.mode !== 'karun-live-control',
  retryable: false,
  stale: false,
  suggestedRetryMs: null,
};

const KARUN_ALIASES = new Set(['karun-phuket', 'karun-phuket-oldtown', KARUN_PROJECT_ID.toLowerCase()]);

function isKarunProject(projectId = '') {
  const normalized = String(projectId || '').trim().toLowerCase();
  if (!normalized) return false;
  if (KARUN_ALIASES.has(normalized)) return true;
  return normalizeProjectId(projectId) === KARUN_PROJECT_ID;
}

function getLegacySnapshot() {
  return mapLegacyToCorebase({
    contentItems: initialContentItems,
    portfolioItems: initialPortfolioItems,
    projects: initialProjects,
    tasks: [],
  });
}

function ensureWorkScopeItems(workScope = [], projects = initialProjects) {
  if (workScope.length) return workScope;
  const firstProject = projects[0];
  if (!firstProject) return workScope;
  return [{
    id: 'TASK-DETERMINISTIC-001',
    notes: firstProject.notes || '',
    priority: 'NORMAL',
    projectId: normalizeProjectId(firstProject.id),
    status: 'OPEN',
    title: firstProject.nextAction || `Next action for ${firstProject.name}`,
    updatedAt: new Date().toISOString(),
  }];
}

function ensureDocuments(documents = [], projects = initialProjects) {
  if (documents.length) return documents;
  const firstProject = projects[0];
  if (!firstProject) return documents;
  return [{
    id: 'DOC-DETERMINISTIC-001',
    projectId: normalizeProjectId(firstProject.id),
    revision: firstProject.drawingVersion || 'R0',
    status: firstProject.drawingStatus || 'Draft',
    title: `${firstProject.name} drawing package`,
    updatedAt: new Date().toISOString(),
    url: firstProject.drawingLink || '',
  }];
}

function ensureArtwork(projectImages = [], projects = initialProjects, portfolioItems = initialPortfolioItems) {
  if (projectImages.length) return projectImages;
  const firstProject = projects[0];
  const firstPortfolio = portfolioItems[0];
  if (!firstProject) return projectImages;
  return [{
    id: 'ART-DETERMINISTIC-001',
    mediaType: 'image',
    previewUrl: firstPortfolio?.imageUrl || firstPortfolio?.coverImage?.url || '',
    projectId: normalizeProjectId(firstProject.id),
    role: 'board',
    title: `${firstProject.name} board`,
    updatedAt: new Date().toISOString(),
  }];
}

function applyReadonlyStatus(fallback = null) {
  if (providerConfig.mode === 'karun-live-control') {
    const status = karunLiveAdapter.getStatus();
    Object.assign(corebaseReadStatus, {
      endpointConfigured: Boolean(providerConfig.endpointConfigured),
      endpointHost: getEndpointHost(providerConfig.endpoint || ''),
      fallback,
      lastErrorCode: status.lastErrorCode || null,
      lastSyncAt: status.lastSyncAt || null,
      mode: 'karun-live-control',
      readOnly: false,
      retryable: Boolean(status.retryable),
      stale: Boolean(fallback === 'mock' && status.lastErrorCode),
      suggestedRetryMs: status.suggestedRetryMs || null,
    });
    return;
  }

  const adapterStatus = readonlyAdapter.getStatus();
  const nextStatus = getGoogleReadonlyDiagnostics({
    adapterStatus,
    fallback,
    providerConfig,
  });
  Object.assign(corebaseReadStatus, nextStatus);
}

function shouldUseGoogleReadonly() {
  return providerConfig.mode === 'google-readonly' && providerConfig.endpointConfigured;
}

function shouldUseKarunLive() {
  return providerConfig.mode === 'karun-live-control';
}

async function loadWithReadonlyFallback(readonlyLoader, fallbackLoader) {
  if (!shouldUseGoogleReadonly()) {
    const fallbackRows = await fallbackLoader();
    applyReadonlyStatus(null);
    return fallbackRows;
  }
  const readonlyRows = await readonlyLoader();
  applyReadonlyStatus(null);
  if (Array.isArray(readonlyRows) && readonlyRows.length) {
    return readonlyRows;
  }
  const fallbackRows = await fallbackLoader();
  const adapterStatus = readonlyAdapter.getStatus();
  const fallback = adapterStatus.lastErrorCode ? 'mock' : null;
  applyReadonlyStatus(fallback);
  return fallbackRows;
}

async function loadWithKarunFallback(projectId, karunLoader, fallbackLoader) {
  if (!shouldUseKarunLive() || (projectId && !isKarunProject(projectId))) {
    const rows = await fallbackLoader();
    applyReadonlyStatus(null);
    return rows;
  }

  try {
    const karunRows = await karunLoader();
    if (Array.isArray(karunRows) && karunRows.length) {
      applyReadonlyStatus(null);
      return karunRows;
    }
  } catch {
    // handled by fallback
  }

  const fallbackRows = await fallbackLoader();
  applyReadonlyStatus('mock');
  return fallbackRows;
}

function mergeKarunRows(primaryRows = [], karunRows = []) {
  const replaceIds = new Set(karunRows.map((row) => String(row.id || '')));
  const withoutKarunDuplicates = primaryRows.filter((row) => {
    if (!isKarunProject(row?.projectId)) return true;
    return !replaceIds.has(String(row.id || ''));
  });
  return [...withoutKarunDuplicates, ...karunRows];
}

function normalizeTaskRows(rows = []) {
  return rows.map((task) => ({
    id: task.id,
    notes: task.notes || task.description || '',
    priority: String(task.priority || 'NORMAL').toUpperCase(),
    projectId: normalizeProjectId(task.projectId),
    responsible: task.responsible || task.assignee || '',
    status: task.status || 'OPEN',
    title: task.title || 'Untitled task',
    updatedAt: task.updatedAt || new Date().toISOString(),
    dueDate: task.dueDate || task.due_date || '',
    waitingFor: task.waitingFor || task.waiting_for || task.decisionNeeded || '',
  }));
}

function normalizeDocumentRows(rows = []) {
  return rows.map((document) => ({
    id: document.id,
    projectId: normalizeProjectId(document.projectId),
    revision: document.revision || document.version || 'R0',
    status: document.status || 'Draft',
    title: document.title || document.label || 'Untitled document',
    updatedAt: document.updatedAt || new Date().toISOString(),
    url: document.url || '',
  }));
}

function normalizeArtworkRows(rows = []) {
  return rows.map((artwork) => ({
    id: artwork.id,
    mediaType: artwork.mediaType || 'image',
    previewUrl: artwork.previewUrl || '',
    projectId: normalizeProjectId(artwork.projectId),
    role: artwork.role || 'board',
    title: artwork.title || 'Artwork',
    updatedAt: artwork.updatedAt || new Date().toISOString(),
  }));
}

function normalizeCalendarRows(rows = []) {
  return rows.map((event) => ({
    category: event.category || 'timeline',
    endAt: event.endAt,
    id: event.id,
    legacySource: event.legacySource || 'google-readonly',
    location: event.location || '',
    projectId: normalizeProjectId(event.projectId),
    startAt: event.startAt,
    title: event.title || 'Calendar event',
  }));
}

function normalizeAlertRows(rows = []) {
  return rows.map((alert) => ({
    createdAt: alert.createdAt || new Date().toISOString(),
    id: alert.id,
    level: alert.level || 'WATCH',
    message: alert.message || 'Operational alert',
    projectId: normalizeProjectId(alert.projectId),
    source: 'operational-pressure',
  }));
}

function normalizeCostDiffRows(rows = []) {
  return rows.map((costDiff) => ({
    baselineCost: Number(costDiff.baselineCost || 0),
    currentCost: Number(costDiff.currentCost || 0),
    delta: Number(costDiff.delta || 0),
    id: costDiff.id,
    projectId: normalizeProjectId(costDiff.projectId),
    updatedAt: costDiff.updatedAt || new Date().toISOString(),
  }));
}

function normalizeDecisionRows(rows = []) {
  return rows.map((item) => ({
    body: item.body || '',
    createdAt: item.createdAt || new Date().toISOString(),
    id: item.id,
    projectId: normalizeProjectId(item.projectId),
    source: item.source || 'google-readonly',
    title: item.title || 'Decision log item',
    type: item.type || 'decision',
  }));
}

export function getCorebaseProviderConfig() {
  return { ...providerConfig };
}

export function getCorebaseReadStatus() {
  return { ...corebaseReadStatus };
}

export async function getProjects() {
  return loadWithReadonlyFallback(
    async () => {
      const rows = await readonlyAdapter.listProjects();
      return rows.map((project) => ({
        aliases: project.aliases || [],
        id: normalizeProjectId(project.id),
        name: project.name,
        phase: project.phase || 'concept',
      }));
    },
    async () => {
      const [mockProjects, snapshot] = await Promise.all([
        mockAdapters.sheets.listProjects(),
        Promise.resolve(getLegacySnapshot()),
      ]);
      const byId = new Map(snapshot.projectRefs.map((project) => [project.id, project]));
      mockProjects.forEach((project) => {
        const canonicalId = normalizeProjectId(project.id);
        const existing = byId.get(canonicalId);
        if (!existing) {
          byId.set(canonicalId, {
            ...project,
            aliases: [project.id, 'karun-phuket', 'karun-phuket-oldtown'].filter((alias) => isKarunProject(alias)),
            id: canonicalId,
          });
          return;
        }
        byId.set(canonicalId, {
          ...existing,
          aliases: Array.from(new Set([...(existing.aliases || []), project.id, ...(project.aliases || [])])),
        });
      });
      return Array.from(byId.values());
    },
  );
}

export async function getProjectById(projectId) {
  const normalizedProjectId = normalizeProjectId(projectId);
  const projects = await getProjects();
  return projects.find((project) => (
    project.id === normalizedProjectId
    || project.id === projectId
    || project.aliases?.includes(projectId)
  )) || null;
}

export async function getWorkScope(projectId) {
  const normalizedProjectId = projectId ? normalizeProjectId(projectId) : '';

  const baseRows = await loadWithKarunFallback(
    normalizedProjectId,
    async () => normalizeTaskRows(await karunLiveAdapter.listWorkScope()),
    async () => loadWithReadonlyFallback(
      async () => normalizeTaskRows(await readonlyAdapter.listWorkScope(normalizedProjectId || undefined)),
      async () => {
        const { workScope } = getLegacySnapshot();
        const mockTasks = await mockAdapters.sheets.listTasks(normalizedProjectId || undefined);
        const merged = workScope.length ? workScope : mockTasks;
        return normalizeTaskRows(merged);
      },
    ),
  );

  const rows = !normalizedProjectId && shouldUseKarunLive()
    ? mergeKarunRows(baseRows, normalizeTaskRows(await karunLiveAdapter.listWorkScope()))
    : baseRows;

  const ensured = ensureWorkScopeItems(rows);
  if (normalizedProjectId) {
    const filtered = ensured.filter((item) => normalizeProjectId(item.projectId) === normalizedProjectId);
    if (filtered.length) return filtered;
    return [{
      id: 'KARUN-TASK-FALLBACK-001',
      notes: '',
      priority: 'NORMAL',
      projectId: normalizedProjectId,
      responsible: '',
      status: 'TODO',
      title: 'Initialize Karun WorkScope tracking row',
      updatedAt: new Date().toISOString(),
      dueDate: '',
      waitingFor: '',
    }];
  }
  return ensured;
}

export async function getDocuments(projectId) {
  const normalizedProjectId = projectId ? normalizeProjectId(projectId) : '';
  const rows = await loadWithKarunFallback(
    normalizedProjectId,
    async () => normalizeDocumentRows(await karunLiveAdapter.listDocuments()),
    async () => loadWithReadonlyFallback(
      async () => normalizeDocumentRows(await readonlyAdapter.listDocuments(normalizedProjectId || undefined)),
      async () => {
        const { documents } = getLegacySnapshot();
        const mockDocs = await mockAdapters.sheets.listDocuments(normalizedProjectId || undefined);
        const merged = documents.length ? documents : mockDocs;
        return normalizeDocumentRows(merged);
      },
    ),
  );
  const ensured = ensureDocuments(rows);
  return normalizedProjectId ? ensured.filter((item) => normalizeProjectId(item.projectId) === normalizedProjectId) : ensured;
}

export async function getArtwork(projectId) {
  const normalizedProjectId = projectId ? normalizeProjectId(projectId) : '';
  const rows = await loadWithKarunFallback(
    normalizedProjectId,
    async () => normalizeArtworkRows(await karunLiveAdapter.listImages()),
    async () => loadWithReadonlyFallback(
      async () => normalizeArtworkRows(await readonlyAdapter.listImages(normalizedProjectId || undefined)),
      async () => {
        const { projectImages } = getLegacySnapshot();
        const mockImages = await mockAdapters.drive.listArtwork(normalizedProjectId || undefined);
        const merged = projectImages.length ? projectImages : mockImages;
        return normalizeArtworkRows(merged);
      },
    ),
  );
  const ensured = ensureArtwork(rows);
  return normalizedProjectId ? ensured.filter((item) => normalizeProjectId(item.projectId) === normalizedProjectId) : ensured;
}

export async function getDecisionLog(projectId) {
  const normalizedProjectId = projectId ? normalizeProjectId(projectId) : '';
  const rows = await loadWithKarunFallback(
    normalizedProjectId,
    async () => normalizeDecisionRows(await karunLiveAdapter.listDecisionLog()),
    async () => loadWithReadonlyFallback(
      async () => normalizeDecisionRows(await readonlyAdapter.listDecisionLog(normalizedProjectId || undefined)),
      async () => {
        const { decisionLog } = getLegacySnapshot();
        return normalizedProjectId ? decisionLog.filter((item) => normalizeProjectId(item.projectId) === normalizedProjectId) : decisionLog;
      },
    ),
  );

  return normalizedProjectId ? rows.filter((item) => normalizeProjectId(item.projectId) === normalizedProjectId) : rows;
}

export async function getCalendarEvents(projectId) {
  const normalizedProjectId = projectId ? normalizeProjectId(projectId) : '';
  const rows = await loadWithReadonlyFallback(
    async () => normalizeCalendarRows(await readonlyAdapter.listCalendar(normalizedProjectId || undefined)),
    async () => {
      const { calendarEvents } = getLegacySnapshot();
      return normalizedProjectId ? calendarEvents.filter((item) => normalizeProjectId(item.projectId) === normalizedProjectId) : calendarEvents;
    },
  );

  return normalizedProjectId ? rows.filter((item) => normalizeProjectId(item.projectId) === normalizedProjectId) : rows;
}

export async function getAlerts(projectId) {
  const normalizedProjectId = projectId ? normalizeProjectId(projectId) : '';
  const rows = await loadWithKarunFallback(
    normalizedProjectId,
    async () => normalizeAlertRows(await karunLiveAdapter.listAlerts()),
    async () => loadWithReadonlyFallback(
      async () => normalizeAlertRows(await readonlyAdapter.listAlerts(normalizedProjectId || undefined)),
      async () => {
        const { alerts } = getLegacySnapshot();
        return normalizedProjectId ? alerts.filter((item) => normalizeProjectId(item.projectId) === normalizedProjectId) : alerts;
      },
    ),
  );
  return normalizedProjectId ? rows.filter((item) => normalizeProjectId(item.projectId) === normalizedProjectId) : rows;
}

export async function getCostDiff(projectId) {
  const normalizedProjectId = projectId ? normalizeProjectId(projectId) : '';
  const rows = await loadWithKarunFallback(
    normalizedProjectId,
    async () => normalizeCostDiffRows(await karunLiveAdapter.listCostDiff()),
    async () => loadWithReadonlyFallback(
      async () => normalizeCostDiffRows(await readonlyAdapter.listCostDiff(normalizedProjectId || undefined)),
      async () => {
        const { costDiff } = getLegacySnapshot();
        return normalizedProjectId ? costDiff.filter((item) => normalizeProjectId(item.projectId) === normalizedProjectId) : costDiff;
      },
    ),
  );
  return normalizedProjectId ? rows.filter((item) => normalizeProjectId(item.projectId) === normalizedProjectId) : rows;
}

export async function updateWorkScopeItem(itemId, patch = {}, options = {}) {
  if (options?.projectId && !isKarunProject(options.projectId)) {
    return {
      ok: false,
      errorCode: 'invalid_resource',
      message: 'Write-back is enabled only for Karun Phuket in this phase.',
      retryable: false,
    };
  }
  return karunLiveAdapter.updateWorkScopeItem(itemId, patch, {
    projectId: KARUN_PROJECT_ID,
    ...options,
  });
}

export async function addWorkScopeItem(payload = {}, options = {}) {
  if (options?.projectId && !isKarunProject(options.projectId)) {
    return {
      ok: false,
      errorCode: 'invalid_resource',
      message: 'Write-back is enabled only for Karun Phuket in this phase.',
      retryable: false,
    };
  }
  return karunLiveAdapter.addWorkScopeItem(payload, {
    projectId: KARUN_PROJECT_ID,
    ...options,
  });
}

export async function updateWorkScopeStatus(itemId, status, options = {}) {
  return karunLiveAdapter.updateStatus(itemId, status, { projectId: KARUN_PROJECT_ID, ...options });
}

export async function updateWorkScopePriority(itemId, priority, options = {}) {
  return karunLiveAdapter.updatePriority(itemId, priority, { projectId: KARUN_PROJECT_ID, ...options });
}

export async function updateWorkScopeNotes(itemId, notes, options = {}) {
  return karunLiveAdapter.updateNotes(itemId, notes, { projectId: KARUN_PROJECT_ID, ...options });
}

export async function acknowledgeKarunAlert(alertId, options = {}) {
  return karunLiveAdapter.acknowledgeAlert(alertId, { projectId: KARUN_PROJECT_ID, ...options });
}

export function isKarunLiveControlEnabled() {
  return providerConfig.mode === 'karun-live-control';
}

export function getKarunLiveControlBlockedCapabilities() {
  return { ...karunLiveAdapter.blockedMutations };
}
