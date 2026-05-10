import {
  ArrowLeft,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '../Badge.jsx';
import { Button } from '../Button.jsx';
import { EmptyState } from '../EmptyState.jsx';
import { Field } from '../Field.jsx';
import { MetricCard } from '../MetricCard.jsx';
import { SectionCard } from '../SectionCard.jsx';
import { StatusSelect } from '../StatusSelect.jsx';
import {
  calculateTimeline,
  calculateProjectFinancials,
  formatTHB,
} from '../../utils/dashboard.js';
import { projectStatuses } from '../../data/seed.js';
import { KeyDate, FinanceStat, ProfitStatusBadge } from './ProjectFinancials.jsx';
import { getProfitBarClass } from '../../utils/financials.js';
import { NarrativePanel } from './NarrativePanel.jsx';

const drawingStatuses = ['draft', 'review', 'approved', 'issued'];

export function ProjectDashboard({ projects, statusCounts, onAdd, onDelete, onUpdate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      const searchableText = [project.name, project.client, project.location, project.notes, project.owner, project.blockers]
        .join(' ')
        .toLowerCase();
      const matchesQuery = !query || searchableText.includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [projects, searchQuery, statusFilter]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId);

  const deleteProject = (id) => {
    if (selectedProjectId === id) {
      setSelectedProjectId('');
    }
    onDelete(id);
  };

  if (selectedProject) {
    return (
      <ProjectDetailView
        project={selectedProject}
        onBack={() => setSelectedProjectId('')}
        onDelete={() => deleteProject(selectedProject.id)}
        onUpdate={(updates) => onUpdate(selectedProject.id, updates)}
      />
    );
  }

  return (
    <main className="grid gap-12">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {projectStatuses.map((status) => (
          <SectionCard key={status} compact>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-studio-muted">{status}</p>
              <Badge tone={status}>{status}</Badge>
            </div>
            <p className="mt-4 text-3xl font-bold text-[#111111]">{statusCounts[status] || 0}</p>
          </SectionCard>
        ))}
      </div>

      <SectionCard
        action={
          <Button onClick={onAdd}>
            <Plus size={16} />
            New Project
          </Button>
        }
        eyebrow="Project Dashboard"
        title="Studio Pipeline"
      >
        <div className="mb-8 grid gap-4 rounded-xl border border-black/[0.05] bg-[#f9f9f7] p-6 lg:grid-cols-[1fr_240px]">
          <label className="block">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-tight text-studio-muted">
              Search projects
            </span>
            <div className="flex min-h-12 items-center gap-3 rounded-lg border border-black/[0.05] bg-white px-4 transition-all focus-within:border-studio-orange/30 focus-within:ring-4 focus-within:ring-studio-orange/5">
              <Search size={18} className="text-studio-muted/50" />
              <input
                className="h-10 w-full bg-transparent text-[15px] text-[#111111] outline-none placeholder:text-studio-muted/40"
                placeholder="Name, client, location, or notes"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-tight text-studio-muted">
              Filter status
            </span>
            <select
              className="h-12 w-full rounded-lg border border-black/[0.05] bg-white px-4 text-[15px] font-medium capitalize text-[#111111] outline-none transition-all focus:border-studio-orange/30 focus:ring-4 focus:ring-studio-orange/5"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              {projectStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>

        {projects.length === 0 ? (
          <EmptyState message="No projects yet. Add the first project to begin tracking studio delivery." />
        ) : filteredProjects.length === 0 ? (
          <EmptyState message="No projects match the current search and status filter." />
        ) : (
          <div className="grid gap-8">
            {filteredProjects.map((project) => (
              <article
                key={project.id}
                className="group cursor-pointer rounded-xl border border-black/[0.05] bg-white p-6 shadow-sm transition-all duration-300 hover:border-studio-orange/20 hover:shadow-glow lg:p-8"
                role="button"
                tabIndex={0}
                onClick={() => setSelectedProjectId(project.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    setSelectedProjectId(project.id);
                  }
                }}
              >
                <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <input
                      aria-label="Project name"
                      className="w-full bg-transparent text-2xl font-bold text-[#111111] outline-none transition-colors focus:text-studio-orange"
                      value={project.name}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => onUpdate(project.id, { name: event.target.value })}
                    />
                    <p className="mt-1 text-sm font-medium text-studio-muted/70">
                      {project.client || 'Client TBD'} &bull; {project.location || 'Location TBD'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 lg:justify-end">
                    <Badge tone={project.status}>{project.status}</Badge>
                    <Button variant="secondary" onClick={(event) => {
                      event.stopPropagation();
                      setSelectedProjectId(project.id);
                    }}>
                      Open Detail
                    </Button>
                    <button
                      aria-label="Delete project"
                      className="grid size-10 place-items-center rounded-full border border-black/[0.05] text-studio-muted/40 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteProject(project.id);
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4" onClick={(event) => event.stopPropagation()}>
                  <Field label="Client" value={project.client} onChange={(value) => onUpdate(project.id, { client: value })} />
                  <Field
                    label="Location"
                    value={project.location}
                    onChange={(value) => onUpdate(project.id, { location: value })}
                  />
                  <StatusSelect
                    label="Status"
                    options={projectStatuses}
                    value={project.status}
                    onChange={(value) => onUpdate(project.id, { status: value })}
                  />
                  <Field
                    label="Start date"
                    type="date"
                    value={project.startDate}
                    onChange={(value) => onUpdate(project.id, { startDate: value })}
                  />
                  <Field
                    label="Handover date"
                    type="date"
                    value={project.handoverDate}
                    onChange={(value) => onUpdate(project.id, { handoverDate: value })}
                  />
                  <Field
                    label="Opening date"
                    type="date"
                    value={project.openingDate}
                    onChange={(value) => onUpdate(project.id, { openingDate: value })}
                  />
                  <Field
                    label="Notes"
                    multiline
                    value={project.notes}
                    wrapperClassName="md:col-span-2 xl:col-span-2"
                    onChange={(value) => onUpdate(project.id, { notes: value })}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </main>
  );
}

export function ProjectDetailView({ project, onBack, onDelete, onUpdate }) {
  const timeline = calculateTimeline(project);
  const financials = calculateProjectFinancials(project);
  const siteLogs = Array.isArray(project.siteLogs) ? project.siteLogs : [];

  const addSiteLog = () => {
    onUpdate({
      siteLogs: [
        {
          id: `site-${crypto.randomUUID()}`,
          date: new Date().toISOString().slice(0, 10),
          notes: '',
          issues: '',
          imageLink: '',
        },
        ...siteLogs,
      ],
    });
  };

  const updateSiteLog = (id, updates) => {
    onUpdate({ siteLogs: siteLogs.map((log) => (log.id === id ? { ...log, ...updates } : log)) });
  };

  const deleteSiteLog = (id) => {
    onUpdate({ siteLogs: siteLogs.filter((log) => log.id !== id) });
  };

  const updatePricing = (updates) => {
    const nextProject = { ...project, ...updates };
    const shouldUseManualValue = Boolean(nextProject.useManualProjectValue);
    const automaticValue = (Number(nextProject.areaSqm) || 0) * (Number(nextProject.ratePerSqm) || 0);
    onUpdate({
      ...updates,
      ...(shouldUseManualValue ? {} : { projectValue: automaticValue ? String(automaticValue) : '' }),
    });
  };

  return (
    <main className="grid gap-12">
      <NarrativePanel project={project} onUpdate={(id, updates) => onUpdate(updates)} />

      <SectionCard
        action={
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={onBack}>
              <ArrowLeft size={16} />
              Back
            </Button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-5 text-[13px] font-semibold text-red-600 transition-all hover:bg-red-100 hover:text-red-700 hover:-translate-y-0.5"
              type="button"
              onClick={onDelete}
            >
              <Trash2 size={16} />
              Delete Project
            </button>
          </div>
        }
        eyebrow="Project Detail"
        title={project.name}
      >
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border border-black/[0.05] bg-[#f9f9f7] p-8 shadow-sm">
            <div className="mb-8 flex flex-wrap items-center gap-4">
              <Badge tone={project.status}>{project.status}</Badge>
              <Badge tone={timeline.deliveryPressure}>{timeline.deliveryPressure}</Badge>
              <p className="text-sm font-medium text-studio-muted/60 italic">
                {project.client || 'Client TBD'} / {project.location || 'Location TBD'}
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Project name" value={project.name} onChange={(value) => onUpdate({ name: value })} />
              <Field label="Client" value={project.client} onChange={(value) => onUpdate({ client: value })} />
              <Field label="Location" value={project.location} onChange={(value) => onUpdate({ location: value })} />
              <Field label="Owner" value={project.owner || ''} onChange={(value) => onUpdate({ owner: value })} />
              <StatusSelect
                label="Status"
                options={projectStatuses}
                value={project.status}
                onChange={(value) => onUpdate({ status: value })}
              />
              <Field
                label="Start date"
                type="date"
                value={project.startDate}
                onChange={(value) => onUpdate({ startDate: value })}
              />
              <Field
                label="Design complete"
                type="date"
                value={project.designCompleteDate}
                onChange={(value) => onUpdate({ designCompleteDate: value })}
              />
              <Field
                label="Handover date"
                type="date"
                value={project.handoverDate}
                onChange={(value) => onUpdate({ handoverDate: value })}
              />
              <Field
                label="Opening date"
                type="date"
                value={project.openingDate}
                onChange={(value) => onUpdate({ openingDate: value })}
              />
              <Field
                label="Notes"
                multiline
                value={project.notes || ''}
                onChange={(value) => onUpdate({ notes: value })}
              />
              <Field
                label="Blocker"
                multiline
                value={project.blockers || ''}
                onChange={(value) => onUpdate({ blockers: value })}
              />
              <Field
                label="Next action"
                multiline
                value={project.nextAction || ''}
                wrapperClassName="sm:col-span-2"
                onChange={(value) => onUpdate({ nextAction: value })}
              />
            </div>
          </div>

          <div className="grid gap-8">
            <div className="rounded-xl border border-black/[0.05] bg-[#f9f9f7] p-8 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-tight text-studio-orange">Timeline & Progress</p>
              <div className="mt-8 flex items-end justify-between gap-6">
                <div>
                <p className="text-4xl font-bold text-[#111111]">{timeline.progressPercent}%</p>
                <p className="mt-1 text-[12px] font-bold tracking-wide text-studio-muted/70 uppercase">delivery progress</p>
                </div>
                <div className="text-right">
                <p className={`text-3xl font-bold ${timeline.riskTextClass}`}>{timeline.daysLeftToHandover}</p>
                <p className="mt-1 text-[10px] font-bold tracking-wider text-studio-muted/50 uppercase">days left</p>
                </div>
              </div>
              <div className="mt-8 h-2 overflow-hidden rounded-full bg-black/[0.03]">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${timeline.riskBarClass}`}
                  style={{ width: `${timeline.progressPercent}%` }}
                />
              </div>
              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <MetricCard label="Design" value={`${timeline.designDays}d`} />
                <MetricCard label="Construction" value={`${timeline.constructionDays}d`} />
                <div className={`flex min-h-28 flex-col justify-between rounded-lg border border-black/[0.05] p-5 shadow-studioSoft transition-all hover:shadow-glow bg-white`}>
                  <p className="text-[10px] font-bold uppercase tracking-tight text-studio-muted">Risk Level</p>
                  <p className={`font-sans font-bold mt-4 text-2xl font-medium leading-tight ${timeline.riskTextClass}`}>{timeline.riskLevel}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 rounded-xl border border-black/[0.05] bg-[#f9f9f7] p-8 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-tight text-studio-orange mb-4">Milestones</p>
              <KeyDate calendarLabel="Start date" label="Project Kickoff" project={project} value={project.startDate} />
              <KeyDate label="Design Finalized" value={project.designCompleteDate} />
              <KeyDate calendarLabel="Handover date" label="Handover to Client" project={project} value={project.handoverDate} />
              <KeyDate calendarLabel="Opening date" label="Grand Opening" project={project} value={project.openingDate} />
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-10 xl:grid-cols-2">
          <div className="rounded-xl border border-black/[0.05] bg-[#f9f9f7] p-8 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-tight text-studio-orange">Financial Intelligence</p>
                <p className="mt-2 text-sm font-medium text-studio-muted/60">Comprehensive profit and cost analysis in THB.</p>
              </div>
              <ProfitStatusBadge status={financials.profitStatus} />
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <Field
                label="Area (sqm)"
                type="number"
                value={project.areaSqm || ''}
                onChange={(value) => updatePricing({ areaSqm: value })}
              />
              <Field
                label="Rate / sqm"
                type="number"
                value={project.ratePerSqm || ''}
                onChange={(value) => updatePricing({ ratePerSqm: value })}
              />
              <label className="flex items-center gap-3 mt-auto mb-3 cursor-pointer group">
                <input
                  checked={Boolean(project.useManualProjectValue)}
                  className="size-4 accent-studio-orange transition-all"
                  type="checkbox"
                  onChange={(event) => updatePricing({ useManualProjectValue: event.target.checked })}
                />
                <span className="text-[13px] font-semibold text-studio-muted transition-colors group-hover:text-studio-ink">Manual Value</span>
              </label>
              <Field
                label="Total Project Value"
                type="number"
                value={project.useManualProjectValue ? project.projectValue || '' : String(financials.automaticProjectValue || '')}
                disabled={!project.useManualProjectValue}
                onChange={(value) => onUpdate({ projectValue: value })}
              />
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <FinanceStat label="Project value" value={formatTHB(financials.projectValue)} />
              <FinanceStat label="Total cost" value={formatTHB(financials.totalCost)} />
              <FinanceStat label="Profit" value={formatTHB(financials.profit)} tone={financials.profitStatus} />
              <FinanceStat label="Margin" value={`${financials.marginPercent}%`} tone={financials.profitStatus} />
            </div>

            <div className="mt-10 border-t border-black/[0.05] pt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              <Field
                label="Design cost"
                type="number"
                value={project.designCost || ''}
                onChange={(value) => onUpdate({ designCost: value })}
              />
              <Field
                label="Perspective"
                type="number"
                value={project.perspectiveCost || ''}
                onChange={(value) => onUpdate({ perspectiveCost: value })}
              />
              <Field
                label="Working drawing"
                type="number"
                value={project.workingDrawingCost || ''}
                onChange={(value) => onUpdate({ workingDrawingCost: value })}
              />
              <Field
                label="Revisions"
                type="number"
                value={project.revisionCost || ''}
                onChange={(value) => onUpdate({ revisionCost: value })}
              />
              <Field
                label="Transport"
                type="number"
                value={project.transportCost || ''}
                onChange={(value) => onUpdate({ transportCost: value })}
              />
              <Field
                label="Site visit"
                type="number"
                value={project.siteVisitCost || ''}
                onChange={(value) => onUpdate({ siteVisitCost: value })}
              />
              <Field
                label="Misc cost"
                type="number"
                value={project.miscCost || ''}
                onChange={(value) => onUpdate({ miscCost: value })}
              />
              <FinanceStat label="Total Time cost" value={formatTHB(financials.timeCost)} />
              <Field
                label="Hours worked"
                type="number"
                value={project.hoursWorked || ''}
                onChange={(value) => onUpdate({ hoursWorked: value })}
              />
              <Field
                label="Hourly rate"
                type="number"
                value={project.hourlyRate || ''}
                onChange={(value) => onUpdate({ hourlyRate: value })}
              />
            </div>

            <div className="mt-10">
              <div className="mb-4 flex items-center justify-between gap-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-studio-muted/50">Utilization of project value</span>
                <span className="font-sans font-bold text-xl font-medium text-[#111111]">
                  {financials.projectValue ? Math.round((financials.totalCost / financials.projectValue) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/[0.03]">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${getProfitBarClass(financials.profitStatus)}`}
                  style={{
                    width: `${Math.min(financials.projectValue ? Math.round((financials.totalCost / financials.projectValue) * 100) : 0, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <div className="rounded-xl border border-black/[0.05] bg-[#f9f9f7] p-8 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-tight text-studio-orange mb-8">Documentation & Control</p>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field
                  label="Drawing link"
                  value={project.drawingLink || ''}
                  onChange={(value) => onUpdate({ drawingLink: value })}
                />
                <Field
                  label="Version"
                  value={project.drawingVersion || ''}
                  onChange={(value) => onUpdate({ drawingVersion: value })}
                />
                <StatusSelect
                  label="Drawing status"
                  options={drawingStatuses}
                  value={project.drawingStatus || 'draft'}
                  onChange={(value) => onUpdate({ drawingStatus: value })}
                />
                <div className="flex items-end mb-1">
                  <Badge tone={project.drawingStatus || 'draft'}>{project.drawingStatus || 'draft'}</Badge>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-black/[0.05] bg-[#f9f9f7] p-8 shadow-sm flex-1">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-tight text-studio-orange">Field Reports</p>
                  <p className="mt-2 text-sm font-medium text-studio-muted/60 italic">Captured site data and construction logs.</p>
                </div>
                <Button variant="secondary" onClick={addSiteLog}>
                  <Plus size={16} />
                  New Entry
                </Button>
              </div>
              <div className="grid gap-6">
                {siteLogs.length === 0 ? (
                  <EmptyState message="No site logs captured yet." />
                ) : (
                  siteLogs.map((log) => (
                    <article key={log.id} className="rounded-xl border border-black/[0.05] bg-white p-6 shadow-sm group transition-all hover:shadow-glow">
                      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <Field
                          label="Visit Date"
                          type="date"
                          value={log.date || ''}
                          wrapperClassName="w-full sm:w-48"
                          onChange={(value) => updateSiteLog(log.id, { date: value })}
                        />
                        <button
                          aria-label="Delete entry"
                          className="grid size-10 place-items-center rounded-full border border-black/[0.05] text-studio-muted/30 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                          type="button"
                          onClick={() => deleteSiteLog(log.id)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="grid gap-6 lg:grid-cols-3">
                        <Field
                          label="Field Observations"
                          multiline
                          value={log.notes || ''}
                          onChange={(value) => updateSiteLog(log.id, { notes: value })}
                        />
                        <Field
                          label="Critical Issues"
                          multiline
                          value={log.issues || ''}
                          onChange={(value) => updateSiteLog(log.id, { issues: value })}
                        />
                        <Field
                          label="Photo reference link"
                          value={log.imageLink || ''}
                          onChange={(value) => updateSiteLog(log.id, { imageLink: value })}
                        />
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </main>
  );
}
