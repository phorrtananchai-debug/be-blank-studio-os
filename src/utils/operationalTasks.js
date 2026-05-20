import { createId } from './dashboard.js';

export const taskCollectionName = 'tasks';
export const taskStatuses = ['OPEN', 'ACTIVE', 'WAITING', 'BLOCKED', 'DONE'];
export const taskPriorities = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];

const dayInMs = 1000 * 60 * 60 * 24;
const doneStatuses = new Set(['DONE', 'done', 'completed', 'complete']);
const priorityWeight = {
  CRITICAL: 4,
  HIGH: 3,
  NORMAL: 2,
  LOW: 1,
};

export function normalizeTaskStatus(value) {
  const status = String(value || '').trim().toUpperCase();
  if (['DONE', 'COMPLETED', 'COMPLETE'].includes(status)) return 'DONE';
  if (['BLOCKED', 'BLOCK'].includes(status)) return 'BLOCKED';
  if (['WAITING', 'WAIT', 'PENDING'].includes(status)) return 'WAITING';
  if (['ACTIVE', 'IN_PROGRESS', 'IN-PROGRESS', 'DOING'].includes(status)) return 'ACTIVE';
  return 'OPEN';
}

export function normalizeTaskPriority(value) {
  const priority = String(value || '').trim().toUpperCase();
  return taskPriorities.includes(priority) ? priority : 'NORMAL';
}

export function isOperationalTaskDone(task) {
  return doneStatuses.has(task?.status) || normalizeTaskStatus(task?.status) === 'DONE' || Boolean(task?.completedAt);
}

export function parseTaskDate(value) {
  if (!value) return null;
  if (value?.toDate) {
    const date = value.toDate();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  const text = String(value).slice(0, 10);
  const date = new Date(`${text}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getTaskDaysUntil(task, today = startOfToday()) {
  const date = parseTaskDate(task?.dueDate || task?.startDate);
  return date ? Math.ceil((date - today) / dayInMs) : null;
}

export function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function createOperationalTask(input = {}) {
  const now = new Date().toISOString();
  const status = normalizeTaskStatus(input.status);

  return {
    id: input.id || createId('task'),
    title: String(input.title || '').trim() || 'Untitled task',
    projectId: input.projectId || '',
    status,
    priority: normalizeTaskPriority(input.priority),
    dueDate: input.dueDate || input.startDate || '',
    owner: input.owner || '',
    blockedBy: input.blockedBy || '',
    waitingFor: input.waitingFor || '',
    dependencies: input.dependencies || input.dependency || '',
    linkedMilestone: input.linkedMilestone || input.milestone || '',
    linkedParty: input.linkedParty || input.contractor || input.client || '',
    procurementFlag: Boolean(input.procurementFlag || input.procurement || input.isProcurement),
    handoverFlag: Boolean(input.handoverFlag || input.handover || input.isHandover),
    createdAt: input.createdAt || now,
    completedAt: status === 'DONE' ? input.completedAt || now : input.completedAt || '',
    notes: input.notes || input.detail || '',
  };
}

export function inferTaskDraft(text, projects = []) {
  const lines = String(text || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const body = lines.join('\n');
  const dateMatch = body.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  const lowerBody = body.toLowerCase();
  const matchedProject = projects.find((project) => {
    const name = String(project.name || '').trim().toLowerCase();
    return name && lowerBody.includes(name);
  });
  let dueDate = dateMatch?.[1] || '';

  if (!dueDate && /\btoday\b/i.test(body)) {
    dueDate = new Date().toISOString().slice(0, 10);
  }

  if (!dueDate && /\btomorrow\b/i.test(body)) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dueDate = tomorrow.toISOString().slice(0, 10);
  }

  return createOperationalTask({
    title: lines[0] || body,
    projectId: matchedProject?.id || '',
    dueDate,
    notes: lines.slice(1).join('\n'),
    status: 'OPEN',
    priority: /\burgent|critical|block/i.test(body) ? 'HIGH' : 'NORMAL',
  });
}

function sortTasksByPressure(left, right) {
  const leftDays = getTaskDaysUntil(left);
  const rightDays = getTaskDaysUntil(right);
  const leftDate = leftDays === null ? 999 : leftDays;
  const rightDate = rightDays === null ? 999 : rightDays;
  const leftStatus = normalizeTaskStatus(left.status);
  const rightStatus = normalizeTaskStatus(right.status);
  const statusWeight = { BLOCKED: 5, WAITING: 4, ACTIVE: 3, OPEN: 2, DONE: 0 };

  return (
    (statusWeight[rightStatus] || 0) - (statusWeight[leftStatus] || 0)
    || (priorityWeight[normalizeTaskPriority(right.priority)] || 0) - (priorityWeight[normalizeTaskPriority(left.priority)] || 0)
    || leftDate - rightDate
  );
}

function isWaitingTask(task) {
  return normalizeTaskStatus(task.status) === 'WAITING' || String(task.waitingFor || '').trim();
}

function isBlockedTask(task) {
  return normalizeTaskStatus(task.status) === 'BLOCKED' || String(task.blockedBy || '').trim();
}

export function getTaskSignalTone(task) {
  const days = getTaskDaysUntil(task);
  const status = normalizeTaskStatus(task?.status);
  if (days !== null && days < 0) return 'overdue';
  if (status === 'BLOCKED' || String(task?.blockedBy || '').trim()) return 'blocked';
  if (status === 'WAITING' || String(task?.waitingFor || '').trim()) return 'waiting';
  if (normalizeTaskPriority(task?.priority) === 'HIGH' || normalizeTaskPriority(task?.priority) === 'CRITICAL') return 'risk';
  return status === 'DONE' ? 'safe' : 'neutral';
}

export function getTaskOperationalNote(task) {
  return [
    task?.blockedBy && `Blocked by ${task.blockedBy}`,
    task?.waitingFor && `Waiting for ${task.waitingFor}`,
    task?.dependencies && `Depends on ${task.dependencies}`,
    task?.linkedMilestone && `Milestone ${task.linkedMilestone}`,
    task?.linkedParty && `Linked to ${task.linkedParty}`,
    task?.procurementFlag && 'Procurement flagged',
    task?.handoverFlag && 'Handover flagged',
    task?.notes,
  ].find((value) => String(value || '').trim()) || 'No operational note.';
}

export function getProjectTaskSignals(project, tasks = []) {
  const projectTasks = tasks.filter((task) => task.projectId === project.id);
  const openTasks = projectTasks.filter((task) => !isOperationalTaskDone(task));
  const today = startOfToday();
  const overdue = openTasks.filter((task) => {
    const days = getTaskDaysUntil(task, today);
    return days !== null && days < 0;
  });
  const dueSoon = openTasks.filter((task) => {
    const days = getTaskDaysUntil(task, today);
    return days !== null && days >= 0 && days <= 7;
  });
  const blocked = openTasks.filter((task) => normalizeTaskStatus(task.status) === 'BLOCKED' || String(task.blockedBy || '').trim());
  const waiting = openTasks.filter((task) => normalizeTaskStatus(task.status) === 'WAITING' || String(task.waitingFor || '').trim());
  const nextAction = [...openTasks].sort(sortTasksByPressure)[0] || null;

  return {
    blocked,
    dueSoon,
    nextAction,
    openTasks,
    overdue,
    projectTasks,
    waiting,
  };
}

export function getPressureState({ project, tasks = [] }) {
  const taskSignals = getProjectTaskSignals(project, tasks);
  const handoverDays = getProjectDaysUntil(project?.handoverDate);
  const openingDays = getProjectDaysUntil(project?.openingDate);
  const hasProjectBlocker = Boolean(String(project?.blockers || '').trim());
  const missingNextAction = !taskSignals.nextAction && !String(project?.nextAction || '').trim();
  const overdueCount = taskSignals.overdue.length;
  const blockedCount = taskSignals.blocked.length + (hasProjectBlocker ? 1 : 0);
  const openingSoon = openingDays !== null && openingDays >= 0 && openingDays <= 21;
  const handoverSoon = handoverDays !== null && handoverDays >= 0 && handoverDays <= 14;
  const overdueProjectDate = [handoverDays, openingDays, getProjectDaysUntil(project?.designCompleteDate)].some((days) => days !== null && days < 0);
  let state = 'SAFE';

  if (overdueCount > 1 || blockedCount > 1 || (overdueProjectDate && blockedCount)) {
    state = 'CRITICAL';
  } else if (overdueCount || blockedCount || overdueProjectDate || (openingSoon && missingNextAction)) {
    state = 'RISK';
  } else if (taskSignals.waiting.length || taskSignals.dueSoon.length || missingNextAction || openingSoon || handoverSoon) {
    state = 'WATCH';
  }

  return {
    blockedCount,
    handoverDays,
    missingNextAction,
    openingDays,
    openingSoon,
    overdueCount,
    state,
    taskSignals,
  };
}

function getProjectDaysUntil(value) {
  const date = parseTaskDate(value);
  return date ? Math.ceil((date - startOfToday()) / dayInMs) : null;
}

export function getOperationalTaskSummary(tasks = []) {
  const openTasks = tasks.filter((task) => !isOperationalTaskDone(task));
  const today = startOfToday();
  const overdue = openTasks.filter((task) => {
    const days = getTaskDaysUntil(task, today);
    return days !== null && days < 0;
  }).sort(sortTasksByPressure);
  const todayTasks = openTasks.filter((task) => getTaskDaysUntil(task, today) === 0).sort(sortTasksByPressure);
  const dueSoon = openTasks.filter((task) => {
    const days = getTaskDaysUntil(task, today);
    return days !== null && days > 0 && days <= 7;
  }).sort(sortTasksByPressure);
  const waiting = openTasks.filter(isWaitingTask).sort(sortTasksByPressure);
  const blocked = openTasks.filter(isBlockedTask).sort(sortTasksByPressure);
  const nextActions = [...openTasks].sort(sortTasksByPressure).slice(0, 7);
  const upcomingDeadlines = openTasks.filter((task) => {
    const days = getTaskDaysUntil(task, today);
    return days !== null && days > 7 && days <= 30;
  }).sort(sortTasksByPressure);

  return {
    blocked,
    dueSoon,
    nextActions,
    openTasks,
    overdue,
    today: todayTasks,
    upcomingDeadlines,
    waiting,
  };
}

export function getOperationalTaskGroups(tasks = []) {
  const summary = getOperationalTaskSummary(tasks);
  const openTasks = summary.openTasks;
  const today = startOfToday();
  const thisWeek = openTasks.filter((task) => {
    const days = getTaskDaysUntil(task, today);
    return days !== null && days > 0 && days <= 7 && !isWaitingTask(task) && !isBlockedTask(task);
  }).sort(sortTasksByPressure);

  return [
    { id: 'today', label: 'Today', tasks: summary.today },
    { id: 'this-week', label: 'This Week', tasks: thisWeek },
    { id: 'waiting', label: 'Waiting', tasks: summary.waiting },
    { id: 'blocked', label: 'Blocked', tasks: summary.blocked },
    { id: 'upcoming', label: 'Upcoming Deadlines', tasks: summary.upcomingDeadlines },
  ];
}
