import { Briefcase, CalendarDays, CheckCircle, Clock } from 'lucide-react';
import { useState } from 'react';
import { DEMO_MODE } from './mobileConfig.js';
import { ProgressBar } from './mobileComponents.jsx';
import {
  formatDaysLeftFromEnd,
  getPhaseInfo,
  getPhaseLabel,
  getProjectLabel,
  isTaskDone,
  parseDateValue,
  startOfDay,
} from './mobileUtils.js';

const dayInMs = 24 * 60 * 60 * 1000;

function formatDate(date) {
  return date ? date.toLocaleDateString([], { day: 'numeric', month: 'short' }) : 'Not set';
}

function formatRange(start, end) {
  if (!start && !end) {
    return 'Not scheduled';
  }

  if (!end || start?.toDateString() === end.toDateString()) {
    return formatDate(start);
  }

  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${start.toLocaleDateString([], { month: 'short' })} ${start.getDate()} - ${end.getDate()}`;
  }

  return `${formatDate(start)} - ${formatDate(end)}`;
}

function getStatusLabel(project, start, end) {
  const status = String(project.status || '').toLowerCase();
  const today = startOfDay(new Date());

  if (status.includes('done') || status.includes('complete')) {
    return 'DONE';
  }

  if (status.includes('overdue')) {
    return 'OVERDUE';
  }

  if (status.includes('planned')) {
    return 'PLANNED';
  }

  if (status.includes('progress') || (start && end && today >= start && today <= end)) {
    return 'IN PROGRESS';
  }

  return 'PLANNED';
}

function getStatusClass(status) {
  if (status === 'DONE') {
    return 'bg-[#CFDECA] text-[#212121]';
  }

  if (status === 'IN PROGRESS') {
    return 'bg-[#DBDFE9] text-[#212121]';
  }

  if (status === 'OVERDUE') {
    return 'bg-[#FFF0A3] text-[#212121]';
  }

  return 'bg-[#F5F5FA] text-[#777777]';
}

function getStatusIcon(status) {
  if (status === 'DONE') {
    return CheckCircle;
  }

  return Clock;
}

function getTaskDate(task) {
  return parseDateValue(task.startDate || task.dueDate || task.dueAt || task.date);
}

function getProjectTasks(project, tasks) {
  const label = getProjectLabel(project);
  return tasks.filter((task) => {
    const taskProject = getProjectLabel(task);
    return task.projectId === project.id || task.projectName === project.name || task.project === project.name || taskProject === label;
  });
}

function getDisplayTasks(project, tasks) {
  return getProjectTasks(project, tasks).filter((task) => task.type !== 'phase');
}

function getProjectDateRange(project, tasks) {
  const projectTasks = getProjectTasks(project, tasks);
  const starts = [
    parseDateValue(project.startDate),
    ...projectTasks.map((task) => parseDateValue(task.startDate || task.start || task.dateStart || task.dueDate || task.date)),
  ].filter(Boolean);
  const ends = [
    parseDateValue(project.endDate || project.openingDate || project.handoverDate),
    ...projectTasks.map((task) => parseDateValue(task.endDate || task.end || task.dateEnd || task.startDate || task.dueDate || task.date)),
  ].filter(Boolean);

  if (!starts.length) {
    return { end: null, start: null };
  }

  const safeEnds = ends.length ? ends : starts;

  return {
    end: startOfDay(new Date(Math.max(...safeEnds.map((date) => date.getTime())))),
    start: startOfDay(new Date(Math.min(...starts.map((date) => date.getTime())))),
  };
}

function getProjectProgress(project, start, end) {
  const explicitProgress = Number(project.progress ?? project.progressPercent);

  if (Number.isFinite(explicitProgress)) {
    return Math.min(100, Math.max(0, explicitProgress));
  }

  const label = getProjectLabel(project).toLowerCase();
  if (label.includes('karun phuket')) {
    return 35;
  }
  if (label.includes('karun central westville')) {
    return 50;
  }
  if (label.includes('ultimate bkk')) {
    return 12;
  }

  const today = startOfDay(new Date());
  if (!start || !end || !today) {
    return 0;
  }

  const totalDays = Math.max(1, Math.round((end - start) / dayInMs) + 1);
  const elapsedDays = Math.min(totalDays, Math.max(0, Math.round((today - start) / dayInMs) + 1));
  return Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
}

function getNextTaskLabel(tasks) {
  const today = startOfDay(new Date());
  const nextTask = tasks
    .filter((task) => !isTaskDone(task))
    .map((task) => ({ date: startOfDay(getTaskDate(task)), task }))
    .filter((item) => item.date && item.date >= today)
    .sort((left, right) => left.date - right.date)[0];

  return nextTask ? formatDate(nextTask.date) : 'None';
}

function ProjectCard({ onSelect, project, tasks }) {
  const projectTasks = getDisplayTasks(project, tasks);
  const phase = getPhaseLabel(project);
  const phaseInfo = getPhaseInfo(phase);
  const projectLabel = getProjectLabel(project);
  const { end, start } = getProjectDateRange(project, tasks);
  const status = getStatusLabel(project, start, end);
  const StatusIcon = getStatusIcon(status);
  const progress = Math.round(getProjectProgress(project, start, end));
  const doneCount = projectTasks.filter(isTaskDone).length;

  return (
    <button
      className="w-full rounded-[26px] border border-black/5 bg-white p-4 text-left shadow-sm transition duration-[120ms] ease-out active:scale-[0.98] active:bg-[#F5F5FA]"
      type="button"
      onClick={() => onSelect(project.id)}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#DBDFE9] text-xs font-bold uppercase text-[#212121]">
            <Briefcase className="size-4 text-[#777777]" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[17px] font-semibold leading-snug text-[#212121]">{projectLabel}</span>
            <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-tight ${phaseInfo.chipClass}`}>
              {phase}
            </span>
          </span>
        </span>
        <span className="shrink-0 text-lg font-semibold text-[#212121]">{progress}%</span>
      </span>

      <span className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-[#777777]">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-tight ${getStatusClass(status)}`}>
          <StatusIcon className="size-3" aria-hidden="true" />
          {status}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          {formatRange(start, end)}
        </span>
        <span>{formatDaysLeftFromEnd(end)}</span>
      </span>

      <span className="mt-4 block">
        <ProgressBar fillClass={phaseInfo.fillClass} progress={progress} />
      </span>

      <span className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-medium text-[#777777]">
        <span>{projectTasks.length} tasks</span>
        <span>{doneCount} done</span>
        <span>Next: {getNextTaskLabel(projectTasks)}</span>
      </span>
    </button>
  );
}

function ProjectDetail({ notes, onBack, project, tasks }) {
  const projectTasks = getDisplayTasks(project, tasks);
  const projectNotes = notes.filter((note) => note.projectId === project.id || note.projectName === project.name);
  const phase = getPhaseLabel(project);
  const phaseInfo = getPhaseInfo(phase);
  const projectLabel = getProjectLabel(project);
  const { end, start } = getProjectDateRange(project, tasks);
  const status = getStatusLabel(project, start, end);
  const StatusIcon = getStatusIcon(status);
  const progress = Math.round(getProjectProgress(project, start, end));
  const timeline = [
    ['Start', project.startDate],
    ['Design complete', project.designCompleteDate],
    ['Handover', project.handoverDate],
    ['Opening', project.openingDate],
    ['End', project.endDate],
  ].filter((item) => item[1]);

  return (
    <div className="page-fade pb-28">
      <button className="rounded-full border border-black/5 bg-white px-4 py-2 text-[11px] font-medium uppercase tracking-tight text-[#777777] transition duration-[120ms] ease-out active:scale-95" type="button" onClick={onBack}>
        Projects
      </button>

      <div className="mt-6 rounded-[28px] border border-black/5 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-3xl font-bold leading-tight text-[#212121]">{projectLabel}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-tight ${phaseInfo.chipClass}`}>Phase: {phase}</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-tight ${getStatusClass(status)}`}>
                <StatusIcon className="size-3" aria-hidden="true" />
                {status}
              </span>
            </div>
          </div>
          <span className="shrink-0 text-xl font-semibold text-[#212121]">{progress}%</span>
        </div>
        <div className="mt-5 space-y-2 text-sm text-[#777777]">
          <p className="flex items-center gap-1.5">
            <CalendarDays className="size-4" aria-hidden="true" />
            Date Range: <span className="font-medium text-[#212121]">{formatRange(start, end)}</span>
          </p>
          <p>{projectTasks.length} {projectTasks.length === 1 ? 'task' : 'tasks'} - {projectTasks.filter(isTaskDone).length} done</p>
          <ProgressBar fillClass={phaseInfo.fillClass} progress={progress} />
        </div>
      </div>

      <section className="mt-6">
        <h3 className="mb-2 px-1 text-[11px] font-medium uppercase tracking-tight text-[#777777]">Tasks</h3>
        {projectTasks.map((task) => {
          const date = getTaskDate(task);
          return (
            <div key={task.id} className="mb-3 rounded-[22px] border border-black/5 bg-white px-4 py-3 shadow-sm">
              <p className="line-clamp-1 text-[17px] font-medium text-[#212121]">{task.title}</p>
              <p className="mt-1 text-sm font-medium text-[#777777]">{projectLabel} - {getPhaseLabel({ ...task, projectStatus: project.status })}</p>
              <p className="mt-1 line-clamp-1 text-sm text-[#777777]">{date ? date.toLocaleDateString([], { dateStyle: 'medium' }) : task.notes || task.detail}</p>
            </div>
          );
        })}
        {!projectTasks.length && <p className="rounded-[24px] border border-black/5 bg-white px-4 py-5 text-sm text-[#777777]">No tasks yet.</p>}
      </section>

      <section className="mt-6">
        <h3 className="mb-2 px-1 text-[11px] font-medium uppercase tracking-tight text-[#777777]">Notes</h3>
        {projectNotes.map((note) => (
          <p key={note.id} className="mb-3 rounded-[24px] border border-black/5 bg-white px-4 py-4 text-sm leading-6 text-[#777777] shadow-sm">
            {note.body || note.text || note.title}
          </p>
        ))}
        {!projectNotes.length && <p className="rounded-[24px] border border-black/5 bg-white px-4 py-5 text-sm text-[#777777]">{project.notes || 'Notes placeholder.'}</p>}
      </section>

      <section className="mt-6">
        <h3 className="mb-2 px-1 text-[11px] font-medium uppercase tracking-tight text-[#777777]">Timeline</h3>
        {timeline.map(([label, value]) => (
          <div key={label} className="mb-3 flex justify-between rounded-[24px] border border-black/5 bg-white px-4 py-3 shadow-sm">
            <p className="text-sm text-[#777777]">{label}</p>
            <p className="text-sm font-medium text-[#212121]">{value}</p>
          </div>
        ))}
        {!timeline.length && <p className="rounded-[24px] border border-black/5 bg-white px-4 py-5 text-sm text-[#777777]">Timeline placeholder.</p>}
      </section>
    </div>
  );
}

function getGroupedProjects(projects, tasks) {
  const groups = {
    OVERDUE: [],
    'IN PROGRESS': [],
    PLANNED: [],
    DONE: [],
  };

  projects.forEach((project) => {
    const { end, start } = getProjectDateRange(project, tasks);
    const status = getStatusLabel(project, start, end);
    groups[status].push(project);
  });

  return groups;
}

export function MobileProjects({ notes, onSelectProject, projects, selectedProjectId, tasks }) {
  const [localSelectedProjectId, setLocalSelectedProjectId] = useState('');
  const currentSelectedProjectId = selectedProjectId ?? localSelectedProjectId;
  const setSelectedProjectId = onSelectProject || setLocalSelectedProjectId;
  const selectedProject = projects.find((project) => project.id === currentSelectedProjectId);
  const groupedProjects = getGroupedProjects(projects, tasks);
  const visibleGroupedProjects = DEMO_MODE ? groupedProjects : groupedProjects;

  if (selectedProject) {
    return (
      <ProjectDetail
        notes={notes}
        project={selectedProject}
        tasks={tasks}
        onBack={() => setSelectedProjectId('')}
      />
    );
  }

  return (
    <div className="page-fade pb-28">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-5xl font-bold lowercase leading-none tracking-[-0.02em] text-[#212121]">projects</h2>
        <p className="text-[11px] font-medium uppercase tracking-tight text-[#777777]">
          {projects.length} total
        </p>
      </div>

      <div className="mt-6 space-y-7">
        {Object.entries(visibleGroupedProjects).map(([label, groupProjects]) => (
          groupProjects.length ? (
            <section key={label}>
              <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-medium uppercase tracking-tight text-[#777777]">
                <h3>{label}</h3>
                <p>{groupProjects.length}</p>
              </div>
              <div className="space-y-3">
                {groupProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} tasks={tasks} onSelect={setSelectedProjectId} />
                ))}
              </div>
            </section>
          ) : null
        ))}
        {!projects.length && <p className="py-4 text-sm text-[#777777]">No projects synced yet.</p>}
      </div>
    </div>
  );
}
