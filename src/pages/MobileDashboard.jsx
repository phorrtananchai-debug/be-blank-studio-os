import { AlertCircle, Briefcase, CalendarDays, CheckCircle, Clock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  addCollectionItem,
  deleteCollectionItem,
  isFirebaseConfigured,
  subscribeToCollection,
  updateCollectionItem,
} from '../services/firebase.js';
import { subscribeToProjects } from '../services/firebaseProjects.js';
import { MobileCalendar } from './MobileCalendar.jsx';
import { DEMO_MODE } from './mobileConfig.js';
import { ProfileAvatar, TaskRow as SharedTaskRow } from './mobileComponents.jsx';
import { compressProfileImage, getProfileImage, removeProfileImage, setProfileImage } from './mobileUtils.js';
import { MobileProjects } from './MobileProjects.jsx';

const tabs = ['Home', 'Calendar', '+', 'Projects', 'More'];
const taskCollection = 'tasks';
const notesCollection = 'notes';
const dayInMs = 24 * 60 * 60 * 1000;
const demoFocusDate = new Date(2026, 4, 5);
const demoProjects = [
  {
    id: 'demo-project-karun-phuket',
    name: 'Karun Phuket',
    phase: 'Design',
    status: 'In Progress',
    startDate: '2026-05-04',
    endDate: '2026-05-20',
    notes: 'Design direction, client alignment, and phase approvals.',
  },
  {
    id: 'demo-project-karun-central-westville',
    name: 'Karun Central Westville',
    phase: 'Construction',
    status: 'Overdue',
    startDate: '2026-05-04',
    endDate: '2026-05-07',
    notes: 'Construction coordination and BOQ updates.',
  },
  {
    id: 'demo-project-ultimate-bkk',
    name: 'Ultimate BKK',
    phase: 'Handover',
    status: 'Planned',
    startDate: '2026-05-15',
    endDate: '2026-05-20',
    notes: 'Handover planning and final documentation.',
  },
  {
    id: 'demo-project-avery-wong',
    name: 'Avery Wong',
    phase: 'Design',
    status: 'In Progress',
    startDate: '2026-05-05',
    endDate: '2026-05-12',
    notes: 'Design sprint and client direction.',
  },
  {
    id: 'demo-project-yum-nine',
    name: 'YUM NINE',
    phase: 'Design',
    status: 'Planned',
    startDate: '2026-05-06',
    endDate: '2026-05-16',
    notes: 'Brand and spatial planning.',
  },
  {
    id: 'demo-project-stayr-layr',
    name: 'STAYR LAYR',
    phase: 'Construction',
    status: 'In Progress',
    startDate: '2026-05-07',
    endDate: '2026-05-14',
    notes: 'Construction coordination.',
  },
  {
    id: 'demo-project-football-brief',
    name: 'The Football Brief',
    phase: 'Opening',
    status: 'Planned',
    startDate: '2026-05-08',
    endDate: '2026-05-09',
    notes: 'Opening plan and launch checklist.',
  },
  {
    id: 'demo-project-karun-boq',
    name: 'Karun BOQ',
    phase: 'Construction',
    status: 'Overdue',
    startDate: '2026-05-10',
    endDate: '2026-05-13',
    notes: 'BOQ review needs attention.',
  },
  {
    id: 'demo-project-site-survey',
    name: 'Site Survey',
    phase: 'Handover',
    status: 'Done',
    startDate: '2026-05-11',
    endDate: '2026-05-11',
    notes: 'Survey completed.',
  },
  {
    id: 'demo-project-client-review',
    name: 'Client Review',
    phase: 'Design',
    status: 'Planned',
    startDate: '2026-05-12',
    endDate: '2026-05-18',
    notes: 'Client review window.',
  },
  {
    id: 'demo-project-studio-ops-review',
    name: 'Studio Ops Review',
    phase: 'Opening',
    status: 'Planned',
    startDate: '2026-05-05',
    endDate: '2026-05-10',
    notes: 'Internal operations review for stress testing range stacking.',
  },
];
const demoTasks = [
  {
    id: 'demo-range-karun-phuket',
    title: 'Karun Phuket',
    detail: 'Design phase',
    notes: 'Karun Phuket design phase timeline.',
    projectId: 'demo-project-karun-phuket',
    projectName: 'Karun Phuket',
    project: 'Karun Phuket',
    phase: 'Design',
    startDate: '2026-05-04',
    endDate: '2026-05-20',
    status: 'todo',
    type: 'phase',
  },
  {
    id: 'demo-range-karun-central-westville',
    title: 'Karun Central Westville',
    detail: 'Construction phase',
    notes: 'Karun Central Westville construction phase timeline.',
    projectId: 'demo-project-karun-central-westville',
    projectName: 'Karun Central Westville',
    project: 'Karun Central Westville',
    phase: 'Construction',
    startDate: '2026-05-04',
    endDate: '2026-05-07',
    status: 'overdue',
    type: 'phase',
  },
  {
    id: 'demo-range-ultimate-bkk',
    title: 'Ultimate BKK',
    detail: 'Handover phase',
    notes: 'Ultimate BKK handover phase timeline.',
    projectId: 'demo-project-ultimate-bkk',
    projectName: 'Ultimate BKK',
    project: 'Ultimate BKK',
    phase: 'Handover',
    startDate: '2026-05-15',
    endDate: '2026-05-20',
    status: 'planned',
    type: 'phase',
  },
  {
    id: 'demo-range-avery-wong',
    title: 'Avery Wong',
    detail: 'Design phase',
    notes: 'Avery Wong design timeline.',
    projectId: 'demo-project-avery-wong',
    projectName: 'Avery Wong',
    project: 'Avery Wong',
    phase: 'Design',
    startDate: '2026-05-05',
    endDate: '2026-05-12',
    status: 'in progress',
    type: 'phase',
  },
  {
    id: 'demo-range-yum-nine',
    title: 'YUM NINE',
    detail: 'Design phase',
    notes: 'YUM NINE planning timeline.',
    projectId: 'demo-project-yum-nine',
    projectName: 'YUM NINE',
    project: 'YUM NINE',
    phase: 'Design',
    startDate: '2026-05-06',
    endDate: '2026-05-16',
    status: 'planned',
    type: 'phase',
  },
  {
    id: 'demo-range-stayr-layr',
    title: 'STAYR LAYR',
    detail: 'Construction phase',
    notes: 'STAYR LAYR construction timeline.',
    projectId: 'demo-project-stayr-layr',
    projectName: 'STAYR LAYR',
    project: 'STAYR LAYR',
    phase: 'Construction',
    startDate: '2026-05-07',
    endDate: '2026-05-14',
    status: 'in progress',
    type: 'phase',
  },
  {
    id: 'demo-range-football-brief',
    title: 'The Football Brief',
    detail: 'Opening phase',
    notes: 'The Football Brief opening window.',
    projectId: 'demo-project-football-brief',
    projectName: 'The Football Brief',
    project: 'The Football Brief',
    phase: 'Opening',
    startDate: '2026-05-08',
    endDate: '2026-05-09',
    status: 'planned',
    type: 'phase',
  },
  {
    id: 'demo-range-karun-boq',
    title: 'Karun BOQ',
    detail: 'Construction phase',
    notes: 'Karun BOQ overdue range.',
    projectId: 'demo-project-karun-boq',
    projectName: 'Karun BOQ',
    project: 'Karun BOQ',
    phase: 'Construction',
    startDate: '2026-05-10',
    endDate: '2026-05-13',
    status: 'overdue',
    type: 'phase',
  },
  {
    id: 'demo-range-site-survey',
    title: 'Site Survey',
    detail: 'Handover phase',
    notes: 'Site Survey completed.',
    projectId: 'demo-project-site-survey',
    projectName: 'Site Survey',
    project: 'Site Survey',
    phase: 'Handover',
    startDate: '2026-05-11',
    endDate: '2026-05-11',
    status: 'done',
    type: 'phase',
  },
  {
    id: 'demo-range-client-review',
    title: 'Client Review',
    detail: 'Design phase',
    notes: 'Client Review design window.',
    projectId: 'demo-project-client-review',
    projectName: 'Client Review',
    project: 'Client Review',
    phase: 'Design',
    startDate: '2026-05-12',
    endDate: '2026-05-18',
    status: 'planned',
    type: 'phase',
  },
  {
    id: 'demo-range-studio-ops-review',
    title: 'Studio Ops Review',
    detail: 'Opening phase',
    notes: 'Internal operations review for stress testing range stacking.',
    projectId: 'demo-project-studio-ops-review',
    projectName: 'Studio Ops Review',
    project: 'Studio Ops Review',
    phase: 'Opening',
    startDate: '2026-05-05',
    endDate: '2026-05-10',
    status: 'planned',
    type: 'phase',
  },
  {
    id: 'demo-task-site-meeting',
    title: 'Site meeting with client',
    detail: 'Client walkthrough and design alignment.',
    notes: 'Client walkthrough and design alignment.',
    projectId: 'demo-project-karun-phuket',
    projectName: 'Karun Phuket',
    project: 'Karun Phuket',
    phase: 'Design',
    date: '2026-05-05',
    dueDate: '2026-05-05',
    startDate: '2026-05-05',
    endDate: '2026-05-05',
    startTime: '09:00',
    endTime: '10:30',
    status: 'todo',
  },
  {
    id: 'demo-task-moodboard-review',
    title: 'Moodboard review',
    detail: 'Review visual direction and references.',
    notes: 'Review visual direction and references.',
    projectId: 'demo-project-karun-phuket',
    projectName: 'Karun Phuket',
    project: 'Karun Phuket',
    phase: 'Design',
    date: '2026-05-05',
    dueDate: '2026-05-05',
    startDate: '2026-05-05',
    endDate: '2026-05-05',
    startTime: '14:00',
    endTime: '15:00',
    status: 'todo',
  },
  {
    id: 'demo-task-update-boq',
    title: 'Update BOQ',
    detail: 'Revise construction cost items.',
    notes: 'Revise construction cost items.',
    projectId: 'demo-project-karun-central-westville',
    projectName: 'Karun Central Westville',
    project: 'Karun Central Westville',
    phase: 'Construction',
    date: '2026-05-05',
    dueDate: '2026-05-05',
    startDate: '2026-05-05',
    endDate: '2026-05-05',
    startTime: '18:00',
    endTime: '19:00',
    status: 'todo',
  },
  {
    id: 'demo-task-material-samples',
    title: 'Material samples',
    detail: 'Confirm stone and wood samples.',
    notes: 'Confirm stone and wood samples.',
    projectId: 'demo-project-avery-wong',
    projectName: 'Avery Wong',
    project: 'Avery Wong',
    phase: 'Design',
    date: '2026-05-05',
    dueDate: '2026-05-05',
    startDate: '2026-05-05',
    endDate: '2026-05-05',
    startTime: '11:00',
    endTime: '11:30',
    status: 'todo',
  },
  {
    id: 'demo-task-vendor-call',
    title: 'Vendor call',
    detail: 'Align lead times and approvals.',
    notes: 'Align lead times and approvals.',
    projectId: 'demo-project-yum-nine',
    projectName: 'YUM NINE',
    project: 'YUM NINE',
    phase: 'Design',
    date: '2026-05-05',
    dueDate: '2026-05-05',
    startDate: '2026-05-05',
    endDate: '2026-05-05',
    startTime: '16:00',
    endTime: '16:30',
    status: 'todo',
  },
  {
    id: 'demo-task-review-construction-drawing',
    title: 'Review construction drawing',
    detail: 'Check updated drawing package.',
    notes: 'Check updated drawing package.',
    projectId: 'demo-project-karun-phuket',
    projectName: 'Karun Phuket',
    project: 'Karun Phuket',
    phase: 'Design',
    date: '2026-05-12',
    dueDate: '2026-05-12',
    startDate: '2026-05-12',
    endDate: '2026-05-12',
    status: 'later',
  },
  {
    id: 'demo-task-budget-approval',
    title: 'Budget approval',
    detail: 'Prepare approval pack.',
    notes: 'Prepare approval pack.',
    projectId: 'demo-project-ultimate-bkk',
    projectName: 'Ultimate BKK',
    project: 'Ultimate BKK',
    phase: 'Handover',
    date: '2026-05-15',
    dueDate: '2026-05-15',
    startDate: '2026-05-15',
    endDate: '2026-05-15',
    status: 'later',
  },
  {
    id: 'demo-task-site-survey',
    title: 'Site survey',
    detail: 'Completed initial site survey.',
    notes: 'Completed initial site survey.',
    projectId: 'demo-project-karun-phuket',
    projectName: 'Karun Phuket',
    project: 'Karun Phuket',
    phase: 'Design',
    date: '2026-05-01',
    dueDate: '2026-05-01',
    startDate: '2026-05-01',
    endDate: '2026-05-01',
    status: 'done',
  },
];
const demoNotes = [
  {
    id: 'demo-note-karun-phuket',
    projectId: 'demo-project-karun-phuket',
    projectName: 'Karun Phuket',
    body: 'Design review focuses on guest journey, material mood, and approval-ready boards.',
  },
  {
    id: 'demo-note-karun-central-westville',
    projectId: 'demo-project-karun-central-westville',
    projectName: 'Karun Central Westville',
    body: 'Construction sprint is focused on BOQ updates and site coordination.',
  },
  {
    id: 'demo-note-ultimate-bkk',
    projectId: 'demo-project-ultimate-bkk',
    projectName: 'Ultimate BKK',
    body: 'Handover planning starts with budget approval and documentation cleanup.',
  },
];
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

function formatTaskCount(count) {
  return count === 1 ? 'TASK' : 'TASKS';
}

function getTaskDate(task) {
  return getTaskDateRange(task).start;
}

function getTaskStartDate(task, contextDate) {
  return getTaskDateRange(task, contextDate).start;
}

function getTaskEndDate(task, contextDate) {
  return getTaskDateRange(task, contextDate).end;
}

function parseDateValue(value) {
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

function isSameDay(left, right) {
  return (
    left &&
    right &&
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfDay(date) {
  if (!date) {
    return null;
  }

  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getInferredTextRange(task, contextDate) {
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

function getTaskDateRange(task, contextDate) {
  const inferred = getInferredTextRange(task, contextDate);
  const explicitStart = startOfDay(parseDateValue(task.startDate || task.start || task.dateStart));
  const explicitEnd = startOfDay(parseDateValue(task.endDate || task.end || task.dateEnd));
  const fallback = startOfDay(parseDateValue(task.dueDate || task.dueAt || task.date || task.createdAt));
  const start = explicitStart || inferred?.start || fallback;
  const end = explicitEnd || inferred?.end || start;

  return { end, start };
}

function toISODate(date) {
  if (!date) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(hours, minutes = 0) {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatPreviewDate(value) {
  const date = parseDateValue(value);
  return date ? date.toLocaleDateString([], { day: 'numeric', month: 'short' }) : 'Not detected';
}

function isRangeTask(task, contextDate) {
  const { end, start } = getTaskDateRange(task, contextDate);
  return Boolean(start && end && !isSameDay(start, end));
}

function isTaskInProgressOn(task, date) {
  if (!isRangeTask(task, date) || isTaskDone(task)) {
    return false;
  }

  const start = startOfDay(getTaskStartDate(task, date));
  const end = startOfDay(getTaskEndDate(task, date));
  const target = startOfDay(date);
  return Boolean(start && end && target && target >= start && target <= end);
}

function formatTaskRangeLabel(task, contextDate) {
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

function getItemText(item = {}) {
  return [item.projectName, item.project, item.client, item.title, item.notes, item.detail]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getProjectLabel(item = {}, projects = []) {
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

function normalizePhase(value) {
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

function getPhaseLabel(item = {}, projects = []) {
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

function getStateLabel(task, date) {
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

function getStateInfo(state) {
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

function taskOccursOnDateForState(task, date) {
  const start = getTaskStartDate(task, date);
  const end = getTaskEndDate(task, date);
  const target = startOfDay(date);

  return Boolean(start && end && target && target >= start && target <= end);
}

function getPhaseInfo(task = {}, projects = []) {
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

function getRangeProgress(task, date) {
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

function formatDaysLeft(daysLeft) {
  if (daysLeft === 0) {
    return 'Ends today';
  }

  return `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`;
}

function isTaskDone(task) {
  const status = String(task.status || '').toLowerCase();
  return status === 'done' || status === 'completed';
}

function getTaskTone(task) {
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

function getInsightMessage({ activeCount, inProgressCount, nearDeadlineDays, overdueCount }) {
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

function parseQuickTask(input, projects) {
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

function parseNaturalDate(text) {
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

function parseNaturalTime(text) {
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

function describeTaskDate(task) {
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

function TaskDetail({ onClose, onDone, projects = [], task }) {
  const dueDate = getTaskDate(task);

  return (
    <div className="absolute inset-0 z-40 bg-[#F5F5FA] px-5 py-6">
      <button className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#777777] transition duration-[120ms] ease-out active:scale-95" type="button" onClick={onClose}>
        Close
      </button>
      <div className="mt-16">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#777777]">{getProjectLabel(task, projects)} - {getPhaseLabel(task, projects)}</p>
        <h2 className="mt-4 text-3xl font-medium leading-tight">{task.title}</h2>
        <p className="mt-5 text-base leading-7 text-[#777777]">{task.notes || task.detail || 'No detail added.'}</p>
        {dueDate && <p className="mt-8 text-sm text-[#212121]">{describeTaskDate(task)}</p>}
        <button
          className="mt-10 h-14 w-full rounded-[18px] bg-[#212121] text-sm font-medium text-[#F5F5FA] transition duration-[120ms] ease-out active:scale-95"
          type="button"
          onClick={() => onDone(task)}
        >
          Mark done
        </button>
      </div>
    </div>
  );
}

function QuickAdd({ onClose, onCreate, projects }) {
  const [value, setValue] = useState('');
  const parsedTask = value.trim() ? parseQuickTask(value, projects) : null;

  const handleCreate = async (addToCalendar = false) => {
    if (!value.trim()) {
      return;
    }

    await onCreate(parseQuickTask(value, projects), addToCalendar);
    setValue('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[rgba(33,33,33,0.25)]">
      <div className="w-full rounded-t-[32px] bg-white p-5">
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[rgba(33,33,33,0.08)]" />
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#777777]">Quick add</span>
          <textarea
            autoFocus
            className="mt-3 min-h-36 w-full resize-none rounded-[24px] bg-[#F5F5FA] px-4 py-4 text-xl font-medium leading-8 text-[#212121] outline-none ring-0 transition duration-[120ms] ease-out placeholder:text-[#777777] focus:bg-white focus:ring-1 focus:ring-[#212121]"
            placeholder="นัด Karun พรุ่งนี้ บ่าย 2"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <span className="mt-2 block text-xs text-[#777777]">Example: นัด Karun พรุ่งนี้ บ่าย 2</span>
        </label>
        {parsedTask && (
          <div className="mt-4 rounded-[22px] bg-[#DBDFE9]/60 p-4 text-sm leading-6 text-[#777777]">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#212121]">Detected</p>
            <p>Project: <span className="text-[#212121]">{parsedTask.projectName}</span></p>
            <p>Date: <span className="text-[#212121]">{formatPreviewDate(parsedTask.startDate || parsedTask.dueDate)}</span></p>
            <p>Range: <span className="text-[#212121]">{describeTaskDate(parsedTask)}</span></p>
            <p>Type: <span className="text-[#212121]">{parsedTask.type}</span></p>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button className="h-12 rounded-[18px] border border-[rgba(33,33,33,0.08)] text-sm font-medium transition duration-[120ms] ease-out active:scale-95" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="h-12 rounded-[18px] bg-[#212121] text-sm font-medium text-[#F5F5FA] transition duration-[120ms] ease-out active:scale-95" type="button" onClick={() => handleCreate(false)}>
            Save Task
          </button>
        </div>
        <button
          className="mt-3 h-12 w-full rounded-[18px] bg-[#FFF0A3] text-sm font-semibold text-[#212121] transition duration-[120ms] ease-out active:scale-95"
          type="button"
          onClick={() => handleCreate(true)}
        >
          Save + Add to Calendar
        </button>
      </div>
    </div>
  );
}

function EmptyMessage({ lines }) {
  return (
    <div className="rounded-[24px] border border-[rgba(33,33,33,0.08)] bg-white px-4 py-5 text-xs leading-relaxed text-[#777777]">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

function ProjectRow({ onOpen, project }) {
  const status = project.status || 'Design phase';
  const accentStatuses = ['design', 'pricing', 'construction'];
  const dotColor = accentStatuses.includes(String(status).toLowerCase()) ? '#FFF0A3' : '#212121';
  const initials = String(project.name || 'P')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');

  return (
    <button
      className="flex min-h-[64px] w-full cursor-pointer items-center gap-3 rounded-[22px] border border-[rgba(33,33,33,0.08)] bg-white px-4 py-3 text-left transition duration-[120ms] ease-out active:scale-95 active:bg-[#DBDFE9]"
      type="button"
      onClick={() => onOpen(project)}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#DBDFE9] text-xs font-bold uppercase text-[#212121]">
        <span className="flex flex-col items-center justify-center leading-none">
          {initials || 'P'}
          <span className="mt-1 size-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-[#212121]">{project.name}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-[#777777]">{status}</p>
      </div>
      <span className="text-xl leading-none text-[#555555]">{'>'}</span>
    </button>
  );
}

function InProgressRow({ projects, selectedDate, task }) {
  const phase = getPhaseInfo(task, projects);
  const progress = getRangeProgress(task, selectedDate);
  const projectLabel = getProjectLabel(task, projects);
  const stateLabel = getStateLabel(task, selectedDate);
  const state = getStateInfo(stateLabel);
  const StateIcon = state.Icon;

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-black/5 bg-white p-4 shadow-sm">
      <span className={`absolute bottom-4 left-0 top-4 w-1 rounded-r-full ${phase.fillClass}`} />
      <div className="pl-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Briefcase className="size-4 shrink-0 text-[#777777]" aria-hidden="true" />
            <p className="line-clamp-1 text-sm font-semibold leading-snug text-[#212121]">{projectLabel}</p>
          </div>
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${state.chipClass}`}>
            <StateIcon className="size-3" aria-hidden="true" />
            {state.label}
          </span>
        </div>
        <p className="mt-1 text-xs font-medium text-[#212121]">Phase: {phase.label}</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#777777]">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          {formatTaskRangeLabel(task, selectedDate)}
          {progress && <span className="ml-auto">{formatDaysLeft(progress.daysLeft)}</span>}
        </p>
        {progress && (
          <div className="mt-4">
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#DBDFE9]">
                <div className={`h-full rounded-full transition-[width] duration-300 ease-out ${phase.fillClass}`} style={{ width: `${progress.percent}%` }} />
              </div>
              <span className="text-[11px] font-semibold text-gray-500">{Math.round(progress.percent)}%</span>
            </div>
            <p className="mt-2 text-[11px] font-medium text-gray-500">{formatDaysLeft(progress.daysLeft)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function HomeView({ initialDate, onDeleteTask, onDoneTask, onDuplicateTask, onEditTask, onMoveTask, onOpenProject, onOpenTask, projects, tasks }) {
  const today = startOfDay(initialDate) || startOfToday();
  const [selectedDate, setSelectedDate] = useState(today);
  const inProgressRef = useRef(null);
  const todayRef = useRef(null);
  const doneRef = useRef(null);
  const overdueRef = useRef(null);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return { date };
  });
  const todayTasks = tasks
    .filter((task) => isSameDay(getTaskDate(task), selectedDate))
    .sort((left, right) => Number(isTaskDone(left)) - Number(isTaskDone(right)));
  const inProgressTasks = tasks.filter((task) => isTaskInProgressOn(task, selectedDate));
  const doneTasks = tasks.filter(isTaskDone).slice(0, 4);
  const activeTodayTasks = todayTasks.filter((task) => !isTaskDone(task) && !isRangeTask(task, selectedDate));
  const laterTasks = tasks
    .filter((task) => {
      const taskDate = getTaskDate(task);
      return !isTaskDone(task) && !isRangeTask(task, selectedDate) && taskDate && taskDate > today && !isSameDay(taskDate, today);
    })
    .slice(0, 4);
  const overdueTasks = tasks.filter((task) => {
    const dueDate = getTaskDate(task);
    return !isTaskDone(task) && dueDate && dueDate < today;
  });
  const activeProjects = projects.filter((project) => project.status !== 'open');
  const nearDeadlineDays = inProgressTasks
    .map((task) => getRangeProgress(task, selectedDate)?.daysLeft)
    .filter((daysLeft) => typeof daysLeft === 'number')
    .sort((left, right) => left - right)[0] ?? null;
  const insightMessage = getInsightMessage({
    activeCount: activeTodayTasks.length,
    inProgressCount: inProgressTasks.length,
    nearDeadlineDays,
    overdueCount: overdueTasks.length,
  });
  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const insightAction = overdueTasks.length
    ? { label: 'Review', onClick: () => scrollTo(overdueRef), subtext: `${inProgressTasks.length} active ${inProgressTasks.length === 1 ? 'project' : 'projects'}` }
    : inProgressTasks.length
      ? { label: 'View active', onClick: () => scrollTo(inProgressRef), subtext: 'Stay focused on in-progress work.' }
      : { label: 'Quick add', onClick: () => window.dispatchEvent(new CustomEvent('mobile-open-quick-add')), subtext: 'Create a task or review active projects.' };

  return (
    <div className="page-fade pb-32">
      <section>
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-5xl font-bold lowercase leading-none tracking-[-0.02em] text-[#212121]">today</h2>
          <div className="flex gap-2">
            <button className="rounded-full bg-[#CFDECA] px-3 py-2 text-xs font-semibold text-[#212121] transition-all duration-150 active:scale-[0.98]" type="button" onClick={() => scrollTo(doneRef)}>{doneTasks.length} done</button>
            <button className="rounded-full bg-[#DBDFE9] px-3 py-2 text-xs font-semibold text-[#212121] transition-all duration-150 active:scale-[0.98]" type="button" onClick={() => scrollTo(todayRef)}>{activeTodayTasks.length} tasks</button>
          </div>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto snap-x no-scrollbar">
          {weekDays.map((day) => {
            const selected = isSameDay(day.date, selectedDate);
            return (
              <button
                key={day.date.toISOString()}
                className={`flex shrink-0 snap-start cursor-pointer flex-col items-center justify-center rounded-[18px] px-4 py-3 text-center transition duration-[120ms] ease-out active:scale-95 ${selected ? 'bg-[#212121] text-white' : 'bg-white text-[#212121]'}`}
                type="button"
                onClick={() => setSelectedDate(day.date)}
              >
                <span className={`block text-[10px] font-semibold uppercase tracking-[0.12em] ${selected ? 'text-white/60' : 'text-[#777777]'}`}>
                  {day.date.toLocaleDateString([], { weekday: 'short' })}
                </span>
                <span className="mt-1 block text-sm font-bold">{day.date.getDate()}</span>
                {selected && <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#EFFF0A]" />}
              </button>
            );
          })}
        </div>
      </section>

      <button className="mt-6 w-full rounded-[22px] border border-[rgba(33,33,33,0.08)] bg-[#FFF0A3] p-4 text-left transition-all duration-150 active:scale-[0.98]" type="button" onClick={insightAction.onClick}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#212121]/70">Insight</p>
        <p className="mt-2 text-2xl font-bold text-[#212121]">{insightMessage}</p>
        <span className="mt-3 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-[#212121]/70">{insightAction.subtext}</span>
          <span className="shrink-0 rounded-full bg-white/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#212121]">{insightAction.label}</span>
        </span>
      </button>

      <section className="mt-6">
        {!!inProgressTasks.length && (
          <section ref={inProgressRef} className="mb-6 scroll-mt-4">
            <div className="mb-1 flex items-center justify-between px-1 text-xs text-[#999]">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.18em]">IN PROGRESS</h2>
              <p className="rounded-full bg-[#DBDFE9] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#212121]">{inProgressTasks.length}</p>
            </div>
            <div className="space-y-3">
              {inProgressTasks.map((task) => (
                <InProgressRow key={task.id} projects={projects} selectedDate={selectedDate} task={task} />
              ))}
            </div>
          </section>
        )}

        <div ref={todayRef} className="mb-1 flex justify-between items-center px-1 text-xs text-[#999] scroll-mt-4">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em]">Today</h2>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em]">{activeTodayTasks.length} {formatTaskCount(activeTodayTasks.length)}</p>
        </div>
        <div className="space-y-3">
          {activeTodayTasks.map((task) => (
            <SharedTaskRow key={task.id} projects={projects} task={task} toneClass={getTaskTone(task)} onDelete={onDeleteTask} onDone={onDoneTask} onDuplicate={onDuplicateTask} onEdit={onEditTask} onMove={onMoveTask} onOpen={onOpenTask} />
          ))}
          {!activeTodayTasks.length && <EmptyMessage lines={['Nothing scheduled today.']} />}
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-1 flex justify-between items-center px-1 text-xs text-[#999]">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em]">Later</h2>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em]">{laterTasks.length} queued</p>
        </div>
        <div className="space-y-3">
          {laterTasks.map((task) => (
            <SharedTaskRow key={task.id} projects={projects} task={task} toneClass={getTaskTone(task)} onDelete={onDeleteTask} onDone={onDoneTask} onDuplicate={onDuplicateTask} onEdit={onEditTask} onMove={onMoveTask} onOpen={onOpenTask} />
          ))}
          {!laterTasks.length && <EmptyMessage lines={['Nothing queued later.', 'Clear desk, clear mind.']} />}
        </div>
      </section>

      {!!doneTasks.length && (
        <section ref={doneRef} className="mt-6 scroll-mt-4">
          <div className="mb-1 flex justify-between items-center px-1 text-xs text-[#999]">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.18em]">Done</h2>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em]">{doneTasks.length} complete</p>
          </div>
          <div className="space-y-3">
            {doneTasks.map((task) => (
              <SharedTaskRow key={task.id} projects={projects} task={task} toneClass={getTaskTone(task)} onDelete={onDeleteTask} onDone={onDoneTask} onDuplicate={onDuplicateTask} onEdit={onEditTask} onMove={onMoveTask} onOpen={onOpenTask} />
            ))}
          </div>
        </section>
      )}

      {!!overdueTasks.length && (
        <section ref={overdueRef} className="mt-6 scroll-mt-4">
          <div className="mb-1 flex justify-between items-center px-1 text-xs text-[#999]">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.18em]">Needs attention</h2>
            <p className="rounded-full bg-[#FFF0A3] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#212121]">{overdueTasks.length} overdue</p>
          </div>
          <div className="space-y-3">
            {overdueTasks.map((task) => (
              <SharedTaskRow key={task.id} projects={projects} task={task} toneClass={getTaskTone(task)} onDelete={onDeleteTask} onDone={onDoneTask} onDuplicate={onDuplicateTask} onEdit={onEditTask} onMove={onMoveTask} onOpen={onOpenTask} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <div className="mb-1 flex justify-between items-center px-1 text-xs text-[#999]">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em]">PROJECTS</h2>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em]">{activeProjects.length} ACTIVE</p>
        </div>
        <div className="space-y-3">
          {activeProjects.slice(0, 5).map((project) => (
            <ProjectRow key={project.id} project={project} onOpen={onOpenProject} />
          ))}
        </div>
      </section>
    </div>
  );
}

function getProfileDisplayImage(profileImage, user) {
  return profileImage || user?.photoURL || '';
}

function ProfileSheet({ onChangeImage, onClose, onRemoveImage, profileImage, user }) {
  const inputRef = useRef(null);
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Por';
  const image = getProfileDisplayImage(profileImage, user);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    compressProfileImage(file, 800).then(onChangeImage).catch(() => {});
    event.target.value = '';
  };

  return (
    <div className="absolute inset-0 z-[80] flex items-end bg-black/20">
      <button aria-label="Close profile sheet" className="absolute inset-0 cursor-default" type="button" onClick={onClose} />
      <div className="relative z-10 w-full rounded-t-[32px] bg-white p-5 shadow-[0_-12px_32px_rgba(0,0,0,0.12)]">
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[rgba(33,33,33,0.12)]" />
        <div className="flex items-center gap-4">
          {image ? (
            <img alt="Profile preview" className="h-20 w-20 rounded-full object-cover" src={image} />
          ) : (
            <span className="grid h-20 w-20 place-items-center rounded-full bg-[#DBDFE9] text-2xl font-semibold text-[#212121]">P</span>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-2xl font-semibold text-[#212121]">{displayName}</h3>
            <p className="mt-1 truncate text-sm text-[#777777]">{user?.email || 'Private workspace'}</p>
          </div>
        </div>

        <input ref={inputRef} className="hidden" type="file" accept="image/*" onChange={handleFileChange} />

        <div className="mt-6 grid gap-3">
          <button className="min-h-12 rounded-[18px] bg-[#212121] px-4 text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98]" type="button" onClick={() => inputRef.current?.click()}>
            Change picture
          </button>
          <button className="min-h-12 rounded-[18px] bg-[#F5F5FA] px-4 text-sm font-semibold text-[#212121] transition-all duration-150 active:scale-[0.98]" type="button" onClick={onRemoveImage}>
            Remove picture
          </button>
          <button className="min-h-12 rounded-[18px] border border-[rgba(33,33,33,0.08)] px-4 text-sm font-semibold text-[#777777] transition-all duration-150 active:scale-[0.98]" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileCard({ onOpenProfile, profileImage, user }) {
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Por';
  const image = getProfileDisplayImage(profileImage, user);

  return (
    <section className="rounded-[28px] bg-[#212121] p-5 text-white">
      <div className="flex items-center gap-4">
        {image ? (
          <img alt="Profile" className="h-16 w-16 rounded-full object-cover" src={image} />
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-full bg-white/10 text-lg font-semibold uppercase text-white">
            {displayName[0] || 'P'}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-semibold text-white">{displayName}</p>
          <p className="mt-1 truncate text-sm text-white/60">{user?.email || 'Private workspace'}</p>
          <button className="mt-3 min-h-11 rounded-full bg-white/10 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition-all duration-150 active:scale-[0.98]" type="button" onClick={onOpenProfile}>
            Change picture
          </button>
        </div>
      </div>
    </section>
  );
}

function MoreSection({ children, title }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#777777]">{title}</h2>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function MoreRow({ danger = false, label, meta, onClick }) {
  return (
    <button
      className={`flex min-h-[56px] w-full cursor-pointer items-center justify-between gap-4 rounded-[22px] border border-[rgba(33,33,33,0.08)] px-4 py-3 text-left transition duration-[120ms] ease-out active:scale-95 active:bg-[#DBDFE9] ${danger ? 'bg-white/70' : 'bg-white'}`}
      type="button"
      onClick={onClick}
    >
      <span className={`text-[17px] font-medium ${danger ? 'text-[#777777]' : 'text-[#212121]'}`}>{label}</span>
      <span className="flex min-w-0 items-center gap-2">
        {meta && <span className={`min-w-0 truncate text-right text-sm ${danger ? 'text-[#212121]' : 'text-[#777777]'}`}>{meta}</span>}
        <span className={danger ? 'text-[#212121]' : 'text-[#777777]'}>{'>'}</span>
      </span>
    </button>
  );
}

function SyncMeta({ status }) {
  const color = status === 'Synced' ? '#CFDECA' : status === 'Pending' ? '#FFF0A3' : '#DBDFE9';

  return (
    <span className="flex items-center gap-2 text-sm text-[#777777]">
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
      {status}
    </span>
  );
}

function MoreView({ onClearCompleted, onOpenProfile, onSignOut, profileImage, tasks, user }) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [toolMessage, setToolMessage] = useState('');
  const completedCount = tasks.filter(isTaskDone).length;
  const syncStatus = isFirebaseConfigured() ? 'Synced' : 'Offline';
  const dataStatus = `${tasks.length} tasks`;
  const lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const showToolMessage = (message) => {
    setToolMessage(message);
    window.setTimeout(() => setToolMessage(''), 2600);
  };

  return (
    <div className="page-fade space-y-6 pb-28">
      <ProfileCard profileImage={profileImage} user={user} onOpenProfile={onOpenProfile} />

      {toolMessage && (
        <div className="rounded-[20px] border border-[rgba(33,33,33,0.08)] bg-white px-4 py-3 text-sm text-[#212121]">
          {toolMessage}
        </div>
      )}

      <MoreSection title="Account">
        <MoreRow label="Profile" meta="Placeholder" onClick={() => showToolMessage('Profile settings coming soon.')} />
        <MoreRow label="Account email" meta={user?.email || 'Private workspace'} onClick={() => showToolMessage(user?.email || 'Private workspace')} />
      </MoreSection>

      <MoreSection title="System">
        <MoreRow label="Sync status" meta={<SyncMeta status={syncStatus} />} onClick={() => showToolMessage(`Sync status: ${syncStatus}`)} />
        <MoreRow label="Data source" meta="Firestore realtime" onClick={() => showToolMessage('Firestore realtime sync is active.')} />
        <MoreRow label="Last updated" meta={lastUpdated} onClick={() => showToolMessage(`Last updated ${lastUpdated}`)} />
        <MoreRow label="Data status" meta={dataStatus} onClick={() => showToolMessage(dataStatus)} />
      </MoreSection>

      <MoreSection title="Tools">
        <MoreRow label="Clear completed tasks" meta={`${completedCount} done`} onClick={() => setConfirmClear(true)} />
        <MoreRow label="Export data" meta="Soon" onClick={() => showToolMessage('Export coming soon.')} />
        <MoreRow label="Rebuild calendar index" meta="Refresh" onClick={() => showToolMessage('Calendar index refreshed.')} />
      </MoreSection>

      <MoreSection title="About">
        <MoreRow label="Studio OS" meta="Be Blank" onClick={() => showToolMessage('Studio OS')} />
        <MoreRow label="Version" meta="v0.1" onClick={() => showToolMessage('Version v0.1')} />
        <MoreRow label="Be blank to behind studio" meta="Studio" onClick={() => showToolMessage('Be blank to behind studio')} />
      </MoreSection>

      <MoreSection title="Danger">
        <MoreRow danger label="Sign out" meta="Exit" onClick={onSignOut} />
      </MoreSection>

      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-end bg-[rgba(33,33,33,0.25)]">
          <div className="w-full rounded-t-[32px] bg-white p-5">
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[rgba(33,33,33,0.08)]" />
            <h3 className="text-xl font-semibold text-[#212121]">Clear completed tasks?</h3>
            <p className="mt-2 text-sm leading-6 text-[#777777]">
              This will remove {completedCount} completed {completedCount === 1 ? 'task' : 'tasks'} from the mobile workspace.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="h-12 rounded-[18px] border border-[rgba(33,33,33,0.08)] text-sm font-medium text-[#212121] transition duration-[120ms] ease-out active:scale-95" type="button" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
              <button
                className="h-12 rounded-[18px] bg-[#FFF0A3] text-sm font-semibold text-[#212121] transition duration-[120ms] ease-out active:scale-95"
                type="button"
                onClick={async () => {
                  await onClearCompleted();
                  setConfirmClear(false);
                  showToolMessage('Completed tasks cleared.');
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MobileDashboard({ onSignOut, user }) {
  const [activeTab, setActiveTab] = useState('Home');
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileImage, setProfileImageState] = useState(() => getProfileImage());
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return undefined;
    }

    const unsubscribers = [
      subscribeToProjects(setProjects, () => setProjects([])),
      subscribeToCollection(taskCollection, setTasks, () => setTasks([])),
      subscribeToCollection(notesCollection, setNotes, () => setNotes([])),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe?.());
  }, []);

  useEffect(() => {
    const handleOpenQuickAdd = () => setIsQuickAddOpen(true);
    window.addEventListener('mobile-open-quick-add', handleOpenQuickAdd);
    return () => window.removeEventListener('mobile-open-quick-add', handleOpenQuickAdd);
  }, []);

  const openQuickAdd = () => setIsQuickAddOpen(true);
  const updateProfileImage = (dataUrl) => {
    setProfileImage(dataUrl);
    setProfileImageState(dataUrl);
  };
  const clearProfileImage = () => {
    removeProfileImage();
    setProfileImageState('');
  };
  const openProject = (project) => {
    setSelectedProjectId(project.id);
    setActiveTab('Projects');
  };
  const useDemoData = DEMO_MODE || !projects.length || !tasks.length;
  const displayProjects = useDemoData ? demoProjects : projects;
  const displayTasks = useDemoData ? demoTasks : tasks;
  const displayNotes = useDemoData ? demoNotes : notes;
  const initialMobileDate = useDemoData ? demoFocusDate : undefined;
  const isDemoItem = (item) => String(item?.id || '').startsWith('demo-');
  const showToast = (message) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(''), 3200);
  };
  const createTask = async (task, addToCalendar = false) => {
    const taskPayload = { ...task };
    delete taskPayload.type;

    await addCollectionItem(taskCollection, {
      ...taskPayload,
      calendarLinked: false,
      pendingCalendarSync: addToCalendar,
    });

    if (addToCalendar) {
      showToast('Saved. Calendar sync pending.');
    }
  };
  const markTaskDone = async (task) => {
    if (isDemoItem(task)) {
      showToast('Demo data is read-only.');
      setSelectedTask(null);
      return;
    }

    await updateCollectionItem(taskCollection, task.id, { status: 'done', completedAt: new Date().toISOString() });
    setSelectedTask(null);
  };
  const deleteTask = async (task) => {
    if (isDemoItem(task)) {
      showToast('Demo data is read-only.');
      setSelectedTask(null);
      return;
    }

    await deleteCollectionItem(taskCollection, task.id);
    setSelectedTask(null);
  };
  const duplicateTask = async (task) => {
    if (isDemoItem(task)) {
      showToast('Demo data is read-only.');
      return;
    }

    const copy = { ...task };
    delete copy.id;
    delete copy.completedAt;
    await addCollectionItem(taskCollection, {
      ...copy,
      status: 'todo',
      title: `${task.title || 'Untitled task'} copy`,
    });
  };
  const moveTask = async (task) => {
    if (isDemoItem(task)) {
      showToast('Demo data is read-only.');
      return;
    }

    const nextDate = window.prompt('Move to date (YYYY-MM-DD)', task.startDate || task.dueDate || '');
    if (!nextDate) {
      return;
    }
    await updateCollectionItem(taskCollection, task.id, { dueDate: nextDate, startDate: nextDate });
  };
  const clearCompletedTasks = async () => {
    const completedTasks = tasks.filter(isTaskDone);
    await Promise.all(completedTasks.map((task) => deleteCollectionItem(taskCollection, task.id)));
  };
  const editTask = async (task) => {
    if (isDemoItem(task)) {
      showToast('Demo data is read-only.');
      return;
    }

    const nextTitle = window.prompt('Task title', task.title || '');
    if (nextTitle === null) {
      return;
    }
    const nextDetail = window.prompt('Task detail', task.notes || task.detail || '');
    await updateCollectionItem(taskCollection, task.id, { title: nextTitle, detail: nextDetail || '', notes: nextDetail || '' });
  };

  const content = {
    Home: (
      <HomeView
        initialDate={initialMobileDate}
        projects={displayProjects}
        tasks={displayTasks}
        onDeleteTask={deleteTask}
        onDoneTask={markTaskDone}
        onDuplicateTask={duplicateTask}
        onEditTask={editTask}
        onMoveTask={moveTask}
        onOpenProject={openProject}
        onOpenTask={setSelectedTask}
      />
    ),
    Calendar: <MobileCalendar initialDate={initialMobileDate} projects={displayProjects} tasks={displayTasks} onDeleteTask={deleteTask} onDoneTask={markTaskDone} onDuplicateTask={duplicateTask} onEditTask={editTask} onMoveTask={moveTask} onOpenTask={setSelectedTask} />,
    Projects: (
      <MobileProjects
        notes={displayNotes}
        projects={displayProjects}
        selectedProjectId={selectedProjectId}
        tasks={displayTasks}
        onSelectProject={setSelectedProjectId}
      />
    ),
    More: <MoreView profileImage={profileImage} tasks={displayTasks} user={user} onClearCompleted={clearCompletedTasks} onOpenProfile={() => setIsProfileOpen(true)} onSignOut={onSignOut} />,
  }[activeTab];

  return (
    <main className="relative mx-auto flex h-[100dvh] min-h-screen w-full max-w-[430px] flex-col overflow-hidden bg-[#F5F5FA] text-[#212121] [font-family:Urbanist,system-ui,sans-serif]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 w-full shrink-0 items-center justify-between bg-transparent px-4">
          <button className="grid size-10 place-items-center rounded-full bg-white transition duration-[120ms] ease-out active:scale-95" type="button">
            <img
              src="/logo-bb-black.png"
              alt="BB Studio"
              className="h-auto w-7 object-contain"
            />
          </button>
          <h1 className="text-sm font-medium tracking-[0.08em] text-[#212121]">Studio OS</h1>
          <ProfileAvatar profileImage={profileImage} user={user} onClick={() => setIsProfileOpen(true)} />
        </header>

        <section className="min-h-0 flex-1 overflow-y-auto px-4 pb-32 pt-5">
          {toastMessage && (
            <div className="mb-5 rounded-[16px] border border-[rgba(33,33,33,0.08)] px-4 py-3 text-sm text-[#212121]">
              {toastMessage}
            </div>
          )}
          {content}
        </section>
      </div>

      <nav className="absolute bottom-5 left-4 right-4 z-50 grid h-[64px] grid-cols-5 items-center rounded-full bg-[#212121] px-3 text-[11px] font-semibold text-white/55">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`flex min-h-11 items-center justify-center rounded-[18px] transition duration-[120ms] ease-out active:scale-95 ${
              tab === '+' ? 'mx-auto size-12 rounded-full bg-white text-xl text-[#212121]' : activeTab === tab ? 'scale-105 text-[#FFF0A3]' : 'text-white/55'
            }`}
            type="button"
            onClick={() => {
              if (tab === '+') {
                openQuickAdd();
                return;
              }

              if (tab !== 'Projects') {
                setSelectedProjectId('');
              }
              setActiveTab(tab);
            }}
          >
            {tab}
          </button>
        ))}
      </nav>

      {selectedTask && <TaskDetail projects={displayProjects} task={selectedTask} onClose={() => setSelectedTask(null)} onDone={markTaskDone} />}
      {isQuickAddOpen && <QuickAdd projects={displayProjects} onClose={() => setIsQuickAddOpen(false)} onCreate={createTask} />}
      {isProfileOpen && (
        <ProfileSheet
          profileImage={profileImage}
          user={user}
          onChangeImage={updateProfileImage}
          onClose={() => setIsProfileOpen(false)}
          onRemoveImage={clearProfileImage}
        />
      )}
    </main>
  );
}
