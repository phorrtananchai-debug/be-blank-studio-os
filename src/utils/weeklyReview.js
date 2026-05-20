import {
  getCriticalDaysUntil,
  normalizeCriticalPath,
} from './criticalPath.js';
import {
  getOperationalTaskSummary,
  getPressureState,
  getTaskDaysUntil,
  normalizeTaskStatus,
} from './operationalTasks.js';

export const weeklyReviewSchema = 'be-blank-studio-weekly-review-v1';

const pressureWeight = {
  SAFE: 0,
  WATCH: 1,
  RISK: 2,
  CRITICAL: 3,
};

function compact(value) {
  return String(value || '').trim();
}

function formatDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getWeekRange(today = new Date()) {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    end: end.toISOString().slice(0, 10),
    label: `${formatDate(start.toISOString())} - ${formatDate(end.toISOString())}`,
    start: start.toISOString().slice(0, 10),
  };
}

function getLatestHistory(project) {
  const history = Array.isArray(project.intelligenceHistory) ? project.intelligenceHistory : [];
  return history[history.length - 1] || null;
}

function getPreviousHistory(project) {
  const history = Array.isArray(project.intelligenceHistory) ? project.intelligenceHistory : [];
  return history.length > 1 ? history[history.length - 2] : null;
}

function getProjectName(projects, projectId) {
  return projects.find((project) => project.id === projectId)?.name || 'Unassigned';
}

function getProjectCriticalMilestones(project) {
  return normalizeCriticalPath(project).map((milestone) => ({
    ...milestone,
    daysUntil: getCriticalDaysUntil(milestone.targetDate),
    projectId: project.id,
    projectName: project.name || 'Untitled Project',
  }));
}

function getPressureChanges(projects) {
  return projects.map((project) => {
    const latest = getLatestHistory(project);
    const previous = getPreviousHistory(project);
    if (!latest && !previous) return null;

    const currentPressure = latest?.pressureState || project.intelligencePressureState || '';
    const previousPressure = previous?.pressureState || '';
    const currentWeight = pressureWeight[currentPressure] ?? null;
    const previousWeight = pressureWeight[previousPressure] ?? null;
    const currentMetrics = latest?.metrics || {};
    const previousMetrics = previous?.metrics || {};
    const waitingDiff = (Number(currentMetrics.waiting) || 0) - (Number(previousMetrics.waiting) || 0);
    const blockedDiff = (Number(currentMetrics.blocked) || 0) - (Number(previousMetrics.blocked) || 0);
    const overdueDiff = (Number(currentMetrics.overdue) || 0) - (Number(previousMetrics.overdue) || 0);

    let direction = 'stable';
    if (currentWeight !== null && previousWeight !== null && currentWeight > previousWeight) direction = 'increased';
    if (currentWeight !== null && previousWeight !== null && currentWeight < previousWeight) direction = 'reduced';
    if (waitingDiff < 0 && direction === 'stable') direction = 'waiting_reduced';
    if ((blockedDiff > 0 || overdueDiff > 0) && direction === 'stable') direction = 'increased';

    const reason = latest?.suggestedFocus || latest?.summary || (Array.isArray(latest?.keyRisks) ? latest.keyRisks[0] : '') || '';

    return {
      blockedDiff,
      direction,
      from: previousPressure || '',
      overdueDiff,
      projectId: project.id,
      projectName: project.name || 'Untitled Project',
      reason,
      summary: buildPressureChangeLine(project.name || 'Untitled Project', direction, reason, { blockedDiff, overdueDiff, waitingDiff }),
      to: currentPressure || previousPressure || 'SAFE',
      waitingDiff,
    };
  }).filter(Boolean);
}

function buildPressureChangeLine(projectName, direction, reason, diffs) {
  if (direction === 'increased') {
    return `${projectName} pressure increased${reason ? ` due to ${reason}` : ''}.`;
  }
  if (direction === 'reduced') {
    return `${projectName} pressure reduced${reason ? ` after ${reason}` : ''}.`;
  }
  if (direction === 'waiting_reduced') {
    return `${projectName} waiting approvals reduced by ${Math.abs(diffs.waitingDiff)}.`;
  }
  if (diffs.blockedDiff > 0) return `${projectName} introduced ${diffs.blockedDiff} new blocker(s).`;
  if (diffs.overdueDiff > 0) return `${projectName} overdue pressure increased by ${diffs.overdueDiff}.`;
  return `${projectName} pressure stabilized${reason ? ` around ${reason}` : ''}.`;
}

function serializeTask(task, projects) {
  return {
    id: task.id || '',
    title: task.title || '',
    projectId: task.projectId || '',
    projectName: getProjectName(projects, task.projectId),
    status: normalizeTaskStatus(task.status),
    priority: task.priority || 'NORMAL',
    dueDate: task.dueDate || '',
    daysUntil: getTaskDaysUntil(task),
    owner: task.owner || '',
    blockedBy: task.blockedBy || '',
    waitingFor: task.waitingFor || '',
    notes: task.notes || '',
  };
}

export function buildWeeklyStudioReview({ projects = [], tasks = [] } = {}) {
  const generatedAt = new Date().toISOString();
  const weekRange = getWeekRange(new Date());
  const taskSummary = getOperationalTaskSummary(tasks);
  const projectPressures = projects.map((project) => ({
    pressure: getPressureState({ project, tasks }),
    project,
  }));

  const projectsAtRisk = projectPressures
    .filter(({ pressure }) => ['RISK', 'CRITICAL'].includes(pressure.state))
    .map(({ pressure, project }) => ({
      id: project.id || '',
      name: project.name || 'Untitled Project',
      pressureState: pressure.state,
      reason: pressure.taskSignals.blocked[0]?.blockedBy || pressure.taskSignals.overdue[0]?.title || project.blockers || project.nextAction || '',
    }));

  const allMilestones = projects.flatMap(getProjectCriticalMilestones);
  const overdueMilestones = allMilestones
    .filter((milestone) => milestone.daysUntil !== null && milestone.daysUntil < 0 && milestone.status !== 'DONE')
    .sort((left, right) => left.daysUntil - right.daysUntil);
  const criticalDeadlines = allMilestones
    .filter((milestone) => milestone.daysUntil !== null && milestone.daysUntil >= 0 && milestone.daysUntil <= 14 && milestone.status !== 'DONE')
    .sort((left, right) => left.daysUntil - right.daysUntil);

  const blockedItems = taskSummary.blocked.map((task) => serializeTask(task, projects));
  const waitingApprovals = taskSummary.waiting.map((task) => serializeTask(task, projects));
  const pressureChanges = getPressureChanges(projects);
  const increasedPressure = pressureChanges.filter((change) => change.direction === 'increased');
  const reducedWaiting = pressureChanges.filter((change) => change.direction === 'waiting_reduced' || change.waitingDiff < 0);
  const recommendedFocus = [
    ...projectsAtRisk.slice(0, 3).map((project) => `${project.name}: resolve ${project.reason || project.pressureState.toLowerCase()} pressure.`),
    ...overdueMilestones.slice(0, 2).map((milestone) => `${milestone.projectName}: recover overdue ${milestone.label}.`),
    ...waitingApprovals.slice(0, 2).map((task) => `${task.projectName}: secure ${task.waitingFor || task.title}.`),
  ].filter(Boolean).slice(0, 6);
  const operationalHighlights = [
    reducedWaiting.length ? `Waiting approvals reduced on ${reducedWaiting.map((item) => item.projectName).slice(0, 3).join(', ')}.` : '',
    criticalDeadlines.length ? `${criticalDeadlines.length} critical milestone(s) due within 14 days.` : '',
    !projectsAtRisk.length && !blockedItems.length ? 'No critical project pressure currently detected.' : '',
  ].filter(Boolean);

  return {
    schema: weeklyReviewSchema,
    generatedAt,
    weekRange,
    summary: {
      projectsAtRisk: projectsAtRisk.length,
      blockedItems: blockedItems.length,
      waitingApprovals: waitingApprovals.length,
      overdueMilestones: overdueMilestones.length,
      criticalDeadlines: criticalDeadlines.length,
      pressureIncreased: increasedPressure.length,
    },
    projectsAtRisk,
    blockedItems,
    waitingApprovals,
    overdueMilestones,
    criticalDeadlines,
    pressureChanges,
    recommendedFocus,
    operationalHighlights,
    futureHooks: {
      emailSummary: false,
      mondayAutomation: false,
      pdfExport: false,
      telegramDigest: false,
    },
  };
}

export function buildWeeklyReviewBriefing(review) {
  const lines = [
    'Weekly Studio Operations Review',
    `Week: ${review.weekRange?.label || ''}`,
    `Generated: ${review.generatedAt}`,
    '',
    'This Week\'s Risks',
    ...(review.projectsAtRisk.length
      ? review.projectsAtRisk.map((project) => `- ${project.name}: ${project.pressureState}${project.reason ? ` / ${project.reason}` : ''}`)
      : ['- No project is currently marked at risk.']),
    '',
    'Blocked / Waiting',
    `- Blocked items: ${review.blockedItems.length}`,
    `- Waiting approvals: ${review.waitingApprovals.length}`,
    ...review.blockedItems.slice(0, 4).map((item) => `- ${item.projectName}: ${item.blockedBy || item.title}`),
    ...review.waitingApprovals.slice(0, 4).map((item) => `- ${item.projectName}: waiting for ${item.waitingFor || item.title}`),
    '',
    'Critical Milestones',
    ...(review.overdueMilestones.length
      ? review.overdueMilestones.slice(0, 5).map((milestone) => `- ${milestone.projectName}: ${milestone.label} is ${Math.abs(milestone.daysUntil)}d overdue.`)
      : ['- No overdue critical milestones.']),
    ...review.criticalDeadlines.slice(0, 5).map((milestone) => `- ${milestone.projectName}: ${milestone.label} due in ${milestone.daysUntil}d.`),
    '',
    'Pressure Changes',
    ...(review.pressureChanges.length ? review.pressureChanges.slice(0, 6).map((change) => `- ${change.summary}`) : ['- No intelligence history changes detected yet.']),
    '',
    'Recommended Focus',
    ...(review.recommendedFocus.length ? review.recommendedFocus.map((focus) => `- ${focus}`) : ['- Maintain current delivery rhythm.']),
    '',
    'Operational Highlights',
    ...(review.operationalHighlights.length ? review.operationalHighlights.map((item) => `- ${item}`) : ['- No highlights generated from current data.']),
  ];

  return lines.join('\n');
}
