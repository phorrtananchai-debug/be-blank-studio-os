import { initialContentItems, initialPortfolioItems, initialProjects } from '../../data/seed.js';
import { mapLegacyToCorebase } from './legacyToCorebase';
import { createMockGoogleCorebaseAdapters } from './mockAdapters';

const mockAdapters = createMockGoogleCorebaseAdapters();

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

export async function getProjects() {
  const [mockProjects, snapshot] = await Promise.all([
    mockAdapters.sheets.listProjects(),
    Promise.resolve(getLegacySnapshot()),
  ]);
  const byId = new Map(snapshot.projectRefs.map((project) => [project.id, project]));
  mockProjects.forEach((project) => {
    if (!byId.has(project.id)) byId.set(project.id, project);
  });
  return Array.from(byId.values());
}

export async function getProjectById(projectId: string) {
  const projects = await getProjects();
  return projects.find((project) => project.id === projectId || project.aliases?.includes(projectId)) || null;
}

export async function getWorkScope(projectId?: string) {
  const { workScope } = getLegacySnapshot();
  const rows = ensureWorkScopeItems(workScope);
  return projectId ? rows.filter((item) => item.projectId === projectId) : rows;
}

export async function getDocuments(projectId?: string) {
  const { documents } = getLegacySnapshot();
  const rows = ensureDocuments(documents);
  return projectId ? rows.filter((item) => item.projectId === projectId) : rows;
}

export async function getArtwork(projectId?: string) {
  const { projectImages } = getLegacySnapshot();
  const rows = ensureArtwork(projectImages);
  return projectId ? rows.filter((item) => item.projectId === projectId) : rows;
}

export async function getDecisionLog(projectId?: string) {
  const { decisionLog } = getLegacySnapshot();
  return projectId ? decisionLog.filter((item) => item.projectId === projectId) : decisionLog;
}

export async function getCalendarEvents(projectId?: string) {
  const { calendarEvents } = getLegacySnapshot();
  return projectId ? calendarEvents.filter((item) => item.projectId === projectId) : calendarEvents;
}

export async function getAlerts(projectId?: string) {
  const { alerts } = getLegacySnapshot();
  return projectId ? alerts.filter((item) => item.projectId === projectId) : alerts;
}

export async function getCostDiff(projectId?: string) {
  const { costDiff } = getLegacySnapshot();
  return projectId ? costDiff.filter((item) => item.projectId === projectId) : costDiff;
}
