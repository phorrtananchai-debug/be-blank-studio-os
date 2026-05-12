import { Briefcase, CalendarDays } from 'lucide-react';
import { useRef, useState } from 'react';
import { TaskRow as SharedTaskRow } from '../../pages/mobileComponents.jsx';
import { MobileCalendarStrip } from './MobileCalendarStrip.jsx';
import {
  formatDaysLeft,
  formatTaskCount,
  formatTaskRangeLabel,
  getInsightMessage,
  getPhaseInfo,
  getProjectLabel,
  getRangeProgress,
  getStateInfo,
  getStateLabel,
  getTaskDate,
  getTaskTone,
  isRangeTask,
  isSameDay,
  isTaskDone,
  isTaskInProgressOn,
  startOfDay,
  startOfToday,
} from '../../pages/mobile/mobileTaskUtils.js';

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
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-tight ${state.chipClass}`}>
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

export function MobileHome({ initialDate, onDeleteTask, onDoneTask, onDuplicateTask, onEditTask, onMoveTask, onOpenProject, onOpenTask, projects, tasks }) {
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
      <section className="pt-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-sans font-bold text-6xl lowercase leading-none tracking-tight text-[#111111]">today</h2>
          <div className="flex gap-2 pb-1">
            <button className="rounded-full bg-[#CFDECA] px-4 py-2 text-[10px] font-bold uppercase tracking-tight text-[#212121] transition-all duration-150 active:scale-[0.98]" type="button" onClick={() => scrollTo(doneRef)}>{doneTasks.length} done</button>
            <button className="rounded-full bg-[#DBDFE9] px-4 py-2 text-[10px] font-bold uppercase tracking-tight text-[#212121] transition-all duration-150 active:scale-[0.98]" type="button" onClick={() => scrollTo(todayRef)}>{activeTodayTasks.length} tasks</button>
          </div>
        </div>
        <MobileCalendarStrip selectedDate={selectedDate} weekDays={weekDays} onSelectDate={setSelectedDate} />
      </section>

      <button className="mt-10 w-full rounded-[28px] border border-black/5 bg-[#FFF0A3] p-6 text-left shadow-sm transition-all duration-300 active:scale-[0.98]" type="button" onClick={insightAction.onClick}>
        <p className="text-[10px] font-bold uppercase  text-[#212121]/60">Insight</p>
        <p className="font-sans font-bold mt-3 text-3xl font-medium leading-tight text-[#111111]">{insightMessage}</p>
        <span className="mt-6 flex items-center justify-between gap-4">
          <span className="text-[13px] font-medium text-[#212121]/60 italic">{insightAction.subtext}</span>
          <span className="shrink-0 rounded-full bg-white/50 px-4 py-2 text-[10px] font-bold uppercase tracking-tight text-[#212121]">{insightAction.label}</span>
        </span>
      </button>

      <section className="mt-16">
        {!!inProgressTasks.length && (
          <section ref={inProgressRef} className="mb-12 scroll-mt-4">
            <div className="mb-4 flex items-center justify-between px-1">
              <h2 className="text-[10px] font-bold uppercase  text-studio-muted">IN PROGRESS</h2>
              <p className="rounded-full bg-[#DBDFE9] px-2 py-0.5 text-[10px] font-bold text-[#212121]">{inProgressTasks.length}</p>
            </div>
            <div className="space-y-4">
              {inProgressTasks.map((task) => (
                <InProgressRow key={task.id} projects={projects} selectedDate={selectedDate} task={task} />
              ))}
            </div>
          </section>
        )}

        <div ref={todayRef} className="mb-4 flex justify-between items-center px-1 scroll-mt-4">
          <h2 className="text-[10px] font-bold uppercase  text-studio-muted">Tasks Today</h2>
          <p className="text-[10px] font-bold uppercase tracking-tight text-studio-muted/60">{activeTodayTasks.length} {formatTaskCount(activeTodayTasks.length)}</p>
        </div>
        <div className="space-y-4">
          {activeTodayTasks.map((task) => (
            <SharedTaskRow key={task.id} projects={projects} task={task} toneClass={getTaskTone(task)} onDelete={onDeleteTask} onDone={onDoneTask} onDuplicate={onDuplicateTask} onEdit={onEditTask} onMove={onMoveTask} onOpen={onOpenTask} />
          ))}
          {!activeTodayTasks.length && <EmptyMessage lines={['Nothing scheduled today.']} />}
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-4 flex justify-between items-center px-1">
          <h2 className="text-[10px] font-bold uppercase  text-studio-muted">Later</h2>
          <p className="text-[10px] font-bold uppercase tracking-tight text-studio-muted/60">{laterTasks.length} queued</p>
        </div>
        <div className="space-y-4">
          {laterTasks.map((task) => (
            <SharedTaskRow key={task.id} projects={projects} task={task} toneClass={getTaskTone(task)} onDelete={onDeleteTask} onDone={onDoneTask} onDuplicate={onDuplicateTask} onEdit={onEditTask} onMove={onMoveTask} onOpen={onOpenTask} />
          ))}
          {!laterTasks.length && <EmptyMessage lines={['Nothing queued later.', 'Clear desk, clear mind.']} />}
        </div>
      </section>

      {!!doneTasks.length && (
        <section ref={doneRef} className="mt-6 scroll-mt-4">
          <div className="mb-1 flex justify-between items-center px-1 text-xs text-[#999]">
            <h2 className="text-[11px] font-medium uppercase tracking-tight">Done</h2>
            <p className="text-[11px] font-medium uppercase tracking-tight">{doneTasks.length} complete</p>
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
            <h2 className="text-[11px] font-medium uppercase tracking-tight">Needs attention</h2>
            <p className="rounded-full bg-[#FFF0A3] px-2 py-1 text-[11px] font-semibold uppercase tracking-tight text-[#212121]">{overdueTasks.length} overdue</p>
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
          <h2 className="text-[11px] font-medium uppercase tracking-tight">PROJECTS</h2>
          <p className="text-[11px] font-medium uppercase tracking-tight">{activeProjects.length} ACTIVE</p>
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
