import { initialContentItems, initialPortfolioItems, initialProjects } from '../../data/seed.js';
import { getPressureState, normalizeTaskStatus } from '../../utils/operationalTasks.js';
import type {
  AlertItem,
  CalendarEvent,
  CorebaseProjectRef,
  CostDiffItem,
  DecisionLogItem,
  DocumentItem,
  ProjectImage,
  SiteUpdateItem,
  WorkScopeItem,
} from './models';

const PROJECT_ID_MAP: Record<string, string> = {
  'karun-phuket': 'KARUN-PHUKET-OLDTOWN',
  'karun-phuket-oldtown': 'KARUN-PHUKET-OLDTOWN',
  'karun-central-khonkaen': 'KARUN-CENTRAL-KHONKAEN',
  'avery-gaysorn-amarin': 'AVERY-GAYSORN-AMARIN',
  'ultimate-bkk': 'ULTIMATE-BKK',
};

const PROJECT_ALIASES: Record<string, string[]> = {
  'KARUN-PHUKET-OLDTOWN': ['karun-phuket', 'karun-phuket-oldtown'],
  'KARUN-CENTRAL-KHONKAEN': ['karun-central-khonkaen'],
  'AVERY-GAYSORN-AMARIN': ['avery-gaysorn-amarin', 'avery-wong'],
  'ULTIMATE-BKK': ['ultimate-bkk'],
};

function slugify(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function getCanonicalProjectId(legacyProject: { id?: string; name?: string } = {}) {
  const legacyId = slugify(legacyProject.id || '');
  if (PROJECT_ID_MAP[legacyId]) return PROJECT_ID_MAP[legacyId];
  const byName = PROJECT_ID_MAP[slugify(legacyProject.name || '')];
  if (byName) return byName;
  return slugify(legacyProject.id || legacyProject.name || 'project').toUpperCase();
}

export function getProjectAliases(canonicalProjectId: string, legacyProjectId = '') {
  const predefined = PROJECT_ALIASES[canonicalProjectId] || [];
  const normalizedLegacyId = slugify(legacyProjectId);
  if (!normalizedLegacyId) return predefined;
  return Array.from(new Set([...predefined, normalizedLegacyId]));
}

function mapLegacyProjectRefs(projects = initialProjects): CorebaseProjectRef[] {
  return projects.map((project) => {
    const canonicalId = getCanonicalProjectId(project);
    return {
      id: canonicalId,
      name: project.name || canonicalId,
      phase: project.status || '',
      aliases: getProjectAliases(canonicalId, project.id),
    };
  });
}

function mapLegacyTasks(tasks = [], projects = initialProjects): WorkScopeItem[] {
  const sourceTasks = tasks.length
    ? tasks
    : projects.map((project: any, index: number) => ({
      dueDate: project.handoverDate || project.openingDate || '',
      id: `legacy-seeded-task-${index + 1}`,
      notes: project.notes || '',
      priority: 'NORMAL',
      projectId: project.id,
      status: 'OPEN',
      title: project.nextAction || `Next action for ${project.name}`,
    }));

  return sourceTasks.map((task: any) => {
    const matchedProject = projects.find((project) => project.id === task.projectId);
    return {
      id: task.id || `TASK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      projectId: getCanonicalProjectId({ id: task.projectId || matchedProject?.id || '' }),
      title: String(task.title || 'Untitled task'),
      status: normalizeTaskStatus(task.status) === 'OPEN' ? 'TODO' : (
        normalizeTaskStatus(task.status) === 'ACTIVE' ? 'IN_PROGRESS' : normalizeTaskStatus(task.status)
      ) as WorkScopeItem['status'],
      assignee: task.owner || '',
      dueDate: task.dueDate || '',
      updatedAt: task.updatedAt || task.createdAt || new Date().toISOString(),
      priority: task.priority || 'NORMAL',
      blockedBy: task.blockedBy || '',
      waitingFor: task.waitingFor || '',
      notes: task.notes || '',
    };
  });
}

function mapLegacyDecisionLog(contentItems = initialContentItems): DecisionLogItem[] {
  return contentItems.map((item: any) => ({
    id: item.id || `DECISION-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    title: String(item.title || 'Untitled note'),
    body: String(item.captionEN || item.captionTH || ''),
    type: 'journal',
    createdAt: item.createdAt || new Date().toISOString(),
    source: 'legacy-content',
  }));
}

function mapLegacyDocuments(projects = initialProjects): DocumentItem[] {
  return projects.flatMap((project: any) => {
    const projectId = getCanonicalProjectId(project);
    const docs = Array.isArray(project.documents) ? project.documents : [];
    const drawingDoc = project.drawingLink ? [{
      label: `Drawing ${project.drawingVersion || ''}`.trim(),
      status: project.drawingStatus || 'draft',
      url: project.drawingLink,
    }] : [];
    return [...docs, ...drawingDoc].map((document: any, index: number) => ({
      id: `${projectId}-DOC-${index + 1}`,
      projectId,
      title: String(document.label || document.title || document.url || 'Untitled document'),
      revision: String(document.revision || project.drawingVersion || 'R0'),
      status: String(document.status || 'Draft') as DocumentItem['status'],
      owner: String(document.owner || project.owner || ''),
      updatedAt: new Date().toISOString(),
      legacySource: 'project.documents',
      url: document.url || '',
    }));
  });
}

function mapLegacyProjectImages(portfolioItems = initialPortfolioItems): ProjectImage[] {
  return portfolioItems.flatMap((item: any, index: number) => {
    const projectId = getCanonicalProjectId({ id: item.id, name: item.title });
    const urls = String(item.galleryUrls || '')
      .split(/\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean);
    const cover = item.imageUrl ? [{
      id: `${projectId}-IMG-COVER`,
      projectId,
      title: `${item.title || 'Project'} cover`,
      mediaType: 'image' as const,
      previewUrl: item.imageUrl,
      updatedAt: new Date().toISOString(),
      role: 'cover' as const,
      legacySource: 'portfolio.imageUrl',
    }] : [];
    const gallery = urls.map((url, galleryIndex) => ({
      id: `${projectId}-IMG-${galleryIndex + 1}`,
      projectId,
      title: `${item.title || 'Project'} gallery ${galleryIndex + 1}`,
      mediaType: 'image' as const,
      previewUrl: url,
      updatedAt: new Date().toISOString(),
      role: 'gallery' as const,
      legacySource: 'portfolio.galleryUrls',
    }));
    return [...cover, ...gallery, ...(Array.isArray(item.galleryImages) ? item.galleryImages.map((image: any, i: number) => ({
      id: `${projectId}-IMG-UP-${index}-${i + 1}`,
      projectId,
      title: image.alt || `${item.title || 'Project'} uploaded image`,
      mediaType: 'image' as const,
      previewUrl: image.url || '',
      updatedAt: image.updatedAt || new Date().toISOString(),
      role: 'gallery' as const,
      legacySource: 'portfolio.galleryImages',
    })) : [])];
  });
}

function mapLegacyCalendarEvents(projects = initialProjects): CalendarEvent[] {
  return projects.flatMap((project: any) => {
    const projectId = getCanonicalProjectId(project);
    const points = [
      { key: 'startDate', label: 'Project Kickoff' },
      { key: 'designCompleteDate', label: 'Design Complete' },
      { key: 'clientReviewDate', label: 'Client Review' },
      { key: 'revisionCompleteDate', label: 'Revision Complete' },
      { key: 'handoverDate', label: 'Handover' },
      { key: 'openingDate', label: 'Opening' },
    ];
    return points
      .filter(({ key }) => project[key])
      .map(({ key, label }, index) => ({
        id: `${projectId}-EVT-${index + 1}`,
        projectId,
        title: `${project.name} - ${label}`,
        startAt: `${project[key]}T00:00:00.000Z`,
        endAt: `${project[key]}T01:00:00.000Z`,
        category: 'timeline',
        legacySource: `project.${key}`,
      }));
  });
}

function mapLegacySiteUpdates(projects = initialProjects): SiteUpdateItem[] {
  return projects.flatMap((project: any) => {
    const projectId = getCanonicalProjectId(project);
    const logs = Array.isArray(project.siteLogs) ? project.siteLogs : [];
    return logs.map((log: any, index: number) => ({
      id: `${projectId}-SITE-${index + 1}`,
      projectId,
      title: String(log.title || `Site log ${index + 1}`),
      body: String([log.notes, log.issues].filter(Boolean).join('\n')),
      date: String(log.date || new Date().toISOString().slice(0, 10)),
    }));
  });
}

function mapLegacyAlerts(projects = initialProjects, tasks = []): AlertItem[] {
  return projects.flatMap((project: any) => {
    const canonicalId = getCanonicalProjectId(project);
    const pressure = getPressureState({ project, tasks });
    if (pressure.state === 'SAFE') return [];
    return [{
      id: `${canonicalId}-ALERT-1`,
      projectId: canonicalId,
      level: pressure.state as AlertItem['level'],
      message: `${project.name}: pressure ${pressure.state}, blocked ${pressure.blockedCount}, overdue ${pressure.overdueCount}`,
      source: 'operational-pressure',
      createdAt: new Date().toISOString(),
    }];
  });
}

function mapLegacyCostDiff(projects = initialProjects): CostDiffItem[] {
  return projects.map((project: any) => {
    const baseline = Number(project.estimatedCost || project.totalBudget || 0);
    const current = Number(project.actualCost || 0);
    return {
      id: `${getCanonicalProjectId(project)}-COSTDIFF`,
      projectId: getCanonicalProjectId(project),
      baselineCost: baseline,
      currentCost: current,
      delta: current - baseline,
      updatedAt: new Date().toISOString(),
    };
  });
}

export function mapLegacyToCorebase({
  projects = initialProjects,
  tasks = [],
  contentItems = initialContentItems,
  portfolioItems = initialPortfolioItems,
}: {
  projects?: any[];
  tasks?: any[];
  contentItems?: any[];
  portfolioItems?: any[];
} = {}) {
  const siteUpdates = mapLegacySiteUpdates(projects);
  const decisionLog = [
    ...mapLegacyDecisionLog(contentItems),
    ...siteUpdates.map((update) => ({
      id: `${update.id}-DECISION`,
      projectId: update.projectId,
      title: update.title,
      body: update.body,
      type: 'site-update' as const,
      createdAt: `${update.date}T00:00:00.000Z`,
      source: 'legacy-siteLogs',
    })),
  ];
  return {
    alerts: mapLegacyAlerts(projects, tasks),
    calendarEvents: mapLegacyCalendarEvents(projects),
    costDiff: mapLegacyCostDiff(projects),
    decisionLog,
    documents: mapLegacyDocuments(projects),
    projectImages: mapLegacyProjectImages(portfolioItems),
    projectRefs: mapLegacyProjectRefs(projects),
    siteUpdates,
    workScope: mapLegacyTasks(tasks, projects),
  };
}
