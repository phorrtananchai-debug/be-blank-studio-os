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
import { MobileProjects } from './MobileProjects.jsx';

const tabs = ['Home', 'Calendar', '+', 'Projects', 'More'];
const taskCollection = 'tasks';
const notesCollection = 'notes';
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
  return parseDateValue(task.startDate || task.dueDate || task.dueAt || task.date || task.createdAt);
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

function isTaskDone(task) {
  return task.status === 'done';
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

  if (text.includes('พรุ่งนี้') || text.includes('tomorrow')) {
    date.setDate(date.getDate() + 1);
    return { startDate: date, endDate: date, isRange: false };
  }

  if (text.includes('มะรืน')) {
    date.setDate(date.getDate() + 2);
    return { startDate: date, endDate: date, isRange: false };
  }

  if (text.includes('วันนี้') || text.includes('today')) {
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

function TaskRow({ onDone, onEdit, onOpen, task }) {
  const longPressTimer = useRef(null);
  const dueDate = getTaskDate(task);
  const done = isTaskDone(task);
  const isOverdue = dueDate && dueDate < startOfToday() && !done;
  const projectTag = `@${String(task.projectName || 'studio').split(' ')[0].toLowerCase()}`;

  const handlePointerDown = () => {
    longPressTimer.current = window.setTimeout(() => onEdit(task), 620);
  };

  const handlePointerUp = () => {
    window.clearTimeout(longPressTimer.current);
    onOpen(task);
  };

  return (
    <div className={`mb-3 flex w-full items-start gap-3 rounded-[22px] border border-[rgba(33,33,33,0.08)] px-4 py-4 transition-all duration-150 active:bg-[#DBDFE9] ${done ? 'bg-[#CFDECA]/40 opacity-[0.55] transition-opacity duration-200' : 'bg-white'}`}>
      <button
        aria-label={done ? 'Task done' : 'Mark task done'}
        className={`mt-1 grid h-5 w-5 shrink-0 scale-110 place-items-center rounded-full border transition-all duration-100 active:scale-95 ${
          done ? 'border-[#212121] bg-[#212121]' : 'border-[#777777] bg-transparent'
        }`}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (!done) {
            onDone(task);
          }
        }}
      >
        {done && (
          <svg aria-hidden="true" className="h-3 w-3 text-[#F5F5FA]" fill="none" viewBox="0 0 12 12">
            <path d="M3 6.1 5.1 8 9.2 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
          </svg>
        )}
      </button>
      <button
        className="grid min-h-[56px] min-w-0 flex-1 cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-3 text-left transition-all duration-100 active:scale-95"
        type="button"
        onPointerDown={handlePointerDown}
        onPointerLeave={() => window.clearTimeout(longPressTimer.current)}
        onPointerUp={handlePointerUp}
      >
        <span className="min-w-0">
          <span className="block text-[12px] font-bold tracking-[0.04em] text-[#212121]">
            {projectTag}
          </span>
          <span className={`mt-1 block text-[17px] font-medium leading-snug text-[#212121] ${done ? 'line-through decoration-[#212121]/60' : ''}`}>
            {task.title || 'Untitled task'}
          </span>
          <span className={`mt-1 block truncate text-sm leading-5 text-[#777777] ${done ? 'line-through decoration-[#777777]/60' : ''}`}>
            — {task.notes || task.detail || 'Tap to open detail'}
          </span>
        </span>
        <span className={`rounded-full px-2.5 py-1 text-right text-[11px] font-semibold uppercase tracking-[0.08em] ${isOverdue ? 'bg-[#FFF0A3] text-[#212121]' : 'bg-[#DBDFE9] text-[#212121]'}`}>
          {task.startTime || (dueDate ? dueDate.toLocaleDateString([], { day: 'numeric', month: 'short' }) : '')}
        </span>
      </button>
    </div>
  );
}

function TaskDetail({ onClose, onDone, task }) {
  const dueDate = getTaskDate(task);

  return (
    <div className="absolute inset-0 z-40 bg-[#F5F5FA] px-5 py-6">
      <button className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#777777] transition-all duration-100 active:scale-95" type="button" onClick={onClose}>
        Close
      </button>
      <div className="mt-16">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#777777]">{task.projectName || 'Studio'}</p>
        <h2 className="mt-4 text-3xl font-medium leading-tight">{task.title}</h2>
        <p className="mt-5 text-base leading-7 text-[#777777]">{task.notes || task.detail || 'No detail added.'}</p>
        {dueDate && <p className="mt-8 text-sm text-[#212121]">{describeTaskDate(task)}</p>}
        <button
          className="mt-10 h-14 w-full rounded-[18px] bg-[#212121] text-sm font-medium text-[#F5F5FA] transition-all duration-100 active:scale-95"
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
            className="mt-3 min-h-36 w-full resize-none rounded-[24px] bg-[#F5F5FA] px-4 py-4 text-xl font-medium leading-8 text-[#212121] outline-none ring-0 transition-all duration-150 placeholder:text-[#777777] focus:bg-white focus:ring-1 focus:ring-[#212121]"
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
          <button className="h-12 rounded-[18px] border border-[rgba(33,33,33,0.08)] text-sm font-medium transition-all duration-100 active:scale-95" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="h-12 rounded-[18px] bg-[#212121] text-sm font-medium text-[#F5F5FA] transition-all duration-100 active:scale-95" type="button" onClick={() => handleCreate(false)}>
            Save Task
          </button>
        </div>
        <button
          className="mt-3 h-12 w-full rounded-[18px] bg-[#FFF0A3] text-sm font-semibold text-[#212121] transition-all duration-100 active:scale-95"
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
    <div className="rounded-[24px] border border-[rgba(33,33,33,0.08)] bg-white px-4 py-5 text-sm leading-relaxed text-[#777777]">
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
      className="mb-3 flex min-h-[56px] w-full cursor-pointer items-center gap-3 rounded-[22px] border border-[rgba(33,33,33,0.08)] bg-white px-4 py-4 text-left transition-transform duration-100 active:scale-[0.98] active:bg-[#DBDFE9]"
      type="button"
      onClick={() => onOpen(project)}
    >
      <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-[#DBDFE9] text-xs font-bold uppercase text-[#212121]">
        {initials || 'P'}
        <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-[#212121]">{project.name}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-[#777777]">{status}</p>
      </div>
      <span className="text-xl leading-none text-[#555555]">›</span>
    </button>
  );
}

function HomeView({ onDoneTask, onEditTask, onOpenProject, onOpenTask, projects, tasks }) {
  const today = startOfToday();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });
  const todayTasks = tasks
    .filter((task) => isSameDay(getTaskDate(task), today))
    .sort((left, right) => Number(isTaskDone(left)) - Number(isTaskDone(right)));
  const doneTasks = todayTasks.filter(isTaskDone);
  const activeTodayTasks = todayTasks.filter((task) => !isTaskDone(task));
  const laterTasks = tasks
    .filter((task) => {
      const taskDate = getTaskDate(task);
      return !isTaskDone(task) && taskDate && taskDate > today && !isSameDay(taskDate, today);
    })
    .slice(0, 4);
  const overdueTasks = tasks.filter((task) => {
    const dueDate = getTaskDate(task);
    return !isTaskDone(task) && dueDate && dueDate < today;
  });
  const activeProjects = projects.filter((project) => project.status !== 'open');

  return (
    <div className="page-fade grid gap-8">
      <section>
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-5xl font-bold lowercase leading-none tracking-[-0.02em] text-[#212121]">today</h2>
          <div className="flex gap-2">
            <span className="rounded-full bg-[#CFDECA] px-3 py-2 text-xs font-semibold text-[#212121]">{doneTasks.length} done</span>
            <span className="rounded-full bg-[#DBDFE9] px-3 py-2 text-xs font-semibold text-[#212121]">{activeTodayTasks.length} tasks</span>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-1">
          {weekDays.map((date) => {
            const selected = isSameDay(date, today);
            return (
              <button
                key={date.toISOString()}
                className={`min-h-[58px] rounded-[18px] text-center transition-all duration-150 active:scale-[0.98] ${selected ? 'bg-[#212121] text-white' : 'bg-white text-[#212121]'}`}
                type="button"
              >
                <span className={`block pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] ${selected ? 'text-white/60' : 'text-[#777777]'}`}>
                  {date.toLocaleDateString([], { weekday: 'short' })}
                </span>
                <span className="mt-1 block text-sm font-bold">{date.getDate()}</span>
                {selected && <span className="mx-auto mt-1 block size-1.5 rounded-full bg-[#FFF0A3]" />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[24px] border border-[rgba(33,33,33,0.08)] bg-[#FFF0A3] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#212121]/70">Insight</p>
        <p className="mt-2 text-2xl font-bold text-[#212121]">{activeTodayTasks.length} tasks today</p>
        <p className="mt-1 text-sm font-medium text-[#212121]/70">{activeProjects.length} active {activeProjects.length === 1 ? 'project' : 'projects'}</p>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between px-1">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#212121]">Today</h2>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#777777]">{activeTodayTasks.length} {formatTaskCount(activeTodayTasks.length)}</p>
        </div>
        <div className="mt-4">
          {activeTodayTasks.map((task) => (
            <TaskRow key={task.id} task={task} onDone={onDoneTask} onEdit={onEditTask} onOpen={onOpenTask} />
          ))}
          {!activeTodayTasks.length && <EmptyMessage lines={['No tasks today.', 'Enjoy the silence.']} />}
      <section>
        <div className="mb-3 flex items-end justify-between px-1">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#212121]">Later</h2>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#777777]">{laterTasks.length} queued</p>
        </div>
        <div className="mt-4">
          {laterTasks.map((task) => (
            <TaskRow key={task.id} task={task} onDone={onDoneTask} onEdit={onEditTask} onOpen={onOpenTask} />
          ))}
          {!laterTasks.length && <EmptyMessage lines={['Nothing queued later.', 'Clear desk, clear mind.']} />}
        </div>
      </section>

      {!!doneTasks.length && (
        <section>
          <div className="mb-3 flex items-end justify-between px-1">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#212121]">Done</h2>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#777777]">{doneTasks.length} complete</p>
          </div>
          <div className="mt-4">
            {doneTasks.map((task) => (
              <TaskRow key={task.id} task={task} onDone={onDoneTask} onEdit={onEditTask} onOpen={onOpenTask} />
            ))}
          </div>
        </section>
      )}

      {!!overdueTasks.length && (
        <section>
          <div className="mb-3 flex items-end justify-between px-1">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#212121]">Needs attention</h2>
            <p className="rounded-full bg-[#FFF0A3] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#212121]">{overdueTasks.length} overdue</p>
          </div>
          <div className="mt-4">
            {overdueTasks.map((task) => (
              <TaskRow key={task.id} task={task} onDone={onDoneTask} onEdit={onEditTask} onOpen={onOpenTask} />
            ))}
          </div>
        </section>
      )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between px-1">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#212121]">PROJECTS</h2>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#777777]">{activeProjects.length} ACTIVE</p>
        </div>
        <div className="mt-4">
          {activeProjects.slice(0, 5).map((project) => (
            <ProjectRow key={project.id} project={project} onOpen={onOpenProject} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ProfileAvatar({ user }) {
  if (user?.photoURL) {
    return <img alt="Profile" className="size-8 rounded-full object-cover" src={user.photoURL} />;
  }

  return <span className="grid size-8 place-items-center rounded-full bg-[rgba(33,33,33,0.08)] text-xs font-medium text-[#777777]">P</span>;
}

function MoreSection({ children, title }) {
  return (
    <section>
      <h2 className="mb-3 px-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#777777]">{title}</h2>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function MoreRow({ danger = false, label, meta, onClick }) {
  return (
    <button
      className="flex min-h-[56px] w-full cursor-pointer items-center justify-between gap-4 rounded-[22px] border border-[rgba(33,33,33,0.08)] bg-white px-4 py-4 text-left transition-all duration-100 active:scale-95 active:bg-[#DBDFE9]"
      type="button"
      onClick={onClick}
    >
      <span className={`text-[17px] font-medium ${danger ? 'text-[#212121]' : 'text-[#212121]'}`}>{label}</span>
      <span className="flex min-w-0 items-center gap-2">
        {meta && <span className={`min-w-0 truncate text-right text-sm ${danger ? 'text-[#212121]' : 'text-[#777777]'}`}>{meta}</span>}
        <span className={danger ? 'text-[#212121]' : 'text-[#777777]'}>›</span>
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

function MoreView({ onClearCompleted, onSignOut, tasks, user }) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [toolMessage, setToolMessage] = useState('');
  const completedCount = tasks.filter(isTaskDone).length;
  const syncStatus = isFirebaseConfigured() ? 'Synced' : 'Offline';
  const dataStatus = `${tasks.length} tasks`;
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Por';
  const lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const showToolMessage = (message) => {
    setToolMessage(message);
    window.setTimeout(() => setToolMessage(''), 2600);
  };

  return (
    <div className="page-fade grid gap-8">
      <section className="rounded-[28px] border border-[rgba(33,33,33,0.08)] bg-[#212121] p-5 text-white">
        <div className="flex items-center gap-4">
          {user?.photoURL ? (
            <img alt="Profile" className="size-14 rounded-full object-cover" src={user.photoURL} />
          ) : (
            <span className="grid size-14 place-items-center rounded-full bg-white/10 text-lg font-semibold uppercase text-white">
              {displayName[0] || 'P'}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-semibold text-white">{displayName}</p>
            <p className="mt-1 truncate text-sm text-white/60">{user?.email || 'Private workspace'}</p>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/50">Private workspace</p>
          </div>
        </div>
      </section>

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
              <button className="h-12 rounded-[18px] border border-[rgba(33,33,33,0.08)] text-sm font-medium text-[#212121] transition-all duration-100 active:scale-95" type="button" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
              <button
                className="h-12 rounded-[18px] bg-[#FFF0A3] text-sm font-semibold text-[#212121] transition-all duration-100 active:scale-95"
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

  const openQuickAdd = () => setIsQuickAddOpen(true);
  const openProject = (project) => {
    setSelectedProjectId(project.id);
    setActiveTab('Projects');
  };
  const createTask = async (task, addToCalendar = false) => {
    const { type, ...taskPayload } = task;

    await addCollectionItem(taskCollection, {
      ...taskPayload,
      calendarLinked: false,
      pendingCalendarSync: addToCalendar,
    });

    if (addToCalendar) {
      setToastMessage('Saved. Calendar sync pending.');
      window.setTimeout(() => setToastMessage(''), 3200);
    }
  };
  const markTaskDone = async (task) => {
    await updateCollectionItem(taskCollection, task.id, { status: 'done', completedAt: new Date().toISOString() });
    setSelectedTask(null);
  };
  const clearCompletedTasks = async () => {
    const completedTasks = tasks.filter(isTaskDone);
    await Promise.all(completedTasks.map((task) => deleteCollectionItem(taskCollection, task.id)));
  };
  const editTask = async (task) => {
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
        projects={projects}
        tasks={tasks}
        onDoneTask={markTaskDone}
        onEditTask={editTask}
        onOpenProject={openProject}
        onOpenTask={setSelectedTask}
      />
    ),
    Calendar: <MobileCalendar tasks={tasks} onDoneTask={markTaskDone} onOpenTask={setSelectedTask} />,
    Projects: (
      <MobileProjects
        notes={notes}
        projects={projects}
        selectedProjectId={selectedProjectId}
        tasks={tasks}
        onSelectProject={setSelectedProjectId}
      />
    ),
    More: <MoreView tasks={tasks} user={user} onClearCompleted={clearCompletedTasks} onSignOut={onSignOut} />,
  }[activeTab];

  return (
    <main className="relative min-h-[100dvh] w-full overflow-hidden bg-[#F5F5FA] text-[#212121] [font-family:Urbanist,system-ui,sans-serif]">
      <div className="flex min-h-[100dvh] w-full flex-col pb-32">
        <header className="flex w-full items-center justify-between bg-transparent px-5 pb-3 pt-4">
          <button className="grid size-10 place-items-center rounded-full bg-white transition-all duration-150 active:scale-[0.98]" type="button">
            <img
              src="/logo-bb-black.png"
              alt="BB Studio"
              className="h-auto w-7 object-contain"
            />
          </button>
          <h1 className="text-sm font-medium tracking-[0.08em] text-[#212121]">Studio OS</h1>
          <ProfileAvatar user={user} />
        </header>

        <section className="flex-1 overflow-y-auto px-5 pb-8 pt-6">
          {toastMessage && (
            <div className="mb-5 rounded-[16px] border border-[rgba(33,33,33,0.08)] px-4 py-3 text-sm text-[#212121]">
              {toastMessage}
            </div>
          )}
          {content}
        </section>
      </div>

      <nav className="fixed bottom-5 left-1/2 grid h-[64px] w-[calc(100%-32px)] max-w-[430px] -translate-x-1/2 grid-cols-5 items-center rounded-full bg-[#212121] px-3 text-[11px] font-semibold text-white/55">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`flex min-h-11 items-center justify-center rounded-[18px] transition-all duration-100 active:scale-95 ${
              tab === '+' ? 'mx-auto size-12 rounded-full bg-white text-xl text-[#212121]' : activeTab === tab ? 'text-[#FFF0A3]' : 'text-white/55'
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

      {selectedTask && <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} onDone={markTaskDone} />}
      {isQuickAddOpen && <QuickAdd projects={projects} onClose={() => setIsQuickAddOpen(false)} onCreate={createTask} />}
    </main>
  );
}
