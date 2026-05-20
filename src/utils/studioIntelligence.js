import { createContentItem } from './dashboard.js';
import {
  createOperationalTask,
  getOperationalTaskSummary,
  getPressureState,
  getProjectTaskSignals,
  normalizeTaskStatus,
} from './operationalTasks.js';

export const intelligenceExportSchema = 'be-blank-studio-intelligence-v1';
export const intelligenceAnalysisSchema = 'be-blank-studio-analysis-v1';

function compact(value) {
  return String(value || '').trim();
}

function splitLines(value) {
  return compact(value)
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getDaysUntil(value) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : Math.ceil((date - today) / (1000 * 60 * 60 * 24));
}

function getProjectRisks(project, pressure, taskSignals) {
  const risks = [];
  if (pressure.state === 'CRITICAL' || pressure.state === 'RISK') risks.push(`Pressure state: ${pressure.state}`);
  if (taskSignals.overdue.length) risks.push(`${taskSignals.overdue.length} overdue task(s)`);
  if (taskSignals.blocked.length) risks.push(`${taskSignals.blocked.length} blocked task(s)`);
  if (pressure.openingSoon) risks.push('Opening date is approaching');
  if (pressure.handoverDays !== null && pressure.handoverDays <= 14) risks.push('Handover date is approaching');
  return risks;
}

function getProjectConstraints(project) {
  return [
    ...splitLines(project.phaseNotes),
    ...splitLines(project.blockers),
  ];
}

function serializeTask(task) {
  return {
    id: task.id || '',
    title: task.title || '',
    projectId: task.projectId || '',
    status: normalizeTaskStatus(task.status),
    priority: task.priority || 'NORMAL',
    dueDate: task.dueDate || task.startDate || '',
    owner: task.owner || '',
    blockedBy: task.blockedBy || '',
    waitingFor: task.waitingFor || '',
    completedAt: task.completedAt || '',
    notes: task.notes || task.detail || '',
  };
}

export function buildStudioIntelligenceExport({ contentItems = [], portfolioItems = [], projects = [], tasks = [] } = {}) {
  const taskSummary = getOperationalTaskSummary(tasks);
  const activeProjects = projects.filter((project) => String(project.status || '').toLowerCase() !== 'open');
  const openingSoon = activeProjects.filter((project) => {
    const days = getDaysUntil(project.openingDate);
    return days !== null && days >= 0 && days <= 21;
  });
  const handoverRisk = activeProjects.filter((project) => {
    const pressure = getPressureState({ project, tasks });
    return ['RISK', 'CRITICAL'].includes(pressure.state) && pressure.handoverDays !== null && pressure.handoverDays <= 14;
  });

  return {
    schema: intelligenceExportSchema,
    studio: 'Be Blank to Behind Studio',
    generatedAt: new Date().toISOString(),
    projects: projects.map((project) => {
      const pressure = getPressureState({ project, tasks });
      const taskSignals = getProjectTaskSignals(project, tasks);
      const projectTasks = taskSignals.projectTasks.map(serializeTask);
      const nextActions = [
        ...projectTasks.filter((task) => task.status !== 'DONE').slice(0, 5),
        ...splitLines(project.nextAction).map((title) => ({ title, source: 'project.nextAction' })),
      ];

      return {
        id: project.id || '',
        name: project.name || '',
        client: project.client || '',
        phase: project.status || '',
        status: project.status || '',
        pressureState: pressure.state,
        pressureScore: (pressure.overdueCount * 5) + (pressure.blockedCount * 4) + (pressure.missingNextAction ? 1 : 0),
        openingDate: project.openingDate || '',
        handoverDate: project.handoverDate || '',
        nextActions,
        blockedBy: [
          ...taskSignals.blocked.map((task) => task.blockedBy || task.title).filter(Boolean),
          ...splitLines(project.blockers),
        ],
        waitingFor: taskSignals.waiting.map((task) => task.waitingFor || task.title).filter(Boolean),
        tasks: projectTasks,
        notes: [
          project.notes,
          project.currentFocus,
        ].filter(Boolean),
        siteLogs: Array.isArray(project.siteLogs) ? project.siteLogs : [],
        risks: getProjectRisks(project, pressure, taskSignals),
        constraints: getProjectConstraints(project),
      };
    }),
    portfolioItems: portfolioItems.map((item) => ({
      id: item.id || '',
      title: item.title || '',
      category: item.category || '',
      location: item.location || '',
      year: item.year || '',
      description: item.description || '',
      imageUrl: item.imageUrl || '',
    })),
    tasks: tasks.map(serializeTask),
    notes: contentItems.map((item) => ({
      id: item.id || '',
      title: item.title || '',
      status: item.status || '',
      body: item.captionEN || item.captionTH || '',
    })),
    summary: {
      overdue: taskSummary.overdue.length,
      blocked: taskSummary.blocked.length,
      waiting: taskSummary.waiting.length,
      openingSoon: openingSoon.length,
      handoverRisk: handoverRisk.length,
    },
  };
}

export function buildStudioIntelligenceSummary(intelligence) {
  const summary = intelligence.summary || {};
  const lines = [
    `${intelligence.studio} intelligence export`,
    `Generated: ${intelligence.generatedAt}`,
    `Projects: ${intelligence.projects?.length || 0}`,
    `Open tasks: ${intelligence.tasks?.filter((task) => task.status !== 'DONE').length || 0}`,
    `Overdue: ${summary.overdue || 0}`,
    `Blocked: ${summary.blocked || 0}`,
    `Waiting: ${summary.waiting || 0}`,
    `Opening soon: ${summary.openingSoon || 0}`,
    `Handover risk: ${summary.handoverRisk || 0}`,
  ];

  return lines.join('\n');
}

export function buildAiAnalysisPrompt() {
  return `Read the exported Be Blank Studio OS JSON and analyze operational project health.

Identify risks, blocked work, waiting approvals, project priority, handover/opening readiness, and recommended next actions.

Return valid JSON only. Do not include markdown, commentary, or code fences.

Use this exact schema:
{
  "schema": "be-blank-studio-analysis-v1",
  "generatedAt": "...",
  "projectUpdates": [
    {
      "projectId": "...",
      "projectName": "...",
      "currentPriority": "...",
      "deliveryConstraints": "...",
      "risks": [],
      "recommendedNextActions": [],
      "suggestedTasks": [],
      "status": "...",
      "pressureState": "SAFE | WATCH | RISK | CRITICAL"
    }
  ],
  "newTasks": [],
  "notes": [],
  "summary": "..."
}`;
}

function validateProjectUpdate(update, index) {
  if (!update || typeof update !== 'object' || Array.isArray(update)) {
    return [`projectUpdates item ${index + 1} must be an object.`];
  }

  if (!compact(update.projectId) && !compact(update.projectName)) {
    return [`projectUpdates item ${index + 1} needs projectId or projectName.`];
  }

  return [];
}

export function parseStudioAnalysisJson(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { analysis: null, errors: ['Analysis file is not valid JSON.'], preview: null };
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { analysis: null, errors: ['Analysis root must be a JSON object.'], preview: null };
  }

  if (data.schema !== intelligenceAnalysisSchema) {
    return { analysis: null, errors: ['Analysis schema must be be-blank-studio-analysis-v1.'], preview: null };
  }

  const projectUpdates = Array.isArray(data.projectUpdates) ? data.projectUpdates : [];
  const newTasks = Array.isArray(data.newTasks) ? data.newTasks : [];
  const notes = Array.isArray(data.notes) ? data.notes : [];
  const errors = projectUpdates.flatMap(validateProjectUpdate);

  if (errors.length) {
    return { analysis: null, errors, preview: null };
  }

  return {
    analysis: {
      ...data,
      newTasks,
      notes,
      projectUpdates,
      summary: compact(data.summary),
    },
    errors: [],
    preview: {
      newTasks: newTasks.length,
      notes: notes.length,
      projectUpdates: projectUpdates.length,
      samples: projectUpdates.slice(0, 4).map((update) => compact(update.projectName) || compact(update.projectId)),
      summary: compact(data.summary),
    },
  };
}

export function createAnalysisTask(task, fallbackProjectId = '') {
  const title = typeof task === 'string' ? task : task?.title || task?.name || task?.action || '';
  return createOperationalTask({
    ...((typeof task === 'object' && task) || {}),
    projectId: task?.projectId || fallbackProjectId,
    status: task?.status || 'OPEN',
    title,
  });
}

export function createAnalysisNote(note) {
  const body = typeof note === 'string' ? note : note?.body || note?.text || note?.note || '';
  const title = typeof note === 'string' ? 'AI analysis note' : note?.title || 'AI analysis note';
  return {
    ...createContentItem(),
    captionEN: body,
    platform: 'Studio',
    status: 'idea',
    title,
  };
}
