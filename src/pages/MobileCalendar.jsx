import { useMemo, useState } from 'react';

const modes = ['Week', 'Month', 'Year'];
const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

function getTaskStartDate(task) {
  return startOfDay(parseDateValue(task.startDate || task.dueDate || task.dueAt || task.date));
}

function getTaskEndDate(task) {
  return startOfDay(parseDateValue(task.endDate || task.startDate || task.dueDate || task.dueAt || task.date));
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
  const start = getTaskStartDate(task);
  const end = getTaskEndDate(task) || start;
  const target = startOfDay(date);

  if (!start || !target) {
    return false;
  }

  return target >= start && target <= end;
}

function taskTouchesMonth(task, year, monthIndex) {
  const start = getTaskStartDate(task);
  const end = getTaskEndDate(task) || start;

  if (!start) {
    return false;
  }

  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);
  return start <= monthEnd && end >= monthStart;
}

function formatTaskRange(task) {
  const start = getTaskStartDate(task);
  const end = getTaskEndDate(task) || start;

  if (!start) {
    return '';
  }

  if (!end || isSameDay(start, end)) {
    return start.toLocaleDateString([], { day: 'numeric', month: 'short' });
  }

  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${start.getDate()}-${end.getDate()} ${end.toLocaleDateString([], { month: 'short' })}`;
  }

  return `${start.toLocaleDateString([], { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
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

function countTasksForDate(tasks, date) {
  return tasks.filter((task) => taskOccursOnDate(task, date)).length;
}

function getTasksForDate(tasks, date) {
  return tasks.filter((task) => taskOccursOnDate(task, date));
}

function isTaskDone(task) {
  return task.status === 'done';
}

function isTaskOverdue(task, today) {
  const end = getTaskEndDate(task) || getTaskStartDate(task);
  return end && end < today && !isTaskDone(task);
}

function formatDateRange(start, end) {
  return `${start.toLocaleDateString([], { month: 'short', day: 'numeric' })} — ${end.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
}

function Dot({ count, overdue = false, selected = false }) {
  if (!count) {
    return <span className="block h-1.5" />;
  }

  return (
    <span
      className={`mx-auto block h-2 w-2 rounded-full ${selected ? 'bg-white/70' : overdue ? 'bg-[#FFF0A3]' : 'bg-[#212121]'}`}
      style={{ opacity: Math.min(0.7 + count * 0.05, 1) }}
    />
  );
}

export function MobileCalendar({ onDoneTask, onOpenTask, tasks }) {
  const [mode, setMode] = useState('Week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const monthDays = useMemo(() => getMonthDays(selectedDate), [selectedDate]);
  const selectedTasks = tasks.filter((task) => taskOccursOnDate(task, selectedDate));
  const currentYear = selectedDate.getFullYear();
  const today = startOfDay(new Date());
  const selectedLabel = selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];
  const weekTaskCount = tasks.filter((task) => weekDays.some((date) => taskOccursOnDate(task, date))).length;

  const shiftMonth = (offset) => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + offset, 1));
  };

  return (
    <div className="page-fade">
      <div className="grid grid-cols-3 rounded-full border border-[rgba(33,33,33,0.08)] bg-white p-1">
        {modes.map((item) => (
          <button
            key={item}
            className={`h-10 rounded-full text-sm font-medium transition-all duration-100 active:scale-95 ${mode === item ? 'bg-[#212121] text-[#F5F5FA]' : 'text-[#777777]'}`}
            type="button"
            onClick={() => setMode(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {mode === 'Week' && (
        <section className="mt-8">
          <div className="mb-5 rounded-[28px] border border-[rgba(33,33,33,0.08)] bg-white p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#777777]">This week</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <h2 className="text-2xl font-semibold leading-tight text-[#212121]">{formatDateRange(weekStart, weekEnd)}</h2>
              <p className="shrink-0 text-right text-sm text-[#777777]">{weekTaskCount} {weekTaskCount === 1 ? 'task' : 'tasks'} this week</p>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((date) => {
              const isSelected = isSameDay(date, selectedDate);
              const isToday = isSameDay(date, today);
              const dayTasks = getTasksForDate(tasks, date);
              const taskCount = dayTasks.length;
              const hasOverdue = dayTasks.some((task) => isTaskOverdue(task, today));
              return (
                <button
                  key={date.toISOString()}
                  className={`h-[72px] rounded-[22px] transition-transform duration-100 active:scale-95 ${
                    isSelected
                      ? 'bg-[#212121] text-white'
                      : isToday
                        ? 'border border-[rgba(33,33,33,0.08)] bg-white text-[#212121]'
                        : 'bg-white text-[#212121]'
                  }`}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                >
                  <div className="flex h-[72px] flex-col items-center justify-center gap-1 rounded-[22px]">
                    <span className={`text-[10px] uppercase tracking-[0.2em] ${isSelected ? 'text-white/60' : 'text-[#777777]'}`}>
                      {dayLabels[date.getDay()]}
                    </span>
                    <span className={`${isSelected ? 'text-xl font-semibold' : 'text-sm font-medium'}`}>{date.getDate()}</span>
                    <Dot count={taskCount} overdue={hasOverdue} selected={isSelected} />
                    {isToday && !isSelected && <span className="sr-only">Today</span>}
                  </div>
                </button>
              );
            })}
          </div>
          <TaskList onDoneTask={onDoneTask} onOpenTask={onOpenTask} selectedLabel={selectedLabel} tasks={selectedTasks} />
        </section>
      )}

      {mode === 'Month' && (
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between px-1">
            <button className="grid size-10 place-items-center rounded-full border border-[rgba(33,33,33,0.08)] bg-white text-lg text-[#777777] transition-all duration-100 active:scale-95" type="button" onClick={() => shiftMonth(-1)}>
              ‹
            </button>
            <p className="text-lg font-semibold">{selectedDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}</p>
            <button className="grid size-10 place-items-center rounded-full border border-[rgba(33,33,33,0.08)] bg-white text-lg text-[#777777] transition-all duration-100 active:scale-95" type="button" onClick={() => shiftMonth(1)}>
              ›
            </button>
          </div>
          <div className="rounded-[28px] border border-[rgba(33,33,33,0.08)] bg-white px-3 py-4">
            <div className="grid grid-cols-7 gap-y-3">
            {monthDays.map((date) => {
              const isSelected = isSameDay(date, selectedDate);
              const isToday = isSameDay(date, today);
              const dayTasks = getTasksForDate(tasks, date);
              const taskCount = dayTasks.length;
              const hasOverdue = dayTasks.some((task) => isTaskOverdue(task, today));
              const isRangeDate = dayTasks.some((task) => {
                const start = getTaskStartDate(task);
                const end = getTaskEndDate(task);
                return start && end && !isSameDay(start, end);
              });
              return (
                <button
                  key={date.toISOString()}
                  className={`min-h-12 cursor-pointer rounded-[16px] text-center text-sm transition-all duration-100 active:scale-95 ${isRangeDate ? 'bg-[#DBDFE9]/60' : ''} ${date.getMonth() === selectedDate.getMonth() ? 'text-[#212121]' : 'text-[#c0c0c0]'}`}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                >
                  <span
                    className={`mx-auto grid size-8 place-items-center rounded-full ${
                      isSelected
                        ? 'bg-[#212121] font-medium text-[#F5F5FA]'
                        : isToday
                          ? 'border border-[rgba(33,33,33,0.08)] bg-[#F5F5FA] font-medium text-[#212121]'
                          : ''
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  <Dot count={taskCount} overdue={hasOverdue} selected={isSelected} />
                </button>
              );
            })}
            </div>
          </div>
          <TaskList onDoneTask={onDoneTask} onOpenTask={onOpenTask} selectedLabel={selectedLabel} tasks={selectedTasks} />
        </section>
      )}

      {mode === 'Year' && (
        <section className="mt-8 grid grid-cols-2 gap-3">
          {monthLabels.map((month, monthIndex) => {
            const monthTasks = tasks.filter((task) => taskTouchesMonth(task, currentYear, monthIndex));
            const count = monthTasks.length;
            const hasOverdue = monthTasks.some((task) => isTaskOverdue(task, today));

            return (
              <button
                key={month}
                className="min-h-[118px] cursor-pointer rounded-[22px] border border-[rgba(33,33,33,0.08)] bg-white p-4 text-left transition-all duration-100 active:scale-95 active:bg-[#DBDFE9]"
                type="button"
                onClick={() => {
                  setSelectedDate(new Date(currentYear, monthIndex, 1));
                  setMode('Month');
                }}
              >
                <span className="block text-lg font-semibold text-[#212121]">{month}</span>
                <span className="mt-2 block text-sm text-[#777777]">{count} {count === 1 ? 'task' : 'tasks'}</span>
                <span className="mt-4 flex gap-1">
                  {count ? (
                    Array.from({ length: Math.min(count, 6) }, (_, index) => (
                      <span key={index} className={`size-1.5 rounded-full ${hasOverdue ? 'bg-[#FFF0A3]' : 'bg-[#212121]'}`} style={{ opacity: Math.min(0.35 + count * 0.08, 1) }} />
                    ))
                  ) : (
                    <span className="size-1.5 rounded-full bg-[#212121] opacity-[0.08]" />
                  )}
                </span>
              </button>
            );
          })}
        </section>
      )}
    </div>
  );
}

function TaskList({ onDoneTask, onOpenTask, selectedLabel, tasks }) {
  return (
    <div className="mt-8 transition-all duration-200">
      <p className="mb-3 px-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#777777]">
        Selected: <span className="text-[#212121]">{selectedLabel}</span>
      </p>
      {tasks.map((task) => (
        <div key={task.id} className={`mb-3 flex gap-3 rounded-[22px] border border-[rgba(33,33,33,0.08)] px-4 py-4 transition-all duration-150 active:bg-[#DBDFE9] ${task.status === 'done' ? 'bg-[#CFDECA]/40 opacity-[0.55] transition-opacity duration-200' : 'bg-white'}`}>
          <button
            aria-label={task.status === 'done' ? 'Task done' : 'Mark task done'}
            className={`mt-1 grid size-5 shrink-0 scale-110 place-items-center rounded-full border transition-all duration-100 active:scale-95 ${
              task.status === 'done' ? 'border-[#212121] bg-[#212121]' : 'border-[#777777]'
            }`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (task.status !== 'done') {
                onDoneTask?.(task);
              }
            }}
          >
            {task.status === 'done' && (
              <svg aria-hidden="true" className="h-3 w-3 text-[#F5F5FA]" fill="none" viewBox="0 0 12 12">
                <path d="M3 6.1 5.1 8 9.2 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
              </svg>
            )}
          </button>
          <button
            className="min-h-[56px] min-w-0 flex-1 cursor-pointer text-left transition-all duration-100 active:scale-95"
            type="button"
            onClick={() => onOpenTask?.(task)}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#777777]">
              {task.projectName || 'Studio'} {task.startTime ? `/ ${task.startTime}` : `/ ${formatTaskRange(task)}`}
            </p>
            <p className={`mt-1 text-[17px] font-medium ${task.status === 'done' ? 'line-through decoration-[#212121]/60' : ''}`}>{task.title}</p>
            {(task.notes || task.detail) && <p className={`mt-1 truncate text-sm text-[#777777] ${task.status === 'done' ? 'line-through decoration-[#777777]/60' : ''}`}>{task.notes || task.detail}</p>}
          </button>
        </div>
      ))}
      {!tasks.length && <p className="rounded-[24px] border border-[rgba(33,33,33,0.08)] bg-white px-4 py-5 text-sm text-[#777777]">No tasks for this day.</p>}
    </div>
  );
}
