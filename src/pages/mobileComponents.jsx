import { AlertCircle, Briefcase, CalendarDays, CheckCircle, Clock } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  formatDateRangeLabel,
  formatDaysLeft,
  getPhaseInfo,
  getProjectLabel,
  getRangeProgress,
  getStateInfo,
  getStateLabel,
  getTaskStartDate,
  isRangeTask,
  isTaskDone,
} from './mobileUtils.js';

function getStateIcon(state) {
  if (state === 'DONE') {
    return CheckCircle;
  }

  if (state === 'OVERDUE') {
    return AlertCircle;
  }

  return Clock;
}

function formatTaskPillDate(task, contextDate) {
  const date = getTaskStartDate(task, contextDate);

  if (!date) {
    return { day: '--', month: 'DATE' };
  }

  return {
    day: String(date.getDate()),
    month: date.toLocaleDateString([], { month: 'short' }).toUpperCase(),
  };
}

export function StateChip({ state }) {
  const stateInfo = getStateInfo(state);
  const Icon = getStateIcon(state);

  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${stateInfo.chipClass}`}>
      <Icon className="size-3" aria-hidden="true" />
      {stateInfo.label}
    </span>
  );
}

export function PhaseChip({ phase }) {
  const phaseInfo = getPhaseInfo(phase);
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${phaseInfo.chipClass}`}>
      {phaseInfo.label}
    </span>
  );
}

export function ProgressBar({ fillClass, progress }) {
  return (
    <span className="block h-1.5 overflow-hidden rounded-full bg-[#DBDFE9]">
      <span className={`block h-full rounded-full transition-[width] duration-300 ease-out ${fillClass}`} style={{ width: `${progress}%` }} />
    </span>
  );
}

export function ProfileAvatar({ onClick, profileImage, user }) {
  const image = profileImage || user?.photoURL || '';

  return (
    <button
      aria-label="Open profile settings"
      className="grid min-h-11 min-w-11 place-items-center rounded-full transition-all duration-150 active:scale-[0.98]"
      type="button"
      onClick={onClick}
    >
      {image ? (
        <img alt="Profile" className="h-8 w-8 rounded-full object-cover" src={image} />
      ) : (
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[rgba(33,33,33,0.08)] text-xs font-medium text-[#777777]">P</span>
      )}
    </button>
  );
}

export function RangeTaskCard({ onOpenTask, projects, selectedDate, task }) {
  const phase = getPhaseInfo(task, projects);
  const progress = getRangeProgress(task, selectedDate);
  const projectLabel = getProjectLabel(task, projects);
  const stateLabel = getStateLabel(task, selectedDate);
  const doneClass = stateLabel === 'DONE' ? 'opacity-70' : '';

  return (
    <button
      className={`grid w-full cursor-pointer grid-cols-[36px_1fr_auto] items-start gap-1.5 rounded-2xl border border-black/5 bg-white p-4 text-left shadow-[0_12px_32px_rgba(0,0,0,0.08)] transition duration-[120ms] ease-out active:scale-95 active:bg-[#DBDFE9] ${doneClass}`}
      type="button"
      onClick={() => onOpenTask?.(task)}
    >
      <span className="mt-0.5 grid size-9 place-items-center rounded-full bg-[#DBDFE9] text-[#777777]">
        <Briefcase className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold leading-snug text-[#212121]">{projectLabel}</span>
        <span className="mt-1 block truncate text-xs font-medium text-[#212121]">Phase: {phase.label}</span>
        <span className="mt-3 flex items-center justify-between gap-3 text-xs font-medium text-gray-500">
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{formatDateRangeLabel(task, selectedDate)}</span>
          </span>
          {progress && <span className="shrink-0 text-right">{formatDaysLeft(progress.daysLeft)}</span>}
        </span>
        {progress && (
          <span className="mt-3 flex items-center gap-3">
            <span className="block h-1.5 flex-1 overflow-hidden rounded-full bg-[#DBDFE9]">
              <span className={`block h-full rounded-full transition-[width] duration-300 ease-out ${phase.fillClass}`} style={{ width: `${progress.percent}%` }} />
            </span>
            <span className="text-[11px] font-semibold text-gray-500">{Math.round(progress.percent)}%</span>
          </span>
        )}
      </span>
      <span className="flex min-w-[76px] flex-col items-end gap-1 text-right">
        <StateChip state={stateLabel} />
      </span>
    </button>
  );
}

export function TaskRow({
  onDelete,
  onDeleteTask,
  onDone,
  onDoneTask,
  onDuplicate,
  onDuplicateTask,
  onEdit,
  onEditTask,
  onMove,
  onMoveTask,
  onOpen,
  onOpenTask,
  projects = [],
  selectedDate,
  task,
  toneClass,
  today,
}) {
  const longPressTimer = useRef(null);
  const pointerStart = useRef(null);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const done = isTaskDone(task);
  const contextDate = selectedDate || today;
  const datePill = formatTaskPillDate(task, contextDate);
  const range = isRangeTask(task, contextDate);
  const phase = getPhaseInfo(task, projects);
  const projectTag = getProjectLabel(task, projects);
  const detail = task.notes || task.detail || 'Tap to open detail';
  const progress = range ? getRangeProgress(task, contextDate) : null;
  const meta = range
    ? `${projectTag} · ${phase.label}`
    : task.startTime
      ? `${projectTag} · ${phase.label} / ${task.startTime}`
      : `${projectTag} - ${phase.label}`;
  const handleDone = onDone || onDoneTask;
  const handleDelete = onDelete || onDeleteTask;
  const handleOpen = onOpen || onOpenTask;
  const handleEdit = onEdit || onEditTask;
  const handleDuplicate = onDuplicate || onDuplicateTask;
  const handleMove = onMove || onMoveTask;

  const clearLongPress = () => window.clearTimeout(longPressTimer.current);

  const handlePointerDown = (event) => {
    pointerStart.current = { x: event.clientX, y: event.clientY };
    longPressTimer.current = window.setTimeout(() => setIsActionSheetOpen(true), 400);
  };

  const handlePointerUp = (event) => {
    clearLongPress();

    if (!pointerStart.current || isActionSheetOpen) {
      return;
    }

    const deltaX = event.clientX - pointerStart.current.x;
    const deltaY = Math.abs(event.clientY - pointerStart.current.y);
    pointerStart.current = null;

    if (deltaY < 28 && deltaX > 72) {
      handleDone?.(task);
      return;
    }

    if (deltaY < 28 && deltaX < -72) {
      handleDelete?.(task);
      return;
    }

    handleOpen?.(task);
  };

  return (
    <div className="relative">
      <div
        className={`grid min-h-[72px] w-full cursor-pointer grid-cols-[24px_1fr_52px] items-center gap-3 rounded-[22px] border border-[rgba(0,0,0,0.05)] px-4 py-3 shadow-sm transition duration-[120ms] ease-out active:scale-95 active:bg-[#DBDFE9] ${toneClass || (done ? 'bg-[#CFDECA]/20' : 'bg-white')}`}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleOpen?.(task);
          }
        }}
        onPointerDown={handlePointerDown}
        onPointerLeave={clearLongPress}
        onPointerUp={handlePointerUp}
      >
        <button
          aria-label={done ? 'Task done' : 'Mark task done'}
          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition duration-[120ms] ease-out active:scale-90 ${
            done ? 'scale-110 border-[#212121] bg-[#212121] opacity-100' : 'border-[#777777] bg-transparent opacity-70'
          }`}
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            if (!done) {
              handleDone?.(task);
            }
          }}
        >
          {done && (
            <svg aria-hidden="true" className="h-3 w-3 text-[#F5F5FA] transition duration-[120ms] ease-out" fill="none" viewBox="0 0 12 12">
              <path d="M3 6.1 5.1 8 9.2 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
            </svg>
          )}
        </button>
        <div className="min-w-0 pr-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className={`block truncate text-[11px] font-medium tracking-[0.04em] text-[#777777] ${done ? 'line-through decoration-[#777777]/60' : ''}`}>
              {meta}
            </span>
            {range && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ${phase.chipClass}`}>{getStateLabel(task, contextDate)}</span>}
          </span>
          <span className={`mt-1 line-clamp-2 block text-[17px] font-medium leading-snug text-[#212121] ${done ? 'line-through decoration-[#212121]/60' : ''}`}>
            {task.title || 'Untitled task'}
          </span>
          <span className={`mt-1 line-clamp-1 block text-sm leading-5 text-[#777777] ${done ? 'line-through decoration-[#777777]/60' : ''}`}>
            {detail}
          </span>
          {progress && (
            <span className="mt-3 block">
              <span className="mb-1 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.1em] text-[#777777]">
                <span>Range</span>
                <span>{formatDaysLeft(progress.daysLeft)}</span>
              </span>
              <ProgressBar fillClass={phase.fillClass} progress={progress.percent} />
            </span>
          )}
        </div>
        <span className="flex h-[52px] w-[48px] shrink-0 flex-col items-center justify-center justify-self-end rounded-[14px] bg-[#DBDFE9]/70 text-center">
          <span className="text-[9px] uppercase tracking-[0.12em] text-[#777777]">{datePill.month}</span>
          <span className="text-lg font-semibold leading-none text-[#212121]">{datePill.day}</span>
        </span>
      </div>

      {isActionSheetOpen && (
        <div className="absolute right-3 top-3 z-30 grid w-36 gap-1 rounded-[18px] border border-[rgba(0,0,0,0.05)] bg-white p-2 text-sm shadow-lg">
          <button className="rounded-[12px] px-3 py-2 text-left transition duration-[120ms] ease-out active:scale-95 active:bg-[#DBDFE9]" type="button" onClick={() => { setIsActionSheetOpen(false); handleEdit?.(task); }}>
            Edit
          </button>
          <button className="rounded-[12px] px-3 py-2 text-left transition duration-[120ms] ease-out active:scale-95 active:bg-[#DBDFE9]" type="button" onClick={() => { setIsActionSheetOpen(false); handleDuplicate?.(task); }}>
            Duplicate
          </button>
          <button className="rounded-[12px] px-3 py-2 text-left transition duration-[120ms] ease-out active:scale-95 active:bg-[#DBDFE9]" type="button" onClick={() => { setIsActionSheetOpen(false); handleMove?.(task); }}>
            Move
          </button>
        </div>
      )}
    </div>
  );
}
