import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CircleDashed,
  Eye,
  EyeOff,
  GripVertical,
  NotebookPen,
  PanelTop,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../Badge.jsx';
import { Button } from '../Button.jsx';
import { calculateTimeline, formatDate } from '../../utils/dashboard.js';

const layoutStorageKey = 'beBlank.studioEditorialLayout.v1';
const notesStorageKey = 'beBlank.studioEditorialNotes.v1';
const moduleSizes = ['compact', 'standard', 'wide', 'full'];
const dayInMs = 1000 * 60 * 60 * 24;

const defaultLayout = [
  { id: 'command', label: 'Command Center', size: 'full', visible: true },
  { id: 'pressure', label: 'Pressure Map', size: 'standard', visible: true },
  { id: 'timeline', label: 'Operational Timeline', size: 'standard', visible: true },
  { id: 'projects', label: 'Active Work', size: 'wide', visible: true },
  { id: 'notes', label: 'Desk Notes', size: 'compact', visible: true },
];

const sizeClasses = {
  compact: 'lg:col-span-4',
  standard: 'lg:col-span-6',
  wide: 'lg:col-span-8',
  full: 'lg:col-span-12',
};

function readSavedLayout() {
  if (typeof window === 'undefined') {
    return defaultLayout;
  }

  try {
    const savedLayout = JSON.parse(window.localStorage.getItem(layoutStorageKey) || '[]');
    if (!Array.isArray(savedLayout)) {
      return defaultLayout;
    }

    const savedById = Object.fromEntries(savedLayout.map((item) => [item.id, item]));
    const merged = defaultLayout.map((item) => ({
      ...item,
      ...savedById[item.id],
      id: item.id,
      label: item.label,
      size: moduleSizes.includes(savedById[item.id]?.size) ? savedById[item.id].size : item.size,
      visible: typeof savedById[item.id]?.visible === 'boolean' ? savedById[item.id].visible : item.visible,
    }));
    const order = savedLayout.map((item) => item.id);
    return merged.sort((left, right) => {
      const leftIndex = order.indexOf(left.id);
      const rightIndex = order.indexOf(right.id);
      return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
    });
  } catch {
    return defaultLayout;
  }
}

function readSavedNotes() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(notesStorageKey) || '';
}

function getActiveProjects(projects) {
  return projects.filter((project) => project.status !== 'open');
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getDaysUntil(value, today = startOfToday()) {
  const date = parseDate(value);
  return date ? Math.ceil((date - today) / dayInMs) : null;
}

function getProjectPressure(project, today = startOfToday()) {
  const timeline = calculateTimeline(project);
  const status = String(project.status || '').toLowerCase();
  const blockers = String(project.blockers || '').trim();
  const nextAction = String(project.nextAction || '').trim();
  const handoverDays = getDaysUntil(project.handoverDate, today);
  const openingDays = getDaysUntil(project.openingDate, today);
  const designDays = getDaysUntil(project.designCompleteDate, today);
  const nearestDays = [handoverDays, openingDays, designDays].filter((value) => value !== null).sort((a, b) => a - b)[0] ?? null;
  const blocked = Boolean(blockers);
  const waiting = !nextAction || /approval|approve|client|confirm|waiting|review/i.test([nextAction, blockers, project.notes].filter(Boolean).join(' '));
  const overdue = nearestDays !== null && nearestDays < 0 && status !== 'open';
  const openingSoon = openingDays !== null && openingDays >= 0 && openingDays <= 21;
  const handoverRisk = handoverDays !== null && handoverDays <= 14 && status !== 'open';
  const score = (overdue ? 5 : 0) + (blocked ? 4 : 0) + (handoverRisk ? 3 : 0) + (openingSoon ? 2 : 0) + (waiting ? 1 : 0) + (timeline.deliveryPressure === 'critical' ? 3 : 0);

  return {
    blocked,
    blockers,
    handoverDays,
    handoverRisk,
    nearestDays,
    openingDays,
    openingSoon,
    overdue,
    score,
    timeline,
    waiting,
  };
}

function getOperationalDates(projects) {
  const today = startOfToday();

  return projects
    .flatMap((project) => [
      { project, label: 'Handover', value: project.handoverDate },
      { project, label: 'Opening', value: project.openingDate },
      { project, label: 'Design complete', value: project.designCompleteDate },
    ])
    .filter((item) => item.value)
    .map((item) => {
      return {
        ...item,
        daysUntil: getDaysUntil(item.value, today),
      };
    })
    .sort((left, right) => left.daysUntil - right.daysUntil);
}

function getOperationalSummary(projects, contentItems = []) {
  const activeProjects = getActiveProjects(projects);
  const projectSignals = activeProjects
    .map((project) => ({ project, pressure: getProjectPressure(project) }))
    .sort((left, right) => right.pressure.score - left.pressure.score);
  const dates = getOperationalDates(activeProjects);
  const waitingContent = contentItems.filter((item) => ['idea', 'draft', 'review'].includes(String(item.status || '').toLowerCase()));
  const blocked = projectSignals.filter((item) => item.pressure.blocked);
  const waiting = projectSignals.filter((item) => item.pressure.waiting);
  const overdue = dates.filter((item) => item.daysUntil < 0);
  const today = dates.filter((item) => item.daysUntil === 0);
  const thisWeek = dates.filter((item) => item.daysUntil > 0 && item.daysUntil <= 7);
  const openingSoon = dates.filter((item) => item.label === 'Opening' && item.daysUntil >= 0 && item.daysUntil <= 21);
  const handoverRisk = projectSignals.filter((item) => item.pressure.handoverRisk);
  const atRisk = projectSignals.filter((item) => item.pressure.score >= 4);

  return {
    activeProjects,
    atRisk,
    blocked,
    dates,
    handoverRisk,
    openingSoon,
    overdue,
    projectSignals,
    thisWeek,
    today,
    waiting,
    waitingApproval: waiting.length + waitingContent.length,
    waitingContent,
  };
}

function moveItem(items, index, direction) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const nextItems = [...items];
  const [item] = nextItems.splice(index, 1);
  nextItems.splice(nextIndex, 0, item);
  return nextItems;
}

function formatSizeLabel(size) {
  return size.charAt(0).toUpperCase() + size.slice(1);
}

function ModuleFrame({ children, isEditing, module, onMove, onResize, onToggleVisibility }) {
  const frameClass = module.id === 'command'
    ? 'border-b border-black/[0.08] pb-10'
    : 'rounded-lg border border-black/[0.06] bg-studio-bone/45 rhythm-card';

  return (
    <section className={`relative col-span-12 ${sizeClasses[module.size]} ${frameClass}`}>
      {isEditing && (
        <div className="mb-5 flex flex-wrap items-center justify-between rhythm-control-gap border-b border-black/[0.05] pb-4">
          <div className="flex items-center rhythm-control-gap">
            <GripVertical size={14} className="text-studio-muted" />
            <p className="type-label">{module.label}</p>
            <Badge tone="default">{formatSizeLabel(module.size)}</Badge>
          </div>
          <div className="flex flex-wrap items-center rhythm-control-gap">
            <button className="grid size-9 place-items-center rounded-full border border-black/[0.05] bg-white text-studio-muted transition hover:text-studio-ink" type="button" onClick={() => onMove(-1)} aria-label={`Move ${module.label} up`}>
              <ArrowUp size={14} />
            </button>
            <button className="grid size-9 place-items-center rounded-full border border-black/[0.05] bg-white text-studio-muted transition hover:text-studio-ink" type="button" onClick={() => onMove(1)} aria-label={`Move ${module.label} down`}>
              <ArrowDown size={14} />
            </button>
            <select
              className="h-9 rounded-full border border-black/[0.05] bg-white px-3 type-control text-studio-muted outline-none transition focus:border-studio-ink/20"
              value={module.size}
              onChange={(event) => onResize(event.target.value)}
              aria-label={`Resize ${module.label}`}
            >
              {moduleSizes.map((size) => (
                <option key={size} value={size}>{formatSizeLabel(size)}</option>
              ))}
            </select>
            <button className="grid size-9 place-items-center rounded-full border border-black/[0.05] bg-white text-studio-muted transition hover:text-studio-ink" type="button" onClick={onToggleVisibility} aria-label={`Hide ${module.label}`}>
              <EyeOff size={14} />
            </button>
          </div>
        </div>
      )}
      {children}
    </section>
  );
}

function EditorialModule({ contentItems, module, notes, projects, onNotesChange }) {
  const activeProjects = getActiveProjects(projects);
  const summary = getOperationalSummary(projects, contentItems);

  if (module.id === 'command') {
    return <CommandCenter summary={summary} />;
  }

  if (module.id === 'pressure') {
    return (
      <div>
        <ModuleHeader icon={PanelTop} label="Pressure Map" title="Actionable Signals" />
        <div className="mt-6 grid grid-cols-2 border-y border-black/[0.08]">
          <Metric label="Overdue" value={summary.overdue.length} />
          <Metric label="Opening soon" value={summary.openingSoon.length} />
          <Metric label="Waiting approval" value={summary.waitingApproval} />
          <Metric label="Blocked" value={summary.blocked.length} />
          <Metric label="Handover risk" value={summary.handoverRisk.length} />
          <Metric label="At risk" value={summary.atRisk.length} />
        </div>
      </div>
    );
  }

  if (module.id === 'projects') {
    return (
      <div>
        <ModuleHeader icon={CircleDashed} label="Projects" title="Active Work Queue" />
        <div className="mt-6 grid gap-0 border-y border-black/[0.08]">
          {summary.projectSignals.slice(0, 7).map(({ project, pressure }) => (
            <ProjectRow key={project.id} pressure={pressure} project={project} />
          ))}
          {!activeProjects.length && <EmptyModule message="No active projects are visible." />}
        </div>
      </div>
    );
  }

  if (module.id === 'timeline') {
    return (
      <div>
        <ModuleHeader icon={CalendarDays} label="Timeline" title="Operational Timeline" />
        <div className="mt-6 grid gap-6">
          <TimelineGroup label="Today" items={summary.today} />
          <TimelineGroup label="This week" items={summary.thisWeek} />
          <TimelineGroup label="At risk" items={summary.atRisk.map(({ project, pressure }) => ({ project, label: pressure.blocked ? 'Blocked' : 'Risk', daysUntil: pressure.nearestDays, value: project.handoverDate || project.openingDate || project.designCompleteDate }))} />
          <TimelineGroup label="Waiting" items={summary.waiting.map(({ project, pressure }) => ({ project, label: 'Waiting', daysUntil: pressure.nearestDays, value: project.handoverDate || project.openingDate || project.designCompleteDate }))} />
          <TimelineGroup label="Opening soon" items={summary.openingSoon} />
          {!summary.dates.length && <EmptyModule message="No operational dates are set." />}
        </div>
      </div>
    );
  }

  if (module.id === 'notes') {
    return (
      <div>
        <ModuleHeader icon={NotebookPen} label="Notes" title="Desk Notes" />
        <textarea
          className="type-body mt-6 min-h-56 w-full resize-y rounded-md border border-black/[0.07] bg-studio-bone/35 p-4 text-studio-ink outline-none transition focus:border-studio-ink/20 focus:bg-studio-bone/55"
          placeholder="Capture today-only context: calls, approvals, site friction, handover reminders..."
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
        />
      </div>
    );
  }

  return null;
}

function CommandCenter({ summary }) {
  const [firstRisk] = summary.atRisk;
  const lead = firstRisk?.project;
  const leadPressure = firstRisk?.pressure;
  const nextAction = lead?.nextAction || leadPressure?.blockers || 'No urgent project is currently leading the desk.';

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
      <div>
        <p className="type-label text-studio-muted">Desktop Command Center</p>
        <h1 className="type-page-title mt-2 max-w-3xl">
          {lead ? lead.name : 'Studio desk is clear'}
        </h1>
        <p className="type-body mt-4 max-w-3xl text-studio-ink">
          {nextAction}
        </p>
        <div className="mt-8 grid gap-0 border-y border-black/[0.08] sm:grid-cols-5">
          <Signal label="Overdue" value={summary.overdue.length} urgent={summary.overdue.length > 0} />
          <Signal label="Opening soon" value={summary.openingSoon.length} />
          <Signal label="Waiting" value={summary.waitingApproval} />
          <Signal label="Blocked" value={summary.blocked.length} urgent={summary.blocked.length > 0} />
          <Signal label="Handover risk" value={summary.handoverRisk.length} />
        </div>
      </div>
      <div className="border-l border-black/[0.08] pl-6">
        <p className="type-label text-studio-muted">Next operational move</p>
        <div className="mt-4 grid gap-4">
          {summary.blocked.slice(0, 3).map(({ project, pressure }) => (
            <ActionLine key={project.id} label="Unblock" project={project} value={pressure.blockers} />
          ))}
          {!summary.blocked.length && summary.waiting.slice(0, 3).map(({ project }) => (
            <ActionLine key={project.id} label="Confirm" project={project} value={project.nextAction || 'Client decision needed'} />
          ))}
          {!summary.blocked.length && !summary.waiting.length && <EmptyModule message="No blocked or waiting items are visible." />}
        </div>
      </div>
    </div>
  );
}

function ModuleHeader({ icon: Icon, label, title }) {
  return (
    <header className="flex items-start justify-between rhythm-stack-tight">
      <div>
        <p className="type-label text-studio-muted">{label}</p>
        <h2 className="type-section-title mt-2">{title}</h2>
      </div>
      <Icon size={16} className="text-studio-muted" />
    </header>
  );
}

function Metric({ label, value }) {
  return (
    <div className="border-b border-r border-black/[0.08] px-4 py-5">
      <p className="type-label">{label}</p>
      <p className="type-section-title mt-3">{value}</p>
    </div>
  );
}

function ProjectRow({ pressure, project }) {
  return (
    <article className="grid gap-4 border-b border-black/[0.06] px-1 py-5 last:border-b-0 md:grid-cols-[1fr_10rem]">
      <div className="flex flex-wrap items-start justify-between rhythm-control-gap">
        <div className="min-w-0">
          <p className="type-card-title truncate">{project.name || 'Untitled Project'}</p>
          <p className="type-caption mt-1">{project.client || project.location || 'Client TBD'}</p>
        </div>
        <Badge tone={pressure.blocked ? 'critical' : pressure.timeline.deliveryPressure}>{pressure.blocked ? 'blocked' : pressure.timeline.deliveryPressure}</Badge>
      </div>
      <p className="type-body text-studio-ink md:col-start-1">{project.nextAction || pressure.blockers || 'Next action not set.'}</p>
      <p className="type-control text-studio-muted md:col-start-2 md:row-start-1 md:text-right">
        {pressure.openingDays !== null ? `Opening ${formatDaysLabel(pressure.openingDays)}` : pressure.handoverDays !== null ? `Handover ${formatDaysLabel(pressure.handoverDays)}` : 'No date'}
      </p>
    </article>
  );
}

function Signal({ label, urgent = false, value }) {
  return (
    <div className="border-b border-r border-black/[0.08] px-4 py-4">
      <p className="type-label">{label}</p>
      <p className={`type-section-title mt-2 ${urgent ? 'text-red-800' : 'text-studio-ink'}`}>{value}</p>
    </div>
  );
}

function ActionLine({ label, project, value }) {
  return (
    <div className="border-b border-black/[0.06] pb-4">
      <p className="type-label">{label}</p>
      <p className="type-card-title mt-2">{project.name || 'Untitled Project'}</p>
      <p className="type-caption mt-1">{value}</p>
    </div>
  );
}

function DateRow({ item }) {
  const isOverdue = item.daysUntil < 0;
  const label = isOverdue
    ? `${Math.abs(item.daysUntil)}d overdue`
    : item.daysUntil === 0
      ? 'Today'
      : `${item.daysUntil}d`;

  return (
    <article className="border-b border-black/[0.06] py-3 last:border-b-0">
      <div className="flex items-start justify-between rhythm-stack-tight">
        <div className="min-w-0">
          <p className="type-card-title truncate">{item.project.name || 'Untitled Project'}</p>
          <p className="type-caption mt-1">{item.label} / {formatDate(item.value)}</p>
        </div>
        <span className={`type-control shrink-0 border-l border-black/[0.08] pl-3 ${isOverdue ? 'text-red-700' : 'text-studio-muted'}`}>
          {label}
        </span>
      </div>
    </article>
  );
}

function TimelineGroup({ items, label }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <p className="type-label">{label}</p>
        <span className="h-px flex-1 bg-black/[0.06]" />
        <span className="type-control text-studio-muted">{items.length}</span>
      </div>
      <div>
        {items.slice(0, 4).map((item) => (
          <DateRow key={`${label}-${item.project.id}-${item.label}-${item.value || item.daysUntil}`} item={item} />
        ))}
      </div>
    </section>
  );
}

function EmptyModule({ message }) {
  return (
    <p className="type-body border border-dashed border-black/[0.08] bg-studio-bone/35 rhythm-card-compact text-center">
      {message}
    </p>
  );
}

export function EditorialLayoutDashboard({ contentItems, projects }) {
  const [isEditing, setIsEditing] = useState(false);
  const [layout, setLayout] = useState(readSavedLayout);
  const [notes, setNotes] = useState(readSavedNotes);
  const hiddenModules = useMemo(() => layout.filter((module) => !module.visible), [layout]);
  const visibleModules = useMemo(() => layout.filter((module) => module.visible), [layout]);

  useEffect(() => {
    window.localStorage.setItem(layoutStorageKey, JSON.stringify(layout));
  }, [layout]);

  useEffect(() => {
    window.localStorage.setItem(notesStorageKey, notes);
  }, [notes]);

  const updateModule = (id, updates) => {
    setLayout((items) => items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const moveModule = (id, direction) => {
    setLayout((items) => {
      const index = items.findIndex((item) => item.id === id);
      return moveItem(items, index, direction);
    });
  };

  const resetLayout = () => setLayout(defaultLayout);

  return (
    <main className="grid rhythm-section page-fade">
      <header className="flex flex-col rhythm-stack border-b border-black/[0.08] pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="type-label text-studio-muted">Desktop Operations</p>
          <h1 className="type-page-title mt-2">Studio Command Surface</h1>
          <p className="type-body mt-3 max-w-2xl">
            Scan today, risk, waiting decisions, and handover pressure before opening deeper project tools.
          </p>
        </div>
        <div className="flex flex-wrap rhythm-control-gap">
          {isEditing && (
            <Button variant="secondary" onClick={resetLayout}>
              Reset Layout
            </Button>
          )}
          <Button variant={isEditing ? 'primary' : 'secondary'} onClick={() => setIsEditing((value) => !value)}>
            {isEditing ? 'Done Editing' : 'Edit Layout'}
          </Button>
        </div>
      </header>

      {isEditing && hiddenModules.length > 0 && (
        <section className="rounded-lg border border-black/[0.06] bg-studio-bone/40 rhythm-card-compact">
          <p className="type-label">Hidden modules</p>
          <div className="mt-4 flex flex-wrap rhythm-control-gap">
            {hiddenModules.map((module) => (
              <button
                key={module.id}
                className="type-control inline-flex min-h-9 items-center gap-2 rounded-md border border-black/[0.05] bg-studio-bone/55 px-4 text-studio-muted transition hover:text-studio-ink"
                type="button"
                onClick={() => updateModule(module.id, { visible: true })}
              >
                <Eye size={13} />
                Show {module.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-12 rhythm-grid">
        {visibleModules.map((module) => (
          <ModuleFrame
            key={module.id}
            isEditing={isEditing}
            module={module}
            onMove={(direction) => moveModule(module.id, direction)}
            onResize={(size) => updateModule(module.id, { size })}
            onToggleVisibility={() => updateModule(module.id, { visible: false })}
          >
            <EditorialModule
              contentItems={contentItems}
              module={module}
              notes={notes}
              projects={projects}
              onNotesChange={setNotes}
            />
          </ModuleFrame>
        ))}
      </div>

      {isEditing && (
        <footer className="flex flex-wrap items-center rhythm-control-gap border-t border-black/[0.05] pt-6 text-studio-muted">
          <Eye size={14} />
          <p className="type-caption">
            Layout saves automatically to this browser. Modules snap to 4, 6, 8, or 12-column spans on desktop and stack on mobile.
          </p>
        </footer>
      )}
    </main>
  );
}
