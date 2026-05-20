import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  Clock,
  Image as ImageIcon,
  Moon,
  StickyNote,
  Sun,
  Target,
} from 'lucide-react';
import { formatDate } from '../../utils/dashboard.js';

const attentionWindowDays = 21;
const activeStatuses = ['concept', 'design', 'construction', 'handover', 'in-progress'];
const closedStatuses = ['open', 'done', 'complete', 'completed'];
const millisecondsPerDay = 1000 * 60 * 60 * 24;

function parseDate(value) {
  if (!value) {
    return null;
  }

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
  if (!date) {
    return null;
  }

  return Math.ceil((date - today) / millisecondsPerDay);
}

function getDateTone(daysUntil) {
  if (daysUntil === null) {
    return 'muted';
  }

  if (daysUntil < 0) {
    return 'critical';
  }

  if (daysUntil <= 7) {
    return 'urgent';
  }

  if (daysUntil <= attentionWindowDays) {
    return 'watch';
  }

  return 'steady';
}

function getToneClass(tone) {
  if (tone === 'critical') {
    return 'border-red-900/20 bg-studio-bone/65 text-red-800';
  }

  if (tone === 'urgent') {
    return 'border-black/[0.12] bg-studio-bone/65 text-studio-ink';
  }

  if (tone === 'watch') {
    return 'border-black/[0.1] bg-studio-bone/55 text-[#212121]';
  }

  return 'border-black/[0.07] bg-transparent text-studio-ink';
}

function formatDaysLabel(daysUntil) {
  if (daysUntil === null) {
    return 'No date';
  }

  if (daysUntil < 0) {
    return `${Math.abs(daysUntil)}d overdue`;
  }

  if (daysUntil === 0) {
    return 'Today';
  }

  return `${daysUntil}d left`;
}

function getActiveProjects(projects) {
  return projects.filter((project) => {
    const status = String(project.status || '').toLowerCase();
    return activeStatuses.includes(status) && !closedStatuses.includes(status);
  });
}

function getProjectDates(projects) {
  const today = startOfToday();

  return projects
    .flatMap((project) => [
      { project, label: 'Handover', value: project.handoverDate },
      { project, label: 'Opening', value: project.openingDate },
      { project, label: 'Design complete', value: project.designCompleteDate },
    ])
    .map((item) => ({
      ...item,
      daysUntil: getDaysUntil(item.value, today),
    }))
    .filter((item) => item.daysUntil !== null && item.daysUntil <= attentionWindowDays)
    .sort((left, right) => left.daysUntil - right.daysUntil);
}

function getMissingNextActions(projects) {
  return getActiveProjects(projects)
    .filter((project) => !String(project.nextAction || '').trim())
    .slice(0, 5);
}

function getUpcomingRiskProjects(projects) {
  return getProjectDates(projects)
    .filter((item) => ['Handover', 'Opening'].includes(item.label))
    .slice(0, 5);
}

function getTodaySummary(projects) {
  const activeProjects = getActiveProjects(projects);
  const missingNextActions = getMissingNextActions(projects);
  const datedAttention = getProjectDates(projects);
  const overdueDates = datedAttention.filter((item) => item.daysUntil < 0);
  const dueToday = datedAttention.filter((item) => item.daysUntil === 0);
  const upcoming = datedAttention.filter((item) => item.daysUntil > 0);

  return {
    activeProjects,
    datedAttention,
    dueToday,
    missingNextActions,
    overdueDates,
    upcoming,
  };
}

function getActiveTaskSummary(projects) {
  const nextActions = getActiveProjects(projects).filter((project) => String(project.nextAction || '').trim());
  const openSiteLogs = projects.flatMap((project) => (
    Array.isArray(project.siteLogs)
      ? project.siteLogs.map((log) => ({ ...log, projectName: project.name }))
      : []
  ));

  return {
    nextActions,
    openSiteLogs,
    total: nextActions.length + openSiteLogs.length,
  };
}

function EmptyState({ message }) {
  return (
    <p className="type-body border-y border-black/[0.06] bg-studio-bone/24 px-4 py-5">
      {message}
    </p>
  );
}

function AttentionRow({ daysUntil, label, project }) {
  const tone = getDateTone(daysUntil);

  return (
    <div className={`flex items-center gap-4 border-y px-1 py-4 transition-colors hover:bg-studio-bone/20 ${getToneClass(tone)}`}>
      <div className="flex h-9 w-9 items-center justify-center border border-black/[0.06] bg-studio-bone/35">
        <CalendarDays size={16} strokeWidth={2} className="text-studio-muted" />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <h4 className="type-control truncate">{project.name || 'Untitled Project'}</h4>
        <p className="type-caption">{label} / {formatDate(project[label === 'Handover' ? 'handoverDate' : label === 'Opening' ? 'openingDate' : 'designCompleteDate'])}</p>
      </div>
      <p className="type-control shrink-0 text-right">{formatDaysLabel(daysUntil)}</p>
    </div>
  );
}

function MissingActionRow({ project }) {
  return (
    <div className="group flex items-start justify-between gap-4 border-b border-black/[0.06] pb-4 transition-colors hover:border-black/[0.14]">
      <div className="space-y-1">
        <p className="type-label text-studio-muted">{project.status || 'active'}</p>
        <h4 className="type-section-title">{project.name || 'Untitled Project'}</h4>
        <p className="type-caption">{project.client || project.location || 'Next action not set'}</p>
      </div>
      <span className="type-control border-l border-black/[0.1] pl-3 text-studio-muted">
        Needs action
      </span>
    </div>
  );
}

function NextActionRow({ project }) {
  return (
    <div className="border-y border-black/[0.06] bg-studio-bone/20 px-1 py-4">
      <p className="type-label">{project.name || 'Untitled Project'}</p>
      <p className="type-body mt-2 font-semibold text-studio-ink">{project.nextAction}</p>
    </div>
  );
}

export function DailyFlow({ projects = [] }) {
  const [time, setTime] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [focus, setFocus] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const summary = useMemo(() => getTodaySummary(projects), [projects]);
  const taskSummary = useMemo(() => getActiveTaskSummary(projects), [projects]);
  const upcomingRiskProjects = useMemo(() => getUpcomingRiskProjects(projects), [projects]);
  const hour = time.getHours();
  const greeting = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  const Icon = hour < 18 ? Sun : Moon;
  const clearState = !summary.overdueDates.length && !summary.dueToday.length && !summary.missingNextActions.length;

  return (
    <div className="grid rhythm-section-lg page-fade">
      <section className="border-b border-black/[0.08] pb-8">
        <div className="flex flex-col rhythm-stack md:flex-row md:items-baseline md:justify-between">
          <div className="space-y-2">
            <div className="type-label flex items-center gap-2">
              <Icon size={12} strokeWidth={2.5} />
              {greeting} / {time.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            <h2 className="type-page-title">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            </h2>
          </div>

          <div className="flex flex-wrap items-center rhythm-stack">
            <SummaryMetric label="Needs Attention" value={summary.overdueDates.length + summary.dueToday.length + summary.missingNextActions.length} />
            <div className="hidden h-6 w-px bg-black/[0.08] sm:block" />
            <SummaryMetric label="Active Pulse" value={`${summary.activeProjects.length} Projects`} />
            <div className="hidden h-6 w-px bg-black/[0.08] sm:block" />
            <SummaryMetric label="Task Signals" value={taskSummary.total || 'Clear'} />
          </div>
        </div>
      </section>

      <section className="grid border-y border-black/[0.07] md:grid-cols-3">
        <DailySummaryCard icon={AlertCircle} label="Overdue" value={summary.overdueDates.length} tone="critical" />
        <DailySummaryCard icon={Clock} label="Due Today" value={summary.dueToday.length} tone="watch" />
        <DailySummaryCard icon={Target} label="Missing Next Action" value={summary.missingNextActions.length} tone="steady" />
      </section>

      <div className="grid grid-cols-1 rhythm-section-lg lg:grid-cols-12">
        <div className="grid rhythm-section-lg lg:col-span-8">
          <section className="space-y-4">
            <header className="flex items-center justify-between">
              <h3 className="type-label">Primary Focus</h3>
              <Target size={12} className="text-studio-ink" />
            </header>
            <div className="group relative">
              <textarea
                value={focus}
                onChange={(event) => setFocus(event.target.value)}
                placeholder={clearState ? 'Today looks clear. Set one studio objective...' : 'Choose the one thing that unlocks today...'}
                className="type-section-title h-auto w-full resize-none overflow-hidden bg-transparent py-1 font-bold outline-none placeholder:text-black/[0.1]"
                rows={1}
              />
              <div className="absolute -bottom-1 left-0 h-px w-full bg-black/[0.08] transition-colors group-focus-within:bg-studio-ink" />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-20 md:grid-cols-2">
            <div className="grid rhythm-stack">
              <h3 className="type-label">Missing Next Action</h3>
              <div className="grid rhythm-stack">
                {summary.missingNextActions.map((project) => (
                  <MissingActionRow key={project.id} project={project} />
                ))}
                {!summary.missingNextActions.length && <EmptyState message="Every active project has a next action. Good morning, clean slate." />}
              </div>
            </div>

            <div className="grid rhythm-stack">
              <h3 className="type-label">Handover & Opening Watch</h3>
              <div className="grid rhythm-stack-tight">
                {upcomingRiskProjects.map((item) => (
                  <AttentionRow key={`${item.project.id}-${item.label}`} daysUntil={item.daysUntil} label={item.label} project={item.project} />
                ))}
                {!upcomingRiskProjects.length && <EmptyState message="No handover or opening dates need attention in the next 21 days." />}
              </div>
            </div>
          </section>

          <section className="space-y-8">
            <header className="flex items-center justify-between border-b border-black/[0.05] pb-4">
              <h3 className="type-label">Overdue & Upcoming Dates</h3>
              <CalendarDays size={14} className="text-studio-muted" />
            </header>
            <div className="grid rhythm-grid md:grid-cols-2">
              {summary.datedAttention.slice(0, 6).map((item) => (
                <AttentionRow key={`${item.project.id}-${item.label}-${item.value}`} daysUntil={item.daysUntil} label={item.label} project={item.project} />
              ))}
              {!summary.datedAttention.length && <EmptyState message="No dated risks are visible inside the current attention window." />}
            </div>
          </section>

          <section className="space-y-8">
            <header className="flex items-center justify-between border-b border-black/[0.05] pb-4">
              <h3 className="type-label">Reference & Atmosphere</h3>
              <ImageIcon size={14} className="text-studio-muted" />
            </header>
            <div className="flex gap-8 overflow-x-auto pb-8 no-scrollbar scroll-smooth">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="relative grid aspect-[4/5] min-w-[280px] place-items-center border border-black/[0.06] bg-studio-bone/24">
                  <div className="h-10 w-px bg-black/[0.08]" />
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="grid rhythm-section lg:col-span-4">
          <section className="rounded-lg border border-black/[0.07] bg-studio-bone/30 rhythm-card">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StickyNote size={12} className="text-studio-ink" />
                <h3 className="type-label">Scratchpad</h3>
              </div>
            </div>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Transient thoughts..."
              className="type-caption min-h-[240px] w-full bg-transparent text-studio-ink outline-none placeholder:text-studio-muted/40"
            />
          </section>

          <section className="grid rhythm-stack">
            <h3 className="type-label">Active Tasks Summary</h3>
            <div className="grid gap-3">
              {taskSummary.nextActions.slice(0, 4).map((project) => (
                <NextActionRow key={project.id} project={project} />
              ))}
              {!taskSummary.nextActions.length && <EmptyState message="No project next actions are set yet." />}
            </div>
          </section>

          <section className="grid rhythm-stack">
            <h3 className="type-label">Studio Confidence</h3>
            <div className="space-y-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.05]">
                <div
                  className="h-full rounded-full bg-studio-ink"
                  style={{ width: `${Math.max(12, Math.min(100, 100 - ((summary.overdueDates.length + summary.missingNextActions.length) * 12)))}%` }}
                />
              </div>
              <div className="type-control flex justify-between text-studio-muted">
                <span>Risk</span>
                <span>{clearState ? 'Clear' : 'Review'}</span>
              </div>
            </div>
          </section>

          <section className="grid rhythm-stack-tight">
            <button className="group flex w-full items-center justify-between border-y border-black/[0.07] bg-transparent px-1 py-5 transition-colors hover:bg-studio-bone/22">
              <span className="type-control">Review Journal</span>
              <ArrowUpRight size={14} className="text-studio-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </button>
            <button className="group flex w-full items-center justify-between border-y border-black/[0.07] bg-transparent px-1 py-5 transition-colors hover:bg-studio-bone/22">
              <span className="type-control">Archive Session</span>
              <ArrowUpRight size={14} className="text-studio-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function SummaryMetric({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="type-label">{label}</p>
      <p className="type-card-title">{value}</p>
    </div>
  );
}

function DailySummaryCard({ icon: Icon, label, tone, value }) {
  const toneClass = tone === 'critical'
    ? 'text-red-800 border-red-900/20'
    : tone === 'watch'
      ? 'text-[#212121] border-black/[0.1]'
      : 'text-studio-ink border-black/[0.07]';

  return (
    <div className={`border-r px-5 py-5 ${toneClass}`}>
      <div className="flex items-center justify-between">
        <p className="type-control">{label}</p>
        <Icon size={14} strokeWidth={2.4} />
      </div>
      <p className="type-page-title mt-4">{value}</p>
    </div>
  );
}
