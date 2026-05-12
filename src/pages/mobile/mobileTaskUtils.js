import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

const dayInMs = 24 * 60 * 60 * 1000;
const monthNames = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

export function formatTaskCount(count) {
  return count === 1 ? 'TASK' : 'TASKS';
}

export function getTaskDate(task) {
  return getTaskDateRange(task).start;
}

export function getTaskStartDate(task, contextDate) {
  return getTaskDateRange(task, contextDate).start;
}

export function getTaskEndDate(task, contextDate) {
  return getTaskDateRange(task, contextDate).end;
}

export function parseDateValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value?.toDate === 'function') {
    return value.toDate();
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isSameDay(left, right) {
  return (
    left &&
    right &&
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function startOfDay(date) {
  if (!date) {
    return null;
  }

  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function getInferredTextRange(task, contextDate) {
  const text = [task.title, task.notes, task.detail]
    .filter(Boolean)
    .join(' ');
  const thaiDateWord = '\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48';
  const rangeMatch = text.match(new RegExp(`${thaiDateWord}\\s*(\\d{1,2})\\s*[-\\u2013]\\s*(\\d{1,2})`));

  if (!rangeMatch || !contextDate) {
    return null;
  }

  const year = contextDate.getFullYear();
  const month = contextDate.getMonth();

  return {
    end: startOfDay(new Date(year, month, Number(rangeMatch[2]))),
    start: startOfDay(new Date(year, month, Number(rangeMatch[1]))),
  };
}

export function getTaskDateRange(task, contextDate) {
  const inferred = getInferredTextRange(task, contextDate);
  const explicitStart = startOfDay(parseDateValue(task.startDate || task.start || task.dateStart));
  const explicitEnd = startOfDay(parseDateValue(task.endDate || task.end || task.dateEnd));
  const fallback = startOfDay(parseDateValue(task.dueDate || task.dueAt || task.date || task.createdAt));
  const start = explicitStart || inferred?.start || fallback;
  const end = explicitEnd || inferred?.end || start;

  return { end, start };
}

export function toISODate(date) {
  if (!date) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTime(hours, minutes = 0) {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatPreviewDate(value) {
  const date = parseDateValue(value);
  return date ? date.toLocaleDateString([], { day: 'numeric', month: 'short' }) : 'Not detected';
}

export function isRangeTask(task, contextDate) {
  const { end, start } = getTaskDateRange(task, contextDate);
  return Boolean(start && end && !isSameDay(start, end));
}

export function isTaskInProgressOn(task, date) {
  if (!isRangeTask(task, date) || isTaskDone(task)) {
    return false;
  }

  const start = startOfDay(getTaskStartDate(task, date));
  const end = startOfDay(getTaskEndDate(task, date));
  const target = startOfDay(date);
  return Boolean(start && end && target && target >= start && target <= end);
}

export function formatTaskRangeLabel(task, contextDate) {
  const start = getTaskStartDate(task, contextDate);
  const end = getTaskEndDate(task, contextDate);

  if (!start) {
    return '';
  }

  if (!end || isSameDay(start, end)) {
    return start.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${start.toLocaleDateString([], { month: 'short' })} ${start.getDate()}-${end.getDate()}`;
  }

  return `${start.toLocaleDateString([], { month: 'short', day: 'numeric' })}-${end.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
}

export function getItemText(item = {}) {
  return [item.projectName, item.project, item.client, item.title, item.notes, item.detail]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function getProjectLabel(item = {}, projects = []) {
  const project = projects.find((candidate) => (
    (item.projectId && candidate.id === item.projectId) ||
    (item.projectName && candidate.name === item.projectName) ||
    (item.project && candidate.name === item.project)
  ));
  const explicit = item.projectName || item.project || item.client;
  const text = getItemText(item);

  if (text.includes('karun central westville')) {
    return 'Karun Central Westville';
  }

  if (text.includes('karun phuket') || text.includes('karun')) {
    return 'Karun Phuket';
  }

  if (explicit && String(explicit).toLowerCase() !== 'studio') {
    return explicit;
  }

  if (project?.name) {
    return project.name;
  }

  if (explicit === 'Studio') {
    return 'Studio';
  }

  return 'Untitled Project';
}

export function normalizePhase(value) {
  const text = String(value || '').toLowerCase();

  if (!text || text === 'done' || text === 'todo' || text === 'open') {
    return '';
  }

  if (text.includes('design') || text.includes('\u0e2d\u0e2d\u0e01\u0e41\u0e1a\u0e1a')) {
    return 'Design';
  }

  if (text.includes('construction') || text.includes('construct') || text.includes('\u0e01\u0e48\u0e2d\u0e2a\u0e23\u0e49\u0e32\u0e07')) {
    return 'Construction';
  }

  if (text.includes('handover') || text.includes('\u0e2a\u0e48\u0e07\u0e21\u0e2d\u0e1a')) {
    return 'Handover';
  }

  if (text.includes('opening') || text.includes('\u0e40\u0e1b\u0e34\u0e14')) {
    return 'Opening';
  }

  return value ? String(value) : '';
}

export function getPhaseLabel(item = {}, projects = []) {
  const project = projects.find((candidate) => (
    (item.projectId && candidate.id === item.projectId) ||
    (item.projectName && candidate.name === item.projectName) ||
    (item.project && candidate.name === item.project)
  ));
  const phase = (
    normalizePhase(item.phase) ||
    normalizePhase(item.projectStatus) ||
    normalizePhase(item.statusLabel) ||
    normalizePhase(project?.phase) ||
    normalizePhase(project?.status) ||
    normalizePhase(getItemText(item))
  );

  return phase || 'General';
}

export function getStateLabel(task, date) {
  const status = String(task.status || '').toLowerCase();
  if (isTaskDone(task)) {
    return 'DONE';
  }

  if (status.includes('overdue')) {
    return 'OVERDUE';
  }

  if (status.includes('planned') || status.includes('later')) {
    return 'PLANNED';
  }

  if (status.includes('progress')) {
    return 'IN PROGRESS';
  }

  const dueDate = getTaskEndDate(task, date) || getTaskDate(task);
  const target = startOfDay(date);
  if (dueDate && target && dueDate < target) {
    return 'OVERDUE';
  }

  return taskOccursOnDateForState(task, date) && isRangeTask(task, date) ? 'IN PROGRESS' : 'PLANNED';
}

export function getStateInfo(state) {
  if (state === 'DONE') {
    return { chipClass: 'bg-[#CFDECA] text-[#212121]', Icon: CheckCircle, label: 'DONE' };
  }

  if (state === 'OVERDUE') {
    return { chipClass: 'bg-[#FFF0A3] text-[#212121]', Icon: AlertCircle, label: 'OVERDUE' };
  }

  if (state === 'IN PROGRESS') {
    return { chipClass: 'bg-[#DBDFE9] text-[#212121]', Icon: Clock, label: 'IN PROGRESS' };
  }

  return { chipClass: 'bg-[#F5F5FA] text-[#777777]', Icon: Clock, label: 'PLANNED' };
}

export function taskOccursOnDateForState(task, date) {
  const start = getTaskStartDate(task, date);
  const end = getTaskEndDate(task, date);
  const target = startOfDay(date);

  return Boolean(start && end && target && target >= start && target <= end);
}

export function getPhaseInfo(task = {}, projects = []) {
  const phase = getPhaseLabel(task, projects);
  const phaseText = phase.toLowerCase();

  if (phaseText.includes('opening')) {
    return { chipClass: 'bg-[#212121] text-white', fillClass: 'bg-[#212121]', label: 'Opening', title: 'Opening' };
  }

  if (phaseText.includes('handover')) {
    return { chipClass: 'bg-[#CFDECA] text-[#212121]', fillClass: 'bg-[#CFDECA]', label: 'Handover', title: 'Handover' };
  }

  if (phaseText.includes('construction')) {
    return { chipClass: 'bg-[#FFF0A3] text-[#212121]', fillClass: 'bg-[#FFF0A3]', label: 'Construction', title: 'Construction' };
  }

  if (phaseText.includes('general')) {
    return { chipClass: 'bg-[#DBDFE9] text-[#212121]', fillClass: 'bg-[#212121]', label: 'General', title: 'General' };
  }

  return { chipClass: 'bg-[#DBDFE9] text-[#212121]', fillClass: 'bg-[#212121]', label: 'Design', title: 'Design' };
}

export function getRangeProgress(task, date) {
  const start = startOfDay(getTaskStartDate(task, date));
  const end = startOfDay(getTaskEndDate(task, date));
  const target = startOfDay(date);

  if (!start || !end || !target) {
    return null;
  }

  const totalDays = Math.max(1, Math.round((end - start) / dayInMs) + 1);
  const elapsedDays = Math.min(totalDays, Math.max(1, Math.round((target - start) / dayInMs) + 1));
  const daysLeft = Math.max(0, Math.round((end - target) / dayInMs));

  return {
    daysLeft,
    percent: Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100)),
  };
}

export function formatDaysLeft(daysLeft) {
  if (daysLeft === 0) {
    return 'Ends today';
  }

  return `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`;
}

export function isTaskDone(task) {
  const status = String(task.status || '').toLowerCase();
  return status === 'done' || status === 'completed';
}

export function getTaskTone(task) {
  const date = getTaskDate(task);
  const today = startOfToday();

  if (isTaskDone(task)) {
    return 'bg-[#CFDECA]/20';
  }

  if (date && date < today) {
    return 'border-[#C2410C]/25 bg-[#FFF7ED]';
  }

  if (isSameDay(date, today)) {
    return 'border-[#FFF0A3] bg-white';
  }

  return 'bg-white';
}

export function getInsightMessage({ activeCount, inProgressCount, nearDeadlineDays, overdueCount }) {
  if (overdueCount > 0) {
    return 'Overdue tasks need attention.';
  }

  if (inProgressCount > 0) {
    return `${inProgressCount} ${inProgressCount === 1 ? 'project is' : 'projects are'} active \u2014 stay focused.`;
  }

  if (nearDeadlineDays !== null && nearDeadlineDays <= 3) {
    return `\u26a0 Deadline in ${nearDeadlineDays} ${nearDeadlineDays === 1 ? 'day' : 'days'}`;
  }

  if (activeCount > 0) {
    return 'You have tasks to complete today.';
  }

  return 'Nothing scheduled \u2014 plan ahead.';
}

export function parseQuickTask(input, projects) {
  const text = input.trim();
  const lowerText = text.toLowerCase();
  const matchedProject = projects
    .filter((project) => project.name)
    .sort((a, b) => b.name.length - a.name.length)
    .find((project) => lowerText.includes(project.name.toLowerCase()));
  const dateInfo = parseNaturalDate(lowerText);
  const timeInfo = parseNaturalTime(lowerText);
  const startDate = dateInfo.startDate || startOfToday();
  const endDate = dateInfo.endDate || startDate;
  const startTime = timeInfo ? formatTime(timeInfo.hours, timeInfo.minutes) : null;

  const title = text
    .replace(/\b(today|tomorrow|next week)\b/gi, '')
    .replace(/วันนี้|พรุ่งนี้|มะรืน/g, '')
    .replace(/วันที่\s*\d{1,2}(?:\s*[-–]\s*\d{1,2})?/g, '')
    .replace(/\b\d{1,2}\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\b/gi, '')
    .replace(/(บ่าย|เช้า)\s*\d{1,2}/g, '')
    .replace(/\b\d{1,2}(:\d{2})?\s?(am|pm)?\b/gi, '')
    .replace(matchedProject?.name || '', '')
    .trim()
    .replace(/\s+/g, ' ');

  return {
    calendarLinked: false,
    detail: text,
    dueDate: toISODate(startDate),
    endDate: toISODate(endDate),
    endTime: null,
    notes: text,
    pendingCalendarSync: false,
    projectId: matchedProject?.id || null,
    projectName: matchedProject?.name || 'Studio',
    startDate: toISODate(startDate),
    startTime,
    status: 'todo',
    title: title || text,
    type: dateInfo.isRange || startTime ? 'Event' : 'Task',
  };
}

export function parseNaturalDate(text) {
  const date = startOfToday();
  const thaiToday = '\u0e27\u0e31\u0e19\u0e19\u0e35\u0e49';
  const thaiTomorrow = '\u0e1e\u0e23\u0e38\u0e48\u0e07\u0e19\u0e35\u0e49';
  const weekdays = {
    sun: 0,
    sunday: 0,
    mon: 1,
    monday: 1,
    tue: 2,
    tuesday: 2,
    wed: 3,
    wednesday: 3,
    thu: 4,
    thursday: 4,
    fri: 5,
    friday: 5,
    sat: 6,
    saturday: 6,
  };

  if (text.includes('พรุ่งนี้') || text.includes(thaiTomorrow) || text.includes('tomorrow')) {
    date.setDate(date.getDate() + 1);
    return { startDate: date, endDate: date, isRange: false };
  }

  if (text.includes('มะรืน')) {
    date.setDate(date.getDate() + 2);
    return { startDate: date, endDate: date, isRange: false };
  }

  if (text.includes('วันนี้') || text.includes(thaiToday) || text.includes('today')) {
    return { startDate: date, endDate: date, isRange: false };
  }

  const thaiRange = text.match(/วันที่\s*(\d{1,2})\s*[-–]\s*(\d{1,2})/);
  if (thaiRange) {
    const start = new Date(date.getFullYear(), date.getMonth(), Number(thaiRange[1]));
    const end = new Date(date.getFullYear(), date.getMonth(), Number(thaiRange[2]));
    return { startDate: start, endDate: end, isRange: true };
  }

  const thaiDay = text.match(/วันที่\s*(\d{1,2})/);
  if (thaiDay) {
    const target = new Date(date.getFullYear(), date.getMonth(), Number(thaiDay[1]));
    return { startDate: target, endDate: target, isRange: false };
  }

  const englishDate = text.match(/\b(\d{1,2})\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\b/i);
  if (englishDate) {
    const target = new Date(date.getFullYear(), monthNames[englishDate[2].toLowerCase()], Number(englishDate[1]));
    return { startDate: target, endDate: target, isRange: false };
  }

  if (text.includes('next week')) {
    date.setDate(date.getDate() + 7);
    return { startDate: date, endDate: date, isRange: false };
  }

  const weekdayKey = Object.keys(weekdays).find((key) => new RegExp(`\\b${key}\\b`).test(text));
  if (weekdayKey) {
    const targetDay = weekdays[weekdayKey];
    const offset = (targetDay - date.getDay() + 7) % 7 || 7;
    date.setDate(date.getDate() + offset);
  }

  return { startDate: date, endDate: date, isRange: false };
}

export function parseNaturalTime(text) {
  if (text.includes('\u0e40\u0e22\u0e47\u0e19')) {
    return { hours: 18, minutes: 0 };
  }

  const thaiTime = text.match(/(บ่าย|เช้า)\s*(\d{1,2})(?::(\d{2}))?/);
  if (thaiTime) {
    let hours = Number(thaiTime[2]);
    const minutes = Number(thaiTime[3] || 0);
    if (thaiTime[1] === 'บ่าย' && hours < 12) {
      hours += 12;
    }
    return { hours, minutes };
  }

  const exactTime = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (exactTime) {
    return { hours: Number(exactTime[1]), minutes: Number(exactTime[2]) };
  }

  const match = text.match(/\b(\d{1,2})(?::(\d{2}))?\s?(am|pm)\b/);
  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const meridiem = match[3];

  if (meridiem === 'pm' && hours < 12) {
    hours += 12;
  }
  if (meridiem === 'am' && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
}

export function describeTaskDate(task) {
  const startValue = task.startDate || task.dueDate;
  const startDate = parseDateValue(startValue);
  const endDate = parseDateValue(task.endDate);
  const start = formatPreviewDate(startValue);
  const end = endDate && task.endDate !== startValue
    ? endDate.getMonth() === startDate?.getMonth()
      ? `${endDate.getDate()} ${endDate.toLocaleDateString([], { month: 'short' })}`
      : formatPreviewDate(task.endDate)
    : '';
  const time = task.startTime ? ` / ${task.startTime}` : '';
  return end ? `${startDate?.getDate()}-${end}${time}` : `${start}${time}`;
}
