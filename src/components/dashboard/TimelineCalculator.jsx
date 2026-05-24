import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  GitBranch,
  MoveHorizontal,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '../Badge.jsx';
import { EmptyState } from '../EmptyState.jsx';
import { Field } from '../Field.jsx';
import { SectionCard } from '../SectionCard.jsx';
import { calculateTimeline, formatDate } from '../../utils/dashboard.js';
import {
  analyzeTimelineRealism,
  getProjectTimelineDateRange,
  getTimelinePhases,
  parseTimelineDate,
} from '../../utils/timeline.js';
import {
  getBlockedCriticalDependencies,
  getCriticalDaysUntil,
  normalizeCriticalPath,
} from '../../utils/criticalPath.js';
import { TimelineDate } from './TimelineDate.jsx';

const dayInMs = 1000 * 60 * 60 * 24;

const phaseToneClasses = {
  clientReview: 'border-studio-ochre/20 bg-studio-bone/55',
  construction: 'border-studio-ink/10 bg-studio-bone/45',
  design: 'border-studio-olive/20 bg-studio-bone/45',
  handover: 'border-studio-ink/10 bg-studio-bone/35',
  procurement: 'border-studio-orange/20 bg-studio-bone/55',
  revision: 'border-studio-rust/20 bg-studio-bone/40',
};

function getDaysBetween(start, end) {
  if (!start || !end) return 0;
  return Math.max(0, Math.round((end - start) / dayInMs));
}

function getProjectTimelineBounds(project) {
  const range = getProjectTimelineDateRange(project);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = range.start || today;
  const end = range.end && range.end > start ? range.end : new Date(start.getTime() + (90 * dayInMs));
  return { end, start, totalDays: Math.max(1, getDaysBetween(start, end)) };
}

function getPercentForDate(value, bounds) {
  const date = parseTimelineDate(value);
  if (!date) return null;
  return Math.min(100, Math.max(0, (getDaysBetween(bounds.start, date) / bounds.totalDays) * 100));
}

function getPhaseLayout(phase, bounds) {
  const startPercent = getPercentForDate(phase.startDate, bounds);
  const endPercent = getPercentForDate(phase.endDate, bounds);
  const left = startPercent ?? endPercent ?? 0;
  const right = endPercent ?? startPercent ?? Math.min(100, left + 8);
  const width = Math.max(4, right - left);
  return { left, width };
}

function getMilestoneTone(milestone) {
  const days = getCriticalDaysUntil(milestone.targetDate);
  if (days !== null && days < 0 && milestone.status !== 'DONE') return 'overdue';
  if (milestone.status === 'BLOCKED' || ['RISK', 'CRITICAL'].includes(milestone.riskLevel)) return 'risk';
  if (milestone.status === 'WAITING' || milestone.riskLevel === 'WATCH') return 'waiting';
  if (milestone.status === 'DONE') return 'safe';
  return 'neutral';
}

function getMilestoneDotClass(tone) {
  if (tone === 'overdue' || tone === 'risk') return 'border-studio-orange bg-studio-orange';
  if (tone === 'waiting') return 'border-studio-ochre bg-studio-bone';
  if (tone === 'safe') return 'border-studio-olive bg-studio-olive';
  return 'border-studio-muted/45 bg-studio-paper';
}

function formatDaysLabel(days) {
  if (days === null) return 'No target';
  if (days < 0) return `${Math.abs(days)}d delayed`;
  if (days === 0) return 'Today';
  return `${days}d left`;
}

function getConfidenceTone(basePressure, realism) {
  if (!realism.warnings.length) return basePressure;
  if (basePressure === 'critical') return 'critical';
  if (realism.severity >= 3) return 'critical';
  return 'tight';
}

function TimelineAxis({ bounds }) {
  const ticks = useMemo(() => {
    const count = 6;
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(bounds.start.getTime() + ((bounds.totalDays / (count - 1)) * index * dayInMs));
      return {
        label: formatDate(date.toISOString().slice(0, 10)),
        left: `${(index / (count - 1)) * 100}%`,
      };
    });
  }, [bounds]);

  return (
    <div className="relative h-9 border-b border-black/[0.06]">
      {ticks.map((tick) => (
        <div key={`${tick.label}-${tick.left}`} className="absolute top-0 h-full border-l border-black/[0.05]" style={{ left: tick.left }}>
          <span className="type-control ml-2 text-studio-muted/60">{tick.label}</span>
        </div>
      ))}
    </div>
  );
}

function PhaseBand({ bounds, phase }) {
  const layout = getPhaseLayout(phase, bounds);
  return (
    <div
      className={`absolute top-7 h-16 rounded-sm border ${phaseToneClasses[phase.id] || phaseToneClasses.design} transition-colors duration-500 hover:bg-studio-bone/62`}
      style={{ left: `${layout.left}%`, width: `${layout.width}%` }}
    >
      <div className="flex h-full min-w-0 flex-col justify-between px-3 py-2.5">
        <span className="type-control truncate text-studio-ink">{phase.name}</span>
        <span className="type-caption truncate text-studio-muted">{phase.duration || 0}d / {phase.range}</span>
      </div>
    </div>
  );
}

function MilestonePin({ bounds, milestone }) {
  const left = getPercentForDate(milestone.targetDate, bounds);
  if (left === null) return null;
  const tone = getMilestoneTone(milestone);
  const days = getCriticalDaysUntil(milestone.targetDate);

  return (
    <div className="group absolute top-[5.8rem] -translate-x-1/2" style={{ left: `${left}%` }}>
      <div className={`mx-auto size-3 rounded-full border-2 shadow-[0_0_0_4px_rgba(215,211,200,0.82)] transition-colors duration-500 ${getMilestoneDotClass(tone)}`} />
      <div className="pointer-events-none absolute left-1/2 top-6 z-10 mt-3 w-44 -translate-x-1/2 border border-black/[0.08] bg-studio-paper p-3 opacity-0 shadow-studioSoft transition-opacity duration-500 group-hover:opacity-100">
        <p className="type-control text-studio-ink">{milestone.label}</p>
        <p className="type-caption mt-1 text-studio-muted">{milestone.status.replaceAll('_', ' ')} / {formatDaysLabel(days)}</p>
      </div>
    </div>
  );
}

function DependencyThread({ bounds, milestones }) {
  const positioned = milestones
    .map((milestone) => ({ ...milestone, left: getPercentForDate(milestone.targetDate, bounds) }))
    .filter((milestone) => milestone.left !== null)
    .sort((left, right) => left.left - right.left);

  if (positioned.length < 2) return null;

  return (
    <div className="absolute top-[6.15rem] h-px bg-black/[0.16]" style={{ left: `${positioned[0].left}%`, width: `${positioned[positioned.length - 1].left - positioned[0].left}%` }}>
      {positioned.slice(1).map((milestone) => (
        <span
          key={`${milestone.id}-thread`}
          className="absolute top-1/2 h-px -translate-y-1/2 bg-black/[0.18]"
          style={{ left: `${milestone.left - positioned[0].left}%`, width: 1 }}
        />
      ))}
    </div>
  );
}

function PlanningWall({ project }) {
  const timeline = calculateTimeline(project);
  const phases = getTimelinePhases(project, timeline);
  const realism = analyzeTimelineRealism(phases);
  const confidenceTone = getConfidenceTone(timeline.deliveryPressure, realism);
  const milestones = normalizeCriticalPath(project);
  const bounds = getProjectTimelineBounds(project);
  const blockedDependencies = getBlockedCriticalDependencies(milestones).filter(({ milestone }) => milestone.status !== 'DONE');
  const delayed = milestones.filter((milestone) => {
    const days = getCriticalDaysUntil(milestone.targetDate);
    return days !== null && days < 0 && milestone.status !== 'DONE';
  });
  const hasTimelineData = phases.some((phase) => phase.startDate || phase.endDate) || milestones.some((milestone) => milestone.targetDate);

  return (
    <div className="min-w-[920px]">
      <div className="grid grid-cols-[16rem_1fr] border-b border-black/[0.06]">
        <aside className="border-r border-black/[0.06] pr-6">
          <p className="type-label text-studio-muted">{project.status || 'active'}</p>
          <h3 className="type-section-title mt-2 truncate">{project.name}</h3>
          <p className="type-caption mt-2 text-studio-muted">{project.client || 'Client TBD'} / {project.location || 'Location TBD'}</p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Badge tone={confidenceTone}>{confidenceTone}</Badge>
            {delayed.length > 0 && <Badge tone="risk">{delayed.length} delayed</Badge>}
            {realism.warnings.length > 0 && <Badge tone="watch">{realism.warnings.length} realism checks</Badge>}
          </div>
        </aside>

        <section className="pl-7">
          <TimelineAxis bounds={bounds} />
          {hasTimelineData ? (
            <div className="relative h-40 bg-[linear-gradient(90deg,rgba(33,33,33,0.045)_1px,transparent_1px),linear-gradient(rgba(33,33,33,0.03)_1px,transparent_1px)] bg-[length:84px_100%,100%_30px]">
              {phases.map((phase) => (
                <PhaseBand key={phase.id} bounds={bounds} phase={phase} />
              ))}
              <DependencyThread bounds={bounds} milestones={milestones} />
              {milestones.map((milestone) => (
                <MilestonePin key={milestone.id} bounds={bounds} milestone={milestone} />
              ))}
            </div>
          ) : (
            <div className="grid h-40 place-items-center border-t border-black/[0.06] bg-studio-bone/24">
              <p className="type-caption text-studio-muted">Timeline dates are not set yet. Add key dates to reveal the planning wall.</p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-black/[0.06] py-4">
            <p className="type-control flex items-center gap-2 text-studio-muted">
              <GitBranch size={13} />
              {milestones.length} milestones
            </p>
            <p className="type-control flex items-center gap-2 text-studio-muted">
              <AlertTriangle size={13} />
              {blockedDependencies.length} dependency warnings
            </p>
            <p className="type-control flex items-center gap-2 text-studio-muted">
              <MoveHorizontal size={13} />
              Horizontal planning wall
            </p>
          </div>
          {realism.warnings.length > 0 && (
            <div className="border-t border-black/[0.06] py-4">
              <p className="type-label text-studio-muted">Schedule realism notes</p>
              <div className="mt-2 grid gap-1.5">
                {realism.warnings.map((warning) => (
                  <p key={warning} className="type-caption text-studio-muted">
                    {warning}
                  </p>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function TimelineCalculator({ projects, onUpdate }) {
  const [viewMode, setViewMode] = useState('overview');
  const [expandedProjectIds, setExpandedProjectIds] = useState(() => new Set());

  const toggleExpanded = (projectId) => {
    setExpandedProjectIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  return (
    <main className="grid gap-12">
      <SectionCard
        action={
          <div className="flex gap-2 rounded-md border border-black/[0.06] bg-studio-bone/40 p-1.5 shadow-sm">
            {['overview', 'detail'].map((mode) => (
              <button
                key={mode}
                className={`type-control h-9 min-w-24 rounded-sm px-5 transition-all duration-200 ${
                  viewMode === mode
                    ? 'bg-studio-ink text-studio-paper shadow-studio'
                    : 'text-studio-muted hover:bg-black/[0.03] hover:text-studio-ink'
                }`}
                type="button"
                onClick={() => setViewMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        }
        eyebrow="Timeline Management"
        title={viewMode === 'overview' ? 'Critical Path Planning Wall' : 'Project Schedule Detail'}
      >
        {viewMode === 'overview' ? (
          <TimelineOverview projects={projects} />
        ) : (
          <TimelineDetail
            expandedProjectIds={expandedProjectIds}
            projects={projects}
            onToggleExpanded={toggleExpanded}
            onUpdate={onUpdate}
          />
        )}
      </SectionCard>
    </main>
  );
}

export function TimelineOverview({ projects }) {
  if (!projects.length) {
    return <EmptyState message="No projects are available for timeline review yet." />;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 border-y border-black/[0.06] py-4">
        <p className="type-caption max-w-2xl text-studio-muted">
          Editorial schedule wall using existing project dates and critical path milestones. Scroll horizontally to read phase rhythm and dependency pressure.
        </p>
        <p className="type-control shrink-0 text-studio-muted">{projects.length} projects</p>
      </div>
      <div className="grid gap-8 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
        {projects.map((project) => (
          <article key={project.id} className="rounded-lg border border-black/[0.06] bg-studio-bone/32 p-6 shadow-sm transition-colors duration-500 hover:bg-studio-bone/38">
            <PlanningWall project={project} />
          </article>
        ))}
      </div>
    </div>
  );
}

export function TimelineDetail({ expandedProjectIds, projects, onToggleExpanded, onUpdate }) {
  if (!projects.length) {
    return <EmptyState message="No projects are available for schedule detail yet." />;
  }

  return (
    <div className="grid gap-6">
      {projects.map((project) => {
        const isExpanded = expandedProjectIds.has(project.id);
        const timeline = calculateTimeline(project);
        const phases = getTimelinePhases(project, timeline);
        const realism = analyzeTimelineRealism(phases);
        const confidenceTone = getConfidenceTone(timeline.deliveryPressure, realism);
        const milestones = normalizeCriticalPath(project);
        const delayed = milestones.filter((milestone) => {
          const days = getCriticalDaysUntil(milestone.targetDate);
          return days !== null && days < 0 && milestone.status !== 'DONE';
        });

        return (
          <article key={project.id} className="overflow-hidden rounded-lg border border-black/[0.06] bg-studio-bone/36 shadow-sm transition-colors duration-500 hover:border-black/[0.1] hover:bg-studio-bone/44">
            <button
              className="flex w-full flex-col gap-6 p-6 text-left sm:flex-row sm:items-center sm:justify-between lg:p-8"
              type="button"
              onClick={() => onToggleExpanded(project.id)}
            >
              <div className="flex min-w-0 items-center gap-6">
                <span className={`grid size-10 shrink-0 place-items-center rounded-full border border-black/[0.06] transition-all duration-300 ${isExpanded ? 'bg-studio-ink text-studio-paper' : 'bg-studio-paper text-studio-orange'}`}>
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </span>
                <div className="min-w-0">
                  <h3 className="type-section-title truncate">{project.name}</h3>
                  <p className="type-caption mt-1 text-studio-muted">
                    {project.client || 'Client TBD'} / {project.location || 'Location TBD'}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3 sm:justify-end">
                <Badge tone={project.status}>{project.status}</Badge>
                <Badge tone={timeline.riskLevel.toLowerCase()}>{timeline.riskLevel} Risk</Badge>
                <Badge tone={confidenceTone}>{confidenceTone}</Badge>
                {delayed.length > 0 && <Badge tone="risk">{delayed.length} delayed</Badge>}
                {realism.warnings.length > 0 && <Badge tone="watch">{realism.warnings.length} realism checks</Badge>}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-black/[0.06] bg-studio-paper/30 p-6 animate-in fade-in duration-500 lg:p-8">
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
                  {phases.map((phase) => (
                    <div
                      key={phase.id}
                      className={`grid gap-3 rounded-sm border p-5 shadow-sm ${phaseToneClasses[phase.id] || phaseToneClasses.design}`}
                    >
                      <p className="type-control text-studio-muted">{phase.name}</p>
                      <p className="type-section-title text-studio-ink">{phase.duration}<span className="type-caption ml-1 text-studio-muted">d</span></p>
                      <p className="type-caption text-studio-muted">{phase.range}</p>
                    </div>
                  ))}
                </div>

                {realism.warnings.length > 0 && (
                  <div className="mt-8 border-t border-black/[0.06] pt-7">
                    <p className="type-label text-studio-muted">Schedule realism notes</p>
                    <div className="mt-2 grid gap-1.5">
                      {realism.warnings.map((warning) => (
                        <p key={`${project.id}-${warning}`} className="type-caption text-studio-muted">{warning}</p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-8 grid gap-7 border-t border-black/[0.06] pt-8 lg:grid-cols-3">
                  <Field
                    label="Schedule Notes"
                    multiline
                    value={project.notes || ''}
                    onChange={(value) => onUpdate(project.id, { notes: value })}
                  />
                  <Field
                    label="Current Blockers"
                    multiline
                    value={project.blockers || ''}
                    onChange={(value) => onUpdate(project.id, { blockers: value })}
                  />
                  <Field
                    label="Critical Next Step"
                    multiline
                    value={project.nextAction || ''}
                    onChange={(value) => onUpdate(project.id, { nextAction: value })}
                  />
                </div>

                <div className="mt-8 grid gap-6 border-t border-black/[0.06] pt-8 sm:grid-cols-2 lg:grid-cols-6">
                  <TimelineDate calendarLabel="Start date" label="Project Start" project={project} value={project.startDate} />
                  <TimelineDate label="Design Freeze" value={project.designCompleteDate} />
                  <Field
                    label="Client review"
                    type="date"
                    value={project.clientReviewDate || ''}
                    onChange={(value) => onUpdate(project.id, { clientReviewDate: value })}
                  />
                  <Field
                    label="Revision complete"
                    type="date"
                    value={project.revisionCompleteDate || ''}
                    onChange={(value) => onUpdate(project.id, { revisionCompleteDate: value })}
                  />
                  <TimelineDate calendarLabel="Handover date" label="Site Handover" project={project} value={project.handoverDate} />
                  <TimelineDate calendarLabel="Opening date" label="Opening" project={project} value={project.openingDate} />
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
