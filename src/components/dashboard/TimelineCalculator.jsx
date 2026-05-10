import {
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../Badge.jsx';
import { Field } from '../Field.jsx';
import { SectionCard } from '../SectionCard.jsx';
import { calculateTimeline } from '../../utils/dashboard.js';
import { getTimelinePhases } from '../../utils/timeline.js';
import { TimelineDate } from './TimelineDate.jsx';

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
          <div className="flex gap-2 rounded-full border border-black/[0.05] bg-[#f9f9f7] p-1.5 shadow-sm">
            {['overview', 'detail'].map((mode) => (
              <button
                key={mode}
                className={`h-9 min-w-24 rounded-full px-5 text-[13px] font-bold capitalize transition-all duration-200 ${
                  viewMode === mode
                  ? 'bg-[#111111] text-white shadow-studio'
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
        title={viewMode === 'overview' ? 'Schedule Overview' : 'Project Schedule Detail'}
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
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {projects.map((project) => {
        const timeline = calculateTimeline(project);

        return (
          <article key={project.id} className="rounded-xl border border-black/[0.05] bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-glow lg:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="font-sans font-bold truncate text-2xl font-medium text-[#111111]">{project.name}</h3>
                <p className="mt-2 text-sm font-medium tracking-wide text-studio-muted/70 italic">
                  {project.client || 'Client TBD'} / {project.location || 'Location TBD'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end shrink-0">
                <Badge tone={project.status}>{project.status}</Badge>
                <Badge tone={timeline.riskLevel.toLowerCase()}>{timeline.riskLevel} Risk</Badge>
              </div>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              <TimelineDate calendarLabel="Start date" label="Project Start" project={project} value={project.startDate} />
              <TimelineDate calendarLabel="Handover date" label="Client Handover" project={project} value={project.handoverDate} />
              <TimelineDate calendarLabel="Opening date" label="Grand Opening" project={project} value={project.openingDate} />
            </div>

            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-tight text-studio-muted/60">Total Project Span</p>
                <p className="font-sans font-bold mt-2 text-3xl font-medium text-[#111111]">{timeline.totalProjectDays} <span className="text-sm font-sans font-bold text-studio-muted/40 uppercase tracking-widest ml-1">days</span></p>
              </div>
              <div className="sm:text-right">
                <p className="text-[10px] font-bold uppercase tracking-tight text-studio-muted/60">Opening Countdown</p>
                <p className={`font-sans font-bold mt-2 text-3xl font-medium ${timeline.riskTextClass}`}>{timeline.daysRemainingToOpening} <span className="text-sm font-sans font-bold opacity-40 uppercase tracking-widest ml-1">days</span></p>
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between gap-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-studio-muted/50">Completion</span>
                <span className="font-sans font-bold text-lg font-medium text-[#111111]">{timeline.progressPercent}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.03]">
                <div className={`h-full rounded-full transition-all duration-1000 ${timeline.riskBarClass}`} style={{ width: `${timeline.progressPercent}%` }} />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function TimelineDetail({ expandedProjectIds, projects, onToggleExpanded, onUpdate }) {
  return (
    <div className="grid gap-6">
      {projects.map((project) => {
        const isExpanded = expandedProjectIds.has(project.id);
        const timeline = calculateTimeline(project);
        const phases = getTimelinePhases(project, timeline);

        return (
          <article key={project.id} className="rounded-xl border border-black/[0.05] bg-white shadow-sm transition-all hover:shadow-glow overflow-hidden">
            <button
              className="flex w-full flex-col gap-6 p-6 text-left sm:flex-row sm:items-center sm:justify-between lg:p-8"
              type="button"
              onClick={() => onToggleExpanded(project.id)}
            >
              <div className="flex min-w-0 items-center gap-6">
                <span className={`grid size-10 shrink-0 place-items-center rounded-full border border-black/[0.05] transition-all duration-300 ${isExpanded ? 'bg-studio-ink text-white' : 'bg-[#f9f9f7] text-studio-orange'}`}>
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </span>
                <div className="min-w-0">
                  <h3 className="font-sans font-bold truncate text-2xl font-medium text-[#111111]">{project.name}</h3>
                  <p className="mt-1 text-sm font-medium tracking-wide text-studio-muted/70">
                    {project.client || 'Client TBD'} / {project.location || 'Location TBD'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 sm:justify-end shrink-0">
                <Badge tone={project.status}>{project.status}</Badge>
                <Badge tone={timeline.riskLevel.toLowerCase()}>{timeline.riskLevel} Risk</Badge>
                <Badge tone={timeline.deliveryPressure}>{timeline.deliveryPressure}</Badge>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-black/[0.05] bg-[#f9f9f7]/30 p-6 lg:p-8">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {phases.map((phase) => (
                    <div
                      key={phase.name}
                      className="grid gap-3 rounded-xl border border-black/[0.05] bg-white p-5 shadow-sm"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-tight text-studio-muted/70">{phase.name}</p>
                      <p className="font-sans font-bold text-2xl font-medium text-studio-orange">{phase.duration}<span className="text-xs font-sans font-bold opacity-30 ml-1">d</span></p>
                      <p className="text-[11px] font-medium text-studio-muted/50 italic">{phase.range}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 grid gap-8 lg:grid-cols-3 border-t border-black/[0.05] pt-8">
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
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
