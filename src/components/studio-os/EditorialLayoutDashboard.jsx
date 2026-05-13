import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Eye,
  EyeOff,
  GripVertical,
  LayoutTemplate,
  NotebookPen,
  PanelTop,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../Badge.jsx';
import { Button } from '../Button.jsx';
import { DailyFlow } from '../dashboard/DailyFlow.jsx';
import { calculateTimeline, formatDate } from '../../utils/dashboard.js';

const layoutStorageKey = 'beBlank.studioEditorialLayout.v1';
const notesStorageKey = 'beBlank.studioEditorialNotes.v1';
const moduleSizes = ['compact', 'standard', 'wide', 'full'];

const defaultLayout = [
  { id: 'dailyFlow', label: 'Daily Flow', size: 'full', visible: true },
  { id: 'metrics', label: 'Metrics', size: 'standard', visible: true },
  { id: 'projects', label: 'Projects', size: 'standard', visible: true },
  { id: 'timeline', label: 'Timeline', size: 'wide', visible: true },
  { id: 'portfolio', label: 'Portfolio', size: 'compact', visible: true },
  { id: 'notes', label: 'Notes', size: 'compact', visible: true },
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

function getUpcomingDates(projects) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return projects
    .flatMap((project) => [
      { project, label: 'Handover', value: project.handoverDate },
      { project, label: 'Opening', value: project.openingDate },
      { project, label: 'Design complete', value: project.designCompleteDate },
    ])
    .filter((item) => item.value)
    .map((item) => {
      const date = new Date(`${item.value}T00:00:00`);
      return {
        ...item,
        daysUntil: Math.ceil((date - today) / (1000 * 60 * 60 * 24)),
      };
    })
    .sort((left, right) => left.daysUntil - right.daysUntil)
    .slice(0, 6);
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
  const frameClass = module.id === 'dailyFlow'
    ? 'border-b border-black/[0.08] pb-12'
    : 'rounded-2xl border border-black/[0.06] bg-white/65 p-6 shadow-studioSoft';

  return (
    <section className={`relative col-span-12 ${sizeClasses[module.size]} ${frameClass}`}>
      {isEditing && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.05] pb-4">
          <div className="flex items-center gap-2">
            <GripVertical size={14} className="text-studio-muted" />
            <p className="type-label">{module.label}</p>
            <Badge tone="default">{formatSizeLabel(module.size)}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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

function EditorialModule({ contentItems, module, notes, portfolioItems, projects, onNotesChange }) {
  const activeProjects = getActiveProjects(projects);
  const upcomingDates = getUpcomingDates(projects);

  if (module.id === 'dailyFlow') {
    return <DailyFlow projects={projects} />;
  }

  if (module.id === 'metrics') {
    const approvedContent = contentItems.filter((item) => item.status === 'approved' || item.status === 'posted').length;
    const openProjects = projects.filter((project) => project.status === 'open').length;

    return (
      <div>
        <ModuleHeader icon={PanelTop} label="Metrics" title="Studio Pulse" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Metric label="Active projects" value={activeProjects.length} />
          <Metric label="Open projects" value={openProjects} />
          <Metric label="Approved content" value={approvedContent} />
          <Metric label="Portfolio items" value={portfolioItems.length} />
        </div>
      </div>
    );
  }

  if (module.id === 'projects') {
    return (
      <div>
        <ModuleHeader icon={LayoutTemplate} label="Projects" title="Active Work" />
        <div className="mt-8 space-y-4">
          {activeProjects.slice(0, 5).map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
          {!activeProjects.length && <EmptyModule message="No active projects are visible." />}
        </div>
      </div>
    );
  }

  if (module.id === 'timeline') {
    return (
      <div>
        <ModuleHeader icon={CalendarDays} label="Timeline" title="Upcoming Dates" />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {upcomingDates.map((item) => (
            <DateRow key={`${item.project.id}-${item.label}-${item.value}`} item={item} />
          ))}
          {!upcomingDates.length && <EmptyModule message="No upcoming dates are set." />}
        </div>
      </div>
    );
  }

  if (module.id === 'portfolio') {
    return (
      <div>
        <ModuleHeader icon={PanelTop} label="Portfolio" title="Gallery Queue" />
        <div className="mt-8 space-y-4">
          {portfolioItems.slice(0, 4).map((item) => (
            <div key={item.id} className="border-b border-black/[0.05] pb-4 last:border-b-0 last:pb-0">
              <p className="type-card-title">{item.category || 'Portfolio item'}</p>
              <p className="type-caption mt-1">{[item.location, item.year].filter(Boolean).join(' / ') || 'Gallery record'}</p>
            </div>
          ))}
          {!portfolioItems.length && <EmptyModule message="No portfolio items are visible." />}
        </div>
      </div>
    );
  }

  if (module.id === 'notes') {
    return (
      <div>
        <ModuleHeader icon={NotebookPen} label="Notes" title="Editorial Notes" />
        <textarea
          className="type-body mt-8 min-h-56 w-full resize-y rounded-xl border border-black/[0.05] bg-[#f9f9f7] p-4 text-studio-ink outline-none transition focus:border-studio-ink/20 focus:bg-white"
          placeholder="Keep layout intent, handover reminders, or morning composition notes here..."
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
        />
      </div>
    );
  }

  return null;
}

function ModuleHeader({ icon: Icon, label, title }) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <p className="type-label text-studio-orange">{label}</p>
        <h2 className="type-section-title mt-2">{title}</h2>
      </div>
      <Icon size={16} className="text-studio-muted" />
    </header>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-black/[0.05] bg-white p-4">
      <p className="type-label">{label}</p>
      <p className="type-page-title mt-4">{value}</p>
    </div>
  );
}

function ProjectRow({ project }) {
  const timeline = calculateTimeline(project);

  return (
    <article className="rounded-xl border border-black/[0.05] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="type-card-title truncate">{project.name || 'Untitled Project'}</p>
          <p className="type-caption mt-1">{project.client || project.location || 'Client TBD'}</p>
        </div>
        <Badge tone={timeline.deliveryPressure}>{timeline.deliveryPressure}</Badge>
      </div>
      <p className="type-body mt-4 text-studio-ink">{project.nextAction || 'Next action not set.'}</p>
    </article>
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
    <article className="rounded-xl border border-black/[0.05] bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="type-card-title truncate">{item.project.name || 'Untitled Project'}</p>
          <p className="type-caption mt-1">{item.label} / {formatDate(item.value)}</p>
        </div>
        <span className={`type-control shrink-0 rounded-full px-3 py-1 ${isOverdue ? 'bg-red-50 text-red-700' : 'bg-[#f9f9f7] text-studio-muted'}`}>
          {label}
        </span>
      </div>
    </article>
  );
}

function EmptyModule({ message }) {
  return (
    <p className="type-body rounded-xl border border-dashed border-black/[0.08] bg-[#f9f9f7] p-5 text-center">
      {message}
    </p>
  );
}

export function EditorialLayoutDashboard({ contentItems, portfolioItems, projects }) {
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
    <main className="space-y-10 page-fade">
      <header className="flex flex-col gap-6 border-b border-black/[0.08] pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="type-label text-studio-orange">Editorial Layout</p>
          <h1 className="type-page-title mt-2">Structured Studio Composition</h1>
          <p className="type-body mt-3 max-w-2xl">
            Arrange the daily workspace as measured editorial blocks. The public view stays clean; edit mode exposes order, width, and visibility controls.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
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
        <section className="rounded-2xl border border-black/[0.06] bg-[#f9f9f7] p-5">
          <p className="type-label">Hidden modules</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {hiddenModules.map((module) => (
              <button
                key={module.id}
                className="type-control inline-flex min-h-9 items-center gap-2 rounded-full border border-black/[0.05] bg-white px-4 text-studio-muted transition hover:text-studio-ink"
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

      <div className="grid grid-cols-12 gap-6">
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
              portfolioItems={portfolioItems}
              projects={projects}
              onNotesChange={setNotes}
            />
          </ModuleFrame>
        ))}
      </div>

      {isEditing && (
        <footer className="flex flex-wrap items-center gap-3 border-t border-black/[0.05] pt-6 text-studio-muted">
          <Eye size={14} />
          <p className="type-caption">
            Layout saves automatically to this browser. Modules snap to 4, 6, 8, or 12-column spans on desktop and stack on mobile.
          </p>
        </footer>
      )}
    </main>
  );
}
