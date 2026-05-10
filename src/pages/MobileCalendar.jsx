import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DEMO_MODE } from './mobileConfig.js';
import { RangeTaskCard as SharedRangeTaskCard, TaskRow as SharedTaskRow } from './mobileComponents.jsx';

const modes = ['Week', 'Month', 'Year'];
const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const timeGroups = ['Morning', 'Afternoon', 'Evening', 'No time'];
const dayInMs = 24 * 60 * 60 * 1000;

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
  const startDay = Number(rangeMatch[1]);
  const endDay = Number(rangeMatch[2]);

  return {
    end: startOfDay(new Date(year, month, endDay)),
    start: startOfDay(new Date(year, month, startDay)),
  };
}

function getTaskDateRange(task, contextDate) {
  const inferred = getInferredTextRange(task, contextDate);
  const explicitStart = startOfDay(parseDateValue(task.startDate || task.start || task.dateStart));
  const explicitEnd = startOfDay(parseDateValue(task.endDate || task.end || task.dateEnd));
  const fallback = startOfDay(parseDateValue(task.dueDate || task.dueAt || task.date));
  const start = explicitStart || inferred?.start || fallback;
  const end = explicitEnd || inferred?.end || start;

  return { end, start };
}

function getTaskStartDate(task, contextDate) {
  return getTaskDateRange(task, contextDate).start;
}

function getTaskEndDate(task, contextDate) {
  return getTaskDateRange(task, contextDate).end;
}

function isRangeTask(task, contextDate) {
  const { end, start } = getTaskDateRange(task, contextDate);
  return Boolean(start && end && !isSameDay(start, end));
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

function taskOccursOnDate(task, date) {
  const start = getTaskStartDate(task, date);
  const end = getTaskEndDate(task, date) || start;
  const target = startOfDay(date);

  if (!start || !target) {
    return false;
  }

  return target >= start && target <= end;
}

function taskTouchesMonth(task, year, monthIndex) {
  const monthContext = new Date(year, monthIndex, 1);
  const start = getTaskStartDate(task, monthContext);
  const end = getTaskEndDate(task, monthContext) || start;

  if (!start) {
    return false;
  }

  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);
  return start <= monthEnd && end >= monthStart;
}

function getWeekDays(selectedDate) {
  const start = new Date(selectedDate);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  start.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function getMonthDays(selectedDate) {
  const first = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function getTasksForDate(tasks, date) {
  return tasks.filter((task) => taskOccursOnDate(task, date));
}

function isTaskDone(task) {
  const status = String(task.status || '').toLowerCase();
  return status === 'done' || status === 'completed';
}

function isTaskOverdue(task, today) {
  const end = getTaskEndDate(task, today) || getTaskStartDate(task, today);
  return end && end < today && !isTaskDone(task);
}

function getTaskTone(task, today) {
  const start = getTaskStartDate(task, today);

  if (isTaskDone(task)) {
    return 'bg-[#CFDECA]/20';
  }

  if (isTaskOverdue(task, today)) {
    return 'border-[#C2410C]/25 bg-[#FFF7ED]';
  }

  if (isSameDay(start, today)) {
    return 'border-[#FFF0A3] bg-white';
  }

  return 'bg-white';
}

function formatDateRange(start, end) {
  return `${start.toLocaleDateString([], { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
}

function formatSelectedDate(date) {
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatSelectedMonth(date) {
  return date.toLocaleDateString([], { month: 'long', year: 'numeric' });
}

function findProjectForItem(item = {}, projects = []) {
  return projects.find((project) => (
    (item.projectId && project.id === item.projectId) ||
    (item.projectName && project.name === item.projectName) ||
    (item.project && project.name === item.project)
  ));
}

function getItemText(item = {}) {
  return [item.projectName, item.project, item.client, item.title, item.notes, item.detail]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getProjectLabel(item = {}, projects = []) {
  const project = findProjectForItem(item, projects);
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
  const project = findProjectForItem(item, projects);
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

  const end = getTaskEndDate(task, date) || getTaskStartDate(task, date);
  const target = startOfDay(date);
  if (end && target && end < target) {
    return 'OVERDUE';
  }

  return taskOccursOnDate(task, date) && isRangeTask(task, date) ? 'IN PROGRESS' : 'PLANNED';
}

function getStateInfo(state) {
  if (state === 'DONE') {
    return { barClass: 'bg-[#CFDECA] text-[#212121]', chipClass: 'bg-[#CFDECA] text-[#212121]', Icon: CheckCircle, label: 'DONE', shortLabel: 'Done' };
  }

  if (state === 'OVERDUE') {
    return { barClass: 'bg-[#FFF0A3] text-[#212121]', chipClass: 'bg-[#FFF0A3] text-[#212121]', Icon: AlertCircle, label: 'OVERDUE', shortLabel: 'Overdue' };
  }

  if (state === 'IN PROGRESS') {
    return { barClass: 'bg-[#DBDFE9] text-[#212121]', chipClass: 'bg-[#DBDFE9] text-[#212121]', Icon: Clock, label: 'IN PROGRESS', shortLabel: 'Active' };
  }

  return { barClass: 'bg-[#F5F5FA] text-[#777777]', chipClass: 'bg-[#F5F5FA] text-[#777777]', Icon: Clock, label: 'PLANNED', shortLabel: 'Planned' };
}

function getPhaseInfo(item = {}, projects = []) {
  const phase = getPhaseLabel(item, projects);
  const phaseText = phase.toLowerCase();

  if (phaseText.includes('opening')) {
    return {
      barClass: 'bg-[#212121] text-white',
      chipClass: 'bg-[#212121] text-white',
      fillClass: 'bg-[#212121]',
      label: 'Opening',
      title: 'Opening',
    };
  }

  if (phaseText.includes('handover')) {
    return {
      barClass: 'bg-[#CFDECA] text-[#212121]',
      chipClass: 'bg-[#CFDECA] text-[#212121]',
      fillClass: 'bg-[#CFDECA]',
      label: 'Handover',
      title: 'Handover',
    };
  }

  if (phaseText.includes('construction')) {
    return {
      barClass: 'bg-[#FFF0A3] text-[#212121]',
      chipClass: 'bg-[#FFF0A3] text-[#212121]',
      fillClass: 'bg-[#FFF0A3]',
      label: 'Construction',
      title: 'Construction',
    };
  }

  if (phaseText.includes('general')) {
    return {
      barClass: 'bg-[#DBDFE9] text-[#212121]',
      chipClass: 'bg-[#DBDFE9] text-[#212121]',
      fillClass: 'bg-[#212121]',
      label: 'General',
      title: 'General',
    };
  }

  return {
    barClass: 'bg-[#DBDFE9] text-[#212121]',
    chipClass: 'bg-[#DBDFE9] text-[#212121]',
    fillClass: 'bg-[#212121]',
    label: 'Design',
    title: 'Design',
  };
}

function getRangeProgress(task, date) {
  const start = getTaskStartDate(task, date);
  const end = getTaskEndDate(task, date);
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

function getTaskTimeMinutes(task) {
  if (!task.startTime || !/^\d{1,2}:\d{2}$/.test(task.startTime)) {
    return null;
  }

  const [hours, minutes] = task.startTime.split(':').map(Number);
  return hours * 60 + minutes;
}

function getTaskTimeGroup(task) {
  const minutes = getTaskTimeMinutes(task);

  if (minutes === null) {
    return 'No time';
  }

  if (minutes < 12 * 60) {
    return 'Morning';
  }

  if (minutes < 18 * 60) {
    return 'Afternoon';
  }

  return 'Evening';
}

function getGroupedTasks(tasks) {
  return timeGroups.map((label) => ({
    label,
    tasks: tasks.filter((task) => getTaskTimeGroup(task) === label),
  }));
}

function getSelectedGroups(tasks, selectedDate, groupByState = false) {
  if (groupByState) {
    const order = ['OVERDUE', 'IN PROGRESS', 'PLANNED', 'DONE'];
    return order.map((label) => ({
      label,
      tasks: tasks.filter((task) => getStateLabel(task, selectedDate) === label),
      type: 'mixed',
    })).filter((group) => group.tasks.length);
  }

  const rangeTasks = tasks.filter((task) => isRangeTask(task, selectedDate) && !isTaskDone(task));
  const timedTasks = tasks.filter((task) => !isRangeTask(task, selectedDate) && !isTaskDone(task));
  const doneTasks = tasks.filter(isTaskDone);
  return [
    { label: 'In Progress', tasks: rangeTasks, type: 'range' },
    ...timeGroups.map((label) => ({ label, tasks: timedTasks.filter((task) => getTaskTimeGroup(task) === label), type: 'task' })),
    { label: 'Done', tasks: doneTasks, type: 'task' },
  ].filter((group) => group.tasks.length);
}

function Dot({ completed = false, count, selected = false }) {
  if (!count) {
    return null;
  }

  const colorClass = completed
    ? 'bg-[#CFDECA] opacity-100'
    : selected
      ? 'bg-[#FFF0A3]'
      : 'bg-[#212121]/65';

  return <span className={`mt-1 h-1.5 w-1.5 rounded-full ${colorClass}`} />;
}

export function MobileCalendar({ initialDate, onDeleteTask, onDoneTask, onDuplicateTask, onEditTask, onMoveTask, onOpenTask, projects = [], tasks }) {
  const modeOptions = DEMO_MODE ? modes : modes;
  const [mode, setMode] = useState('Week');
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(initialDate) || new Date());
  const [expandedTasks, setExpandedTasks] = useState([]);
  const [overflowSheet, setOverflowSheet] = useState(null);
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const monthDays = useMemo(() => getMonthDays(selectedDate), [selectedDate]);
  const selectedTasks = tasks.filter((task) => taskOccursOnDate(task, selectedDate));
  const selectedTaskList = useMemo(() => {
    const byId = new Map(selectedTasks.map((task) => [task.id || task.title, task]));
    expandedTasks.forEach((task) => byId.set(task.id || task.title, task));
    return Array.from(byId.values());
  }, [expandedTasks, selectedTasks]);
  const currentYear = selectedDate.getFullYear();
  const today = startOfDay(new Date());
  const selectedLabel = formatSelectedDate(selectedDate);
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];
  const weekTaskCount = tasks.filter((task) => weekDays.some((date) => taskOccursOnDate(task, date))).length;

  const shiftMonth = (offset) => {
    setExpandedTasks([]);
    setOverflowSheet(null);
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + offset, 1));
  };

  useEffect(() => {
    if (!overflowSheet) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOverflowSheet(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [overflowSheet]);

  return (
    <div className="page-fade pb-32">
      <div className="sticky top-0 z-30 grid grid-cols-3 rounded-full border border-[rgba(33,33,33,0.08)] bg-white/95 p-1 shadow-[0_10px_24px_rgba(33,33,33,0.04)] backdrop-blur-xl">
        {modeOptions.map((item) => (
          <button
            key={item}
            className={`h-10 rounded-full text-sm font-medium transition duration-[120ms] ease-out active:scale-95 ${mode === item ? 'bg-[#212121] text-[#F5F5FA]' : 'text-[#777777]'}`}
            type="button"
            onClick={() => setMode(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {mode === 'Week' && (
        <section className="mt-6">
          <div className="mb-5 rounded-[28px] border border-[rgba(33,33,33,0.08)] bg-white p-5">
            <p className="text-[11px] font-medium uppercase tracking-tight text-[#777777]">This week</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <h2 className="text-2xl font-semibold leading-tight text-[#212121]">{formatDateRange(weekStart, weekEnd)}</h2>
              <p className="shrink-0 text-right text-sm text-[#777777]">{weekTaskCount} {weekTaskCount === 1 ? 'task' : 'tasks'} this week</p>
            </div>
          </div>

          <WeekStrip selectedDate={selectedDate} selectedLabel={selectedLabel} setSelectedDate={setSelectedDate} tasks={tasks} today={today} weekDays={weekDays} />
          <GroupedTaskList onDeleteTask={onDeleteTask} onDoneTask={onDoneTask} onDuplicateTask={onDuplicateTask} onEditTask={onEditTask} onMoveTask={onMoveTask} onOpenTask={onOpenTask} projects={projects} selectedDate={selectedDate} selectedLabel={selectedLabel} tasks={selectedTasks} today={today} />
        </section>
      )}

      {mode === 'Month' && (
        <section className="mt-6">
          <div className="mb-4 flex items-center justify-between px-1">
            <button aria-label="Previous month" className="grid size-11 place-items-center rounded-full bg-white text-lg text-[#777777] transition duration-[120ms] ease-out active:scale-95" type="button" onClick={() => shiftMonth(-1)}>
              {'<'}
            </button>
            <p className="text-lg font-semibold text-[#212121]">{formatSelectedMonth(selectedDate)}</p>
            <button aria-label="Next month" className="grid size-11 place-items-center rounded-full bg-white text-lg text-[#777777] transition duration-[120ms] ease-out active:scale-95" type="button" onClick={() => shiftMonth(1)}>
              {'>'}
            </button>
          </div>

          <MonthGrid
            monthDays={monthDays}
            onOpenTask={onOpenTask}
            onShowMore={(date, hiddenTasks) => {
              const allItems = tasks.filter((task) => taskOccursOnDate(task, date));
              setSelectedDate(date);
              setExpandedTasks(hiddenTasks);
              setOverflowSheet({ date, tasks: allItems });
            }}
            projects={projects}
            selectedDate={selectedDate}
            setSelectedDate={(date) => {
              setExpandedTasks([]);
              setOverflowSheet(null);
              setSelectedDate(date);
            }}
            tasks={tasks}
            today={today}
          />

          <TaskList isExpanded={expandedTasks.length > 0} onDeleteTask={onDeleteTask} onDoneTask={onDoneTask} onDuplicateTask={onDuplicateTask} onEditTask={onEditTask} onMoveTask={onMoveTask} onOpenTask={onOpenTask} projects={projects} selectedDate={selectedDate} selectedLabel={selectedLabel} tasks={selectedTaskList} today={today} />
          <MonthLegend />
          {overflowSheet && (
            <OverflowSheet
              date={overflowSheet.date}
              onClose={() => setOverflowSheet(null)}
              onOpenTask={onOpenTask}
              projects={projects}
              tasks={overflowSheet.tasks}
            />
          )}
        </section>
      )}

      {mode === 'Year' && (
        <section className="mt-6 grid grid-cols-2 gap-3">
          {monthLabels.map((month, monthIndex) => {
            const monthTasks = tasks.filter((task) => taskTouchesMonth(task, currentYear, monthIndex));
            const monthContext = new Date(currentYear, monthIndex, 1);
            const rangeTasks = monthTasks.filter((task) => isRangeTask(task, monthContext));
            const phase = rangeTasks.length ? getPhaseInfo(rangeTasks[0], projects) : null;
            const progress = rangeTasks.length ? getRangeProgress(rangeTasks[0], today) || getRangeProgress(rangeTasks[0], monthContext) : null;
            const count = monthTasks.length;
            const hasOverdue = monthTasks.some((task) => isTaskOverdue(task, today));

            return (
              <button
                key={month}
                className="min-h-[118px] cursor-pointer rounded-[22px] border border-[rgba(33,33,33,0.08)] bg-white p-4 text-left transition duration-[120ms] ease-out active:scale-95 active:bg-[#DBDFE9]"
                type="button"
                onClick={() => {
                  setSelectedDate(new Date(currentYear, monthIndex, 1));
                  setMode('Month');
                }}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="block text-lg font-semibold text-[#212121]">{month}</span>
                  {phase && <span className={`size-2 rounded-full ${phase.fillClass}`} />}
                </span>
                <span className="mt-2 block text-sm text-[#777777]">{count} {count === 1 ? 'task' : 'tasks'}</span>
                <span className="mt-4 flex flex-wrap gap-1.5">
                  {count ? (
                    Array.from({ length: Math.min(count, 10) }, (_, index) => (
                      <span key={index} className={`size-1.5 rounded-full ${hasOverdue ? 'bg-[#FFF0A3]' : 'bg-[#DBDFE9]'}`} />
                    ))
                  ) : (
                    <span className="size-1.5 rounded-full bg-[#212121] opacity-[0.08]" />
                  )}
                </span>
                {!!progress && (
                  <span className="mt-4 block h-1.5 overflow-hidden rounded-full bg-[#DBDFE9]">
                    <span className={`block h-full rounded-full transition-[width] duration-300 ease-out ${phase.fillClass}`} style={{ width: `${progress.percent}%` }} />
                  </span>
                )}
              </button>
            );
          })}
        </section>
      )}
    </div>
  );
}

function WeekStrip({ selectedDate, selectedLabel, setSelectedDate, tasks, today, weekDays }) {
  return (
    <div className="sticky top-0 z-20 -mx-4 bg-[#F5F5FA]/85 px-4 py-3 backdrop-blur-xl">
      <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-tight text-[#777777]">
        Selected: <span className="text-[#212121]">{selectedLabel}</span>
      </p>
      <div className="flex gap-2 overflow-x-auto snap-x no-scrollbar">
        {weekDays.map((date) => {
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, today);
          const dayTasks = getTasksForDate(tasks, date);
          const taskCount = dayTasks.length;
          const completed = taskCount > 0 && dayTasks.every(isTaskDone);

          return (
            <button
              key={date.toISOString()}
              className={`flex min-h-14 shrink-0 snap-start cursor-pointer flex-col items-center justify-center rounded-[18px] px-4 py-3 transition duration-[120ms] ease-out active:scale-95 ${
                isSelected ? 'bg-[#212121] text-white' : 'bg-white text-[#212121]'
              }`}
              type="button"
              onClick={() => setSelectedDate(date)}
            >
              <span className={`text-[10px] uppercase tracking-tight ${isSelected ? 'text-white/60' : 'text-[#777777]'}`}>
                {dayLabels[date.getDay()]}
              </span>
              <span className={`${isSelected ? 'text-xl font-semibold' : 'text-sm font-medium'}`}>{date.getDate()}</span>
              <Dot completed={completed} count={taskCount} selected={isSelected} />
              {isToday && !isSelected && <span className="sr-only">Today</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthGrid({ monthDays, onOpenTask, onShowMore, projects, selectedDate, setSelectedDate, tasks, today }) {
  const weeks = Array.from({ length: 6 }, (_, index) => monthDays.slice(index * 7, index * 7 + 7));

  return (
    <div className="rounded-[28px] border border-[rgba(33,33,33,0.08)] bg-white px-3 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
      <div className="grid grid-cols-7">
        {dayLabels.map((label) => (
          <span key={label} className="grid min-h-8 place-items-center text-[10px] font-semibold uppercase tracking-tight text-[#777777]">
            {label.slice(0, 2)}
          </span>
        ))}
      </div>
      <div className="space-y-3">
        {weeks.map((week) => (
          <MonthWeekRow
            key={week[0].toISOString()}
            onOpenTask={onOpenTask}
            onShowMore={onShowMore}
            projects={projects}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            tasks={tasks}
            today={today}
            week={week}
          />
        ))}
      </div>
    </div>
  );
}

function MonthWeekRow({ onOpenTask, onShowMore, projects, selectedDate, setSelectedDate, tasks, today, week }) {
  const weekStart = week[0];
  const weekEnd = week[6];
  const overflowDate = selectedDate >= weekStart && selectedDate <= weekEnd
    ? selectedDate
    : week.find((date) => date.getMonth() === selectedDate.getMonth()) || weekStart;
  const allRangeSegments = tasks
    .filter((task) => {
      const start = getTaskStartDate(task, selectedDate);
      const end = getTaskEndDate(task, selectedDate);
      return isRangeTask(task, selectedDate) && start <= weekEnd && end >= weekStart;
    })
    .map((task, index) => {
      const start = getTaskStartDate(task, selectedDate);
      const end = getTaskEndDate(task, selectedDate);
      const segmentStartIndex = week.findIndex((date) => date >= start);
      const reverseEndIndex = [...week].reverse().findIndex((date) => date <= end);
      const endIndex = reverseEndIndex === -1 ? 6 : 6 - reverseEndIndex;
      return {
        endColumn: Math.max(1, endIndex + 1),
        lane: index,
        startColumn: Math.max(1, segmentStartIndex === -1 ? 1 : segmentStartIndex + 1),
        task,
      };
    });
  const rangeSegments = allRangeSegments.slice(0, 2);
  const hiddenTasks = allRangeSegments.slice(2).map((segment) => segment.task);
  const hiddenRangeCount = Math.max(0, allRangeSegments.length - rangeSegments.length);

  return (
    <div className="relative grid min-h-[98px] grid-cols-7">
      {week.map((date) => (
        <MonthDayCell
          key={date.toISOString()}
          date={date}
          isCurrentMonth={date.getMonth() === selectedDate.getMonth()}
          isSelected={isSameDay(date, selectedDate)}
          isToday={isSameDay(date, today)}
          onSelect={setSelectedDate}
          tasks={tasks}
        />
      ))}
      <div className="pointer-events-none absolute bottom-6 left-0 right-0 z-0 grid h-[42px] grid-cols-7 gap-y-1 opacity-90">
        {rangeSegments.map((segment) => (
          <WeekRangeSegment
            key={`${segment.task.id || segment.task.title}-${segment.startColumn}-${segment.endColumn}`}
            endColumn={segment.endColumn}
            lane={segment.lane}
            onOpenTask={onOpenTask}
            onSelect={setSelectedDate}
            projects={projects}
            selectedDate={selectedDate}
            startColumn={segment.startColumn}
            task={segment.task}
            week={week}
          />
        ))}
      </div>
      {!!hiddenRangeCount && (
        <button
          className="absolute bottom-1 left-1 z-20 min-h-5 rounded-full border border-black/5 bg-[#F5F5FA] px-2 py-0.5 text-[10px] font-medium text-[#777777] transition-all duration-150 active:scale-[0.98]"
          type="button"
          onClick={() => onShowMore?.(overflowDate, hiddenTasks)}
        >
          +{hiddenRangeCount} more
        </button>
      )}
    </div>
  );
}

function MonthDayCell({ date, isCurrentMonth, isSelected, isToday, onSelect, tasks }) {
  const dayTasks = getTasksForDate(tasks, date);
  const singleDayTasks = dayTasks.filter((task) => !isRangeTask(task, date));
  const hasRangeTask = dayTasks.some((task) => isRangeTask(task, date));
  const completed = singleDayTasks.length > 0 && singleDayTasks.every(isTaskDone);
  const visibleDotCount = Math.min(3, singleDayTasks.length);

  return (
    <div className={`pointer-events-none relative z-10 flex min-h-[98px] w-full flex-col items-center gap-1 rounded-[14px] p-1 text-center ${isCurrentMonth ? 'text-[#212121]' : 'text-[#c0c0c0]'}`}>
      <button
        className="pointer-events-auto relative z-10 flex h-6 w-full cursor-pointer items-center justify-center rounded-[14px] transition duration-[120ms] ease-out active:scale-95"
        type="button"
        onClick={() => onSelect(date)}
      >
        <span className="z-10">
          {isSelected ? (
            <span className="flex h-7 w-7 scale-105 items-center justify-center rounded-full bg-black text-xs text-white shadow-md">
              {date.getDate()}
            </span>
          ) : (
            <span className={`text-sm ${isToday ? 'flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(33,33,33,0.16)] font-medium text-[#212121]' : ''}`}>
              {date.getDate()}
            </span>
          )}
        </span>
      </button>
      <div className="mt-1 flex min-h-[18px] flex-col items-center gap-1">
        {!!singleDayTasks.length && !hasRangeTask && singleDayTasks.length <= 3 && (
          <span className="flex items-center justify-center gap-0.5">
            {Array.from({ length: visibleDotCount }, (_, index) => (
              <span key={index} className={`h-1.5 w-1.5 rounded-full opacity-60 ${completed ? 'bg-[#CFDECA]' : isSelected ? 'bg-[#FFF0A3]' : 'bg-[#212121]'}`} />
            ))}
          </span>
        )}
        {!!singleDayTasks.length && !hasRangeTask && singleDayTasks.length > 3 && (
          <span className="text-[9px] font-semibold text-[#777777] opacity-70">3+</span>
        )}
      </div>
    </div>
  );
}

function WeekRangeSegment({ endColumn, lane, onOpenTask, onSelect, projects, selectedDate, startColumn, task, week }) {
  const projectLabel = getProjectLabel(task, projects);
  const shortTitle = projectLabel.split(/\s+/).filter(Boolean).slice(0, 2).join(' ') || projectLabel;
  const state = getStateInfo(getStateLabel(task, selectedDate));
  const label = endColumn - startColumn >= 2 ? `${projectLabel} \u00b7 ${state.shortLabel}` : `${shortTitle} \u00b7 ${state.shortLabel}`;
  const targetDate = week[startColumn - 1] || selectedDate;
  const doneClass = isTaskDone(task) ? 'opacity-60' : 'opacity-95';

  return (
    <div
      className={`pointer-events-auto relative z-0 flex h-3 min-w-0 items-center overflow-hidden rounded-full border border-black/5 px-2 text-left text-[10px] font-medium leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] transition-all duration-150 active:scale-[0.98] ${state.barClass} ${doneClass}`}
      role="button"
      style={{ gridColumn: `${startColumn} / ${endColumn + 1}`, gridRow: lane + 1 }}
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(targetDate);
        onOpenTask?.(task);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(targetDate);
          onOpenTask?.(task);
        }
      }}
    >
      <span className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#212121]/70" />
      <span className="absolute right-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#212121]/70" />
      <span className="min-w-0 truncate whitespace-nowrap pl-2">
        {label}
      </span>
    </div>
  );
}

function OverflowSheet({ date, onClose, onOpenTask, projects, tasks }) {
  const label = formatSelectedDate(date);
  const groups = getSelectedGroups(tasks, date, true);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/20 px-0 transition-opacity duration-150">
      <button aria-label="Close overflow sheet" className="absolute inset-0 cursor-default" type="button" onClick={onClose} />
      <div className="relative z-10 max-h-[70dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[32px] bg-white p-5 shadow-[0_-12px_32px_rgba(0,0,0,0.12)] transition-all duration-150">
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[rgba(33,33,33,0.12)]" />
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold text-[#212121]">{label}</h3>
            <p className="mt-1 text-sm font-medium text-[#777777]">{tasks.length} {tasks.length === 1 ? 'item' : 'items'}</p>
          </div>
          <button className="min-h-11 rounded-full bg-[#F5F5FA] px-4 text-sm font-semibold text-[#212121] transition-all duration-150 active:scale-[0.98]" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="space-y-5 pb-4">
          {groups.map((group) => (
            <section key={group.label}>
              <h4 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-tight text-[#777777]">{group.label}</h4>
              <div className="space-y-3">
                {group.tasks.map((task) => (
                  isRangeTask(task, date) ? (
                    <SharedRangeTaskCard key={task.id} projects={projects} selectedDate={date} task={task} onOpenTask={onOpenTask} />
                  ) : (
                    <OverflowTaskRow key={task.id} date={date} projects={projects} task={task} onOpenTask={onOpenTask} />
                  )
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function OverflowTaskRow({ date, onOpenTask, projects, task }) {
  const projectLabel = getProjectLabel(task, projects);
  const phase = getPhaseInfo(task, projects);
  const state = getStateInfo(getStateLabel(task, date));
  const StateIcon = state.Icon;

  return (
    <button
      className="w-full rounded-2xl border border-black/5 bg-white p-4 text-left shadow-sm transition-all duration-150 active:scale-[0.98] active:bg-[#F5F5FA]"
      type="button"
      onClick={() => onOpenTask?.(task)}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-[#212121]">{task.title || projectLabel}</span>
          <span className="mt-1 block truncate text-xs font-medium text-[#777777]">{projectLabel} · Phase: {phase.label}</span>
          <span className="mt-2 block text-xs font-medium text-[#777777]">{task.startTime || formatSelectedDate(date)}</span>
        </span>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-tight ${state.chipClass}`}>
          <StateIcon className="size-3" aria-hidden="true" />
          {state.label}
        </span>
      </span>
    </button>
  );
}

function GroupedTaskList({ onDeleteTask, onDoneTask, onDuplicateTask, onEditTask, onMoveTask, onOpenTask, projects, selectedDate, selectedLabel, tasks, today }) {
  const groups = getGroupedTasks(tasks).filter((group) => group.tasks.length);

  return (
    <div className="mt-8 transition-all duration-200">
      <p className="sticky top-0 z-10 mb-1 bg-[#F5F5FA]/85 px-1 py-2 text-[11px] font-medium uppercase tracking-tight text-[#777777] backdrop-blur-xl">
        Selected: <span className="text-[#212121]">{selectedLabel}</span>
      </p>
      {groups.length ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.label}>
              <h3 className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-tight text-[#777777]">{group.label}</h3>
              <div className="space-y-3">
                {group.tasks.map((task) => (
                  isRangeTask(task, selectedDate) ? (
                    <SharedRangeTaskCard key={task.id} projects={projects} selectedDate={selectedDate} task={task} onOpenTask={onOpenTask} />
                  ) : (
                    <SharedTaskRow key={task.id} projects={projects} task={task} today={today} toneClass={getTaskTone(task, today)} onDeleteTask={onDeleteTask} onDoneTask={onDoneTask} onDuplicateTask={onDuplicateTask} onEditTask={onEditTask} onMoveTask={onMoveTask} onOpenTask={onOpenTask} />
                  )
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyDay />
      )}
    </div>
  );
}

function TaskList({ isExpanded = false, onDeleteTask, onDoneTask, onDuplicateTask, onEditTask, onMoveTask, onOpenTask, projects, selectedDate, selectedLabel, tasks, today }) {
  const groups = getSelectedGroups(tasks, selectedDate, isExpanded);

  return (
    <div className="mt-4 transition-all duration-200">
      <p className="sticky top-0 z-10 mb-1 bg-[#F5F5FA]/85 px-1 py-2 text-[11px] font-medium uppercase tracking-tight text-[#777777] backdrop-blur-xl">
        {isExpanded ? 'All items on ' : 'Selected: '}<span className="text-[#212121]">{selectedLabel}</span>
      </p>
      {groups.length ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.label}>
              <h3 className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-tight text-[#777777]">{group.label}</h3>
              <div className="space-y-3">
                {group.tasks.map((task) => (
                  group.type === 'range' || (group.type === 'mixed' && isRangeTask(task, selectedDate)) ? (
                    <SharedRangeTaskCard key={task.id} projects={projects} selectedDate={selectedDate} task={task} onOpenTask={onOpenTask} />
                  ) : (
                    <SharedTaskRow key={task.id} projects={projects} selectedDate={selectedDate} task={task} today={today} toneClass={getTaskTone(task, today)} onDeleteTask={onDeleteTask} onDoneTask={onDoneTask} onDuplicateTask={onDuplicateTask} onEditTask={onEditTask} onMoveTask={onMoveTask} onOpenTask={onOpenTask} />
                  )
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyDay />
      )}
    </div>
  );
}

function MonthLegend() {
  const items = [
    ['Range', 'bg-[#DBDFE9]'],
    ['In Progress', 'bg-[#DBDFE9]'],
    ['Planned', 'bg-[#F5F5FA] border border-black/10'],
    ['Done', 'bg-[#CFDECA]'],
    ['Overdue', 'bg-[#FFF0A3]'],
    ['Selected', 'bg-[#212121]'],
  ];

  return (
    <div className="mt-5 flex flex-wrap gap-2 rounded-[20px] bg-white/70 px-3 py-3 text-[10px] font-medium text-[#777777] opacity-70">
      {items.map(([label, colorClass]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${colorClass}`} />
          {label}
        </span>
      ))}
    </div>
  );
}

function EmptyDay() {
  return (
    <p className="rounded-[24px] bg-white px-4 py-5 text-xs text-[#777777]">
      Nothing scheduled today.
    </p>
  );
}
