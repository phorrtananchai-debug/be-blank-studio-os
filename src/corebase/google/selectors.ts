import { initialContentItems, initialPortfolioItems, initialProjects } from '../../data/seed.js';
import { createGoogleReadonlyAdapter } from './googleReadonlyAdapter.js';
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

const corebaseReadStatus = {
  endpointConfigured: providerConfig.endpointConfigured,
  lastErrorCode: null,
  lastSyncAt: null,
  mode: getCorebaseModeLabel(providerConfig),
  readOnly: true,
};

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
    projectId: firstProject.id,
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
    projectId: firstProject.id,
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
    projectId: firstProject.id,
    role: 'board',
    title: `${firstProject.name} board`,
    updatedAt: new Date().toISOString(),
  }];
}

function applyReadonlyStatus() {
  const adapterStatus = readonlyAdapter.getStatus();
  corebaseReadStatus.lastErrorCode = adapterStatus.lastErrorCode || null;
  corebaseReadStatus.lastSyncAt = adapterStatus.lastSyncAt || null;
}

function shouldUseGoogleReadonly() {
  return providerConfig.mode === 'google-readonly' && providerConfig.endpointConfigured;
}

async function loadWithReadonlyFallback(readonlyLoader, fallbackLoader) {
  if (!shouldUseGoogleReadonly()) {
    return fallbackLoader();
  }
  const readonlyRows = await readonlyLoader();
  applyReadonlyStatus();
  if (Array.isArray(readonlyRows) && readonlyRows.length) {
    return readonlyRows;
  }
  return fallbackLoader();
}

function normalizeTaskRows(rows = []) {
  return rows.map((task: any) => ({
    id: task.id,
    notes: task.notes || '',
    priority: task.priority || 'NORMAL',
    projectId: task.projectId,
    status: task.status || 'OPEN',
    title: task.title || 'Untitled task',
    updatedAt: task.updatedAt || new Date().toISOString(),
  }));
}

function normalizeDocumentRows(rows = []) {
  return rows.map((document: any) => ({
    id: document.id,
    projectId: document.projectId,
    revision: document.revision || document.version || 'R0',
    status: document.status || 'Draft',
    title: document.title || document.label || 'Untitled document',
    updatedAt: document.updatedAt || new Date().toISOString(),
    url: document.url || '',
  }));
}

function normalizeArtworkRows(rows = []) {
  return rows.map((artwork: any) => ({
    id: artwork.id,
    mediaType: artwork.mediaType || 'image',
    previewUrl: artwork.previewUrl || '',
    projectId: artwork.projectId,
    role: artwork.role || 'board',
    title: artwork.title || 'Artwork',
    updatedAt: artwork.updatedAt || new Date().toISOString(),
  }));
}

function normalizeCalendarRows(rows = []) {
  return rows.map((event: any) => ({
    category: event.category || 'timeline',
    endAt: event.endAt,
    id: event.id,
    legacySource: event.legacySource || 'google-readonly',
    location: event.location || '',
    projectId: event.projectId,
    startAt: event.startAt,
    title: event.title || 'Calendar event',
  }));
}

function normalizeAlertRows(rows = []) {
  return rows.map((alert: any) => ({
    createdAt: alert.createdAt || new Date().toISOString(),
    id: alert.id,
    level: alert.level || 'WATCH',
    message: alert.message || 'Operational alert',
    projectId: alert.projectId,
    source: 'operational-pressure',
  }));
}

function normalizeCostDiffRows(rows = []) {
  return rows.map((costDiff: any) => ({
    baselineCost: Number(costDiff.baselineCost || 0),
    currentCost: Number(costDiff.currentCost || 0),
    delta: Number(costDiff.delta || 0),
    id: costDiff.id,
    projectId: costDiff.projectId,
    updatedAt: costDiff.updatedAt || new Date().toISOString(),
  }));
}

function normalizeDecisionRows(rows = []) {
  return rows.map((item: any) => ({
    body: item.body || '',
    createdAt: item.createdAt || new Date().toISOString(),
    id: item.id,
    projectId: item.projectId,
    source: item.source || 'google-readonly',
    title: item.title || 'Decision log item',
    type: item.type || 'decision',
  }));
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
        id: project.id,
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
        if (!byId.has(project.id)) byId.set(project.id, project);
      });
      return Array.from(byId.values());
    },
  );
}

export async function getProjectById(projectId: string) {
  const projects = await getProjects();
  return projects.find((project) => project.id === projectId || project.aliases?.includes(projectId)) || null;
}

export async function getWorkScope(projectId?: string) {
  const rows = await loadWithReadonlyFallback(
    async () => normalizeTaskRows(await readonlyAdapter.listWorkScope(projectId)),
    async () => {
      const { workScope } = getLegacySnapshot();
      const mockTasks = await mockAdapters.sheets.listTasks(projectId);
      const merged = workScope.length ? workScope : mockTasks;
      return normalizeTaskRows(merged);
    },
  );
  const ensured = ensureWorkScopeItems(rows);
  return projectId ? ensured.filter((item) => item.projectId === projectId) : ensured;
}

export async function getDocuments(projectId?: string) {
  const rows = await loadWithReadonlyFallback(
    async () => normalizeDocumentRows(await readonlyAdapter.listDocuments(projectId)),
    async () => {
      const { documents } = getLegacySnapshot();
      const mockDocs = await mockAdapters.sheets.listDocuments(projectId);
      const merged = documents.length ? documents : mockDocs;
      return normalizeDocumentRows(merged);
    },
  );
  const ensured = ensureDocuments(rows);
  return projectId ? ensured.filter((item) => item.projectId === projectId) : ensured;
}

export async function getArtwork(projectId?: string) {
  const rows = await loadWithReadonlyFallback(
    async () => normalizeArtworkRows(await readonlyAdapter.listImages(projectId)),
    async () => {
      const { projectImages } = getLegacySnapshot();
      const mockImages = await mockAdapters.drive.listArtwork(projectId);
      const merged = projectImages.length ? projectImages : mockImages;
      return normalizeArtworkRows(merged);
    },
  );
  const ensured = ensureArtwork(rows);
  return projectId ? ensured.filter((item) => item.projectId === projectId) : ensured;
}

export async function getDecisionLog(projectId?: string) {
  return loadWithReadonlyFallback(
    async () => normalizeDecisionRows(await readonlyAdapter.listDecisionLog(projectId)),
    async () => {
      const { decisionLog } = getLegacySnapshot();
      return projectId ? decisionLog.filter((item) => item.projectId === projectId) : decisionLog;
    },
  );
}

export async function getCalendarEvents(projectId?: string) {
  return loadWithReadonlyFallback(
    async () => normalizeCalendarRows(await readonlyAdapter.listCalendar(projectId)),
    async () => {
      const { calendarEvents } = getLegacySnapshot();
      return projectId ? calendarEvents.filter((item) => item.projectId === projectId) : calendarEvents;
    },
  );
}

export async function getAlerts(projectId?: string) {
  return loadWithReadonlyFallback(
    async () => normalizeAlertRows(await readonlyAdapter.listAlerts(projectId)),
    async () => {
      const { alerts } = getLegacySnapshot();
      return projectId ? alerts.filter((item) => item.projectId === projectId) : alerts;
    },
  );
}

export async function getCostDiff(projectId?: string) {
  return loadWithReadonlyFallback(
    async () => normalizeCostDiffRows(await readonlyAdapter.listCostDiff(projectId)),
    async () => {
      const { costDiff } = getLegacySnapshot();
      return projectId ? costDiff.filter((item) => item.projectId === projectId) : costDiff;
    },
  );
}

