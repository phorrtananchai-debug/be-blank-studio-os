const dayInMs = 24 * 60 * 60 * 1000;
const profileImageKey = 'studioOS.profileImage';

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

export function startOfDay(date) {
  if (!date) {
    return null;
  }

  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
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

function getInferredTextRange(task, contextDate) {
  const text = [task.title, task.notes, task.detail].filter(Boolean).join(' ');
  const thaiDateWord = '\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48';
  const rangeMatch = text.match(new RegExp(`${thaiDateWord}\\s*(\\d{1,2})\\s*[-\\u2013]\\s*(\\d{1,2})`));

  if (!rangeMatch || !contextDate) {
    return null;
  }

  return {
    end: startOfDay(new Date(contextDate.getFullYear(), contextDate.getMonth(), Number(rangeMatch[2]))),
    start: startOfDay(new Date(contextDate.getFullYear(), contextDate.getMonth(), Number(rangeMatch[1]))),
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

export function getTaskStartDate(task, contextDate) {
  return getTaskDateRange(task, contextDate).start;
}

export function getTaskEndDate(task, contextDate) {
  return getTaskDateRange(task, contextDate).end;
}

export function getTaskDate(task) {
  return getTaskDateRange(task).start;
}

export function isRangeTask(task, contextDate) {
  const { end, start } = getTaskDateRange(task, contextDate);
  return Boolean(start && end && !isSameDay(start, end));
}

export function taskOccursOnDate(task, date) {
  const start = getTaskStartDate(task, date);
  const end = getTaskEndDate(task, date) || start;
  const target = startOfDay(date);

  if (!start || !target) {
    return false;
  }

  return target >= start && target <= end;
}

export function isTaskDone(task) {
  const status = String(task.status || '').toLowerCase();
  return status === 'done' || status === 'completed';
}

export function getItemText(item = {}) {
  return [item.projectName, item.project, item.client, item.title, item.notes, item.detail]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function findProjectForItem(item = {}, projects = []) {
  return projects.find((project) => (
    (item.projectId && project.id === item.projectId) ||
    (item.projectName && project.name === item.projectName) ||
    (item.project && project.name === item.project)
  ));
}

export function getProjectLabel(item = {}, projects = []) {
  const project = findProjectForItem(item, projects);
  const explicit = item.name || item.projectName || item.project || item.client;
  const text = [item.name, getItemText(item)].filter(Boolean).join(' ').toLowerCase();

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

  return explicit || 'Untitled Project';
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
  const project = findProjectForItem(item, projects);
  return (
    normalizePhase(item.phase) ||
    normalizePhase(item.projectStatus) ||
    normalizePhase(item.statusLabel) ||
    normalizePhase(project?.phase) ||
    normalizePhase(project?.status) ||
    normalizePhase(item.status) ||
    normalizePhase(getItemText(item)) ||
    'General'
  );
}

export function getPhaseInfo(item = {}, projects = []) {
  const phase = typeof item === 'string' ? item : getPhaseLabel(item, projects);
  const phaseText = phase.toLowerCase();

  if (phaseText.includes('opening')) {
    return { barClass: 'bg-[#212121] text-white', chipClass: 'bg-[#212121] text-white', fillClass: 'bg-[#212121]', label: 'Opening' };
  }

  if (phaseText.includes('handover')) {
    return { barClass: 'bg-[#CFDECA] text-[#212121]', chipClass: 'bg-[#CFDECA] text-[#212121]', fillClass: 'bg-[#CFDECA]', label: 'Handover' };
  }

  if (phaseText.includes('construction')) {
    return { barClass: 'bg-[#FFF0A3] text-[#212121]', chipClass: 'bg-[#FFF0A3] text-[#212121]', fillClass: 'bg-[#FFF0A3]', label: 'Construction' };
  }

  if (phaseText.includes('general')) {
    return { barClass: 'bg-[#DBDFE9] text-[#212121]', chipClass: 'bg-[#DBDFE9] text-[#212121]', fillClass: 'bg-[#212121]', label: 'General' };
  }

  return { barClass: 'bg-[#DBDFE9] text-[#212121]', chipClass: 'bg-[#DBDFE9] text-[#212121]', fillClass: 'bg-[#212121]', label: 'Design' };
}

export function getStateLabel(item = {}, date) {
  const status = String(item.status || '').toLowerCase();
  if (isTaskDone(item)) {
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

  const end = getTaskEndDate(item, date) || getTaskStartDate(item, date);
  const target = startOfDay(date);
  if (end && target && end < target) {
    return 'OVERDUE';
  }

  return taskOccursOnDate(item, date) && isRangeTask(item, date) ? 'IN PROGRESS' : 'PLANNED';
}

export function getStateInfo(state) {
  if (state === 'DONE') {
    return { barClass: 'bg-[#CFDECA] text-[#212121]', chipClass: 'bg-[#CFDECA] text-[#212121]', label: 'DONE', shortLabel: 'Done' };
  }

  if (state === 'OVERDUE') {
    return { barClass: 'bg-[#FFF0A3] text-[#212121]', chipClass: 'bg-[#FFF0A3] text-[#212121]', label: 'OVERDUE', shortLabel: 'Overdue' };
  }

  if (state === 'IN PROGRESS') {
    return { barClass: 'bg-[#DBDFE9] text-[#212121]', chipClass: 'bg-[#DBDFE9] text-[#212121]', label: 'IN PROGRESS', shortLabel: 'Active' };
  }

  return { barClass: 'bg-studio-stone text-[#777777]', chipClass: 'bg-studio-stone text-[#777777]', label: 'PLANNED', shortLabel: 'Planned' };
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

export function formatDateRangeLabel(task, contextDate) {
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

export function formatDaysLeftFromEnd(end) {
  const today = startOfDay(new Date());

  if (!end || !today) {
    return 'No deadline';
  }

  const days = Math.max(0, Math.round((end - today) / dayInMs));
  if (days === 0) {
    return 'Ends today';
  }

  return `${days} ${days === 1 ? 'day' : 'days'} left`;
}

export function getProfileImage() {
  try {
    return window.localStorage.getItem(profileImageKey) || '';
  } catch {
    return '';
  }
}

export function setProfileImage(dataUrl) {
  try {
    window.localStorage.setItem(profileImageKey, dataUrl);
  } catch {
    // Local image preview is best-effort only.
  }
}

export function removeProfileImage() {
  try {
    window.localStorage.removeItem(profileImageKey);
  } catch {
    // Local image preview is best-effort only.
  }
}

export function compressProfileImage(file, maxWidth = 800) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const source = String(reader.result || '');
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        if (image.width <= maxWidth) {
          resolve(source);
          return;
        }

        const scale = maxWidth / image.width;
        const canvas = document.createElement('canvas');
        canvas.width = maxWidth;
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.86));
      };
      image.src = source;
    };
    reader.readAsDataURL(file);
  });
}
