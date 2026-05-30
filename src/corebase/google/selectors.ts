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
  return projectId ? workScope.filter((item) => item.projectId === projectId) : workScope;
}

export async function getDocuments(projectId?: string) {
  const { documents } = getLegacySnapshot();
  return projectId ? documents.filter((item) => item.projectId === projectId) : documents;
}

export async function getArtwork(projectId?: string) {
  const { projectImages } = getLegacySnapshot();
  return projectId ? projectImages.filter((item) => item.projectId === projectId) : projectImages;
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
