import { useState } from 'react';

function getTaskDate(task) {
  const value = task.startDate || task.dueDate || task.dueAt || task.date;
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

function ProjectDetail({ notes, onBack, project, tasks }) {
  const projectTasks = tasks.filter((task) => task.projectId === project.id || task.projectName === project.name);
  const projectNotes = notes.filter((note) => note.projectId === project.id || note.projectName === project.name);
  const timeline = [
    ['Start', project.startDate],
    ['Design complete', project.designCompleteDate],
    ['Handover', project.handoverDate],
    ['Opening', project.openingDate],
  ].filter((item) => item[1]);

  return (
    <div className="page-fade">
      <button className="rounded-full border border-[rgba(33,33,33,0.08)] bg-white px-4 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#777777] transition-all duration-100 active:scale-95" type="button" onClick={onBack}>
        Projects
      </button>
      <div className="mt-6 rounded-[28px] border border-[rgba(33,33,33,0.08)] bg-white p-5">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#212121] ${getStatusChipClass(project.status)}`}>{project.status || 'Design'}</span>
        <h2 className="mt-3 text-3xl font-bold leading-tight text-[#212121]">{project.name}</h2>
        <p className="mt-4 text-sm text-[#777777]">{projectTasks.length} {projectTasks.length === 1 ? 'task' : 'tasks'}</p>
      </div>

      <section className="mt-8">
        <h3 className="mb-3 px-1 text-[11px] font-medium uppercase tracking-[0.14em]">Tasks</h3>
        {projectTasks.map((task) => {
          const date = getTaskDate(task);
          return (
            <div key={task.id} className="mb-3 rounded-[22px] border border-[rgba(33,33,33,0.08)] bg-white px-4 py-4">
              <p className="text-[17px] font-medium">{task.title}</p>
              <p className="mt-1 text-sm text-[#777777]">{date ? date.toLocaleDateString([], { dateStyle: 'medium' }) : task.notes || task.detail}</p>
            </div>
          );
        })}
        {!projectTasks.length && <p className="rounded-[24px] border border-[rgba(33,33,33,0.08)] bg-white px-4 py-5 text-sm text-[#777777]">No tasks yet.</p>}
      </section>

      <section className="mt-8">
        <h3 className="mb-3 px-1 text-[11px] font-medium uppercase tracking-[0.14em]">Notes</h3>
        {projectNotes.map((note) => (
          <p key={note.id} className="mb-3 rounded-[24px] border border-[rgba(33,33,33,0.08)] bg-white px-4 py-4 text-sm leading-6 text-[#777777]">
            {note.body || note.text || note.title}
          </p>
        ))}
        {!projectNotes.length && <p className="rounded-[24px] border border-[rgba(33,33,33,0.08)] bg-white px-4 py-5 text-sm text-[#777777]">{project.notes || 'Notes placeholder.'}</p>}
      </section>

      <section className="mt-8">
        <h3 className="mb-3 px-1 text-[11px] font-medium uppercase tracking-[0.14em]">Timeline</h3>
        {timeline.map(([label, value]) => (
          <div key={label} className="mb-3 flex justify-between rounded-[24px] border border-[rgba(33,33,33,0.08)] bg-white px-4 py-4">
            <p className="text-sm text-[#777777]">{label}</p>
            <p className="text-sm font-medium">{value}</p>
          </div>
        ))}
        {!timeline.length && <p className="rounded-[24px] border border-[rgba(33,33,33,0.08)] bg-white px-4 py-5 text-sm text-[#777777]">Timeline placeholder.</p>}
      </section>
    </div>
  );
}

function getProjectInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || 'P') + (parts[1]?.[0] || '');
}

function getStatusChipClass(status = '') {
  const value = String(status).toLowerCase();
  if (value.includes('complete')) {
    return 'bg-[#CFDECA]';
  }
  if (value.includes('construct') || value.includes('pricing')) {
    return 'bg-[#FFF0A3]';
  }
  return 'bg-[#DBDFE9]';
}

export function MobileProjects({ notes, onSelectProject, projects, selectedProjectId, tasks }) {
  const [localSelectedProjectId, setLocalSelectedProjectId] = useState('');
  const currentSelectedProjectId = selectedProjectId ?? localSelectedProjectId;
  const setSelectedProjectId = onSelectProject || setLocalSelectedProjectId;
  const selectedProject = projects.find((project) => project.id === currentSelectedProjectId);

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
    <div className="page-fade">
      <div className="mb-5 flex items-baseline justify-between rounded-[28px] border border-[rgba(33,33,33,0.08)] bg-white p-5">
        <h2 className="text-3xl font-bold lowercase tracking-[-0.02em] text-[#212121]">projects</h2>
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#777777]">
          {projects.filter((project) => project.status !== 'open').length} Active
        </p>
      </div>

      <div className="grid gap-3">
        {projects.map((project) => (
          <button
            key={project.id}
            className="flex w-full items-center gap-3 rounded-[22px] border border-[rgba(33,33,33,0.08)] bg-white px-4 py-4 text-left transition-transform duration-100 active:scale-[0.98] active:bg-[#DBDFE9]"
            type="button"
            onClick={() => setSelectedProjectId(project.id)}
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#DBDFE9] text-xs font-bold uppercase text-[#212121]">
              {getProjectInitials(project.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[17px] font-semibold text-[#212121]">{project.name}</span>
              <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#212121] ${getStatusChipClass(project.status)}`}>{project.status || 'Design'}</span>
            </span>
            <span className="grid size-8 place-items-center rounded-full bg-[#212121] text-xl leading-none text-white">›</span>
          </button>
        ))}
        {!projects.length && <p className="py-4 text-sm text-[#777777]">No projects synced yet.</p>}
      </div>
    </div>
  );
}
