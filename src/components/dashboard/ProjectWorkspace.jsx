import {
  ArrowLeft,
  Layout,
  Calendar,
  Layers,
  FileText,
  Link,
  Presentation,
  CheckSquare,
  Sparkles,
  Trash2,
  Plus,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../Badge.jsx';
import { Button } from '../Button.jsx';
import { Field } from '../Field.jsx';
import { SectionCard } from '../SectionCard.jsx';
import { StatusSelect } from '../StatusSelect.jsx';
import {
  calculateTimeline,
  calculateProjectFinancials,
  formatTHB,
} from '../../utils/dashboard.js';
import { KeyDate, FinanceStat } from './ProjectFinancials.jsx';
import { NarrativePanel } from './NarrativePanel.jsx';
import { ArtworkSpace } from '../artwork/ArtworkSpace.jsx';
import { EmptyState } from '../EmptyState.jsx';
import { PresentationOverlay } from './PresentationOverlay.jsx';

const drawingStatuses = ['draft', 'review', 'approved', 'issued'];

export function ProjectWorkspace({ project, onBack, onDelete, onUpdate, user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isPresenting, setIsPresenting] = useState(false);
  const timeline = calculateTimeline(project);
  const financials = calculateProjectFinancials(project);
  const siteLogs = Array.isArray(project.siteLogs) ? project.siteLogs : [];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Layout },
    { id: 'timeline', label: 'Timeline', icon: Calendar },
    { id: 'artwork', label: 'Artwork Space', icon: Layers },
    { id: 'notes', label: 'Notes & Logs', icon: FileText },
    { id: 'assets', label: 'Assets', icon: Link },
    { id: 'deliverables', label: 'Deliverables', icon: CheckSquare },
    { id: 'presentation', label: 'Present', icon: Presentation },
    { id: 'ai', label: 'AI Insights', icon: Sparkles, color: 'text-studio-orange' },
  ];

  const updatePricing = (updates) => {
    const nextProject = { ...project, ...updates };
    const shouldUseManualValue = Boolean(nextProject.useManualProjectValue);
    const automaticValue = (Number(nextProject.areaSqm) || 0) * (Number(nextProject.ratePerSqm) || 0);
    onUpdate({
      ...updates,
      ...(shouldUseManualValue ? {} : { projectValue: automaticValue ? String(automaticValue) : '' }),
    });
  };

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

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {isPresenting && (
        <PresentationOverlay
          title={project.name}
          subtitle={activeTab.toUpperCase()}
          onExit={() => setIsPresenting(false)}
        >
          {activeTab === 'artwork' ? (
             <ArtworkSpace projectId={project.id} user={user} isPresentation />
          ) : (
             <div className="grid place-items-center h-full p-24">
                <div className="max-w-5xl w-full">
                   {activeTab === 'overview' && (
                      <div className="space-y-12">
                         <h1 className="text-8xl font-bold tracking-tight text-studio-ink">{project.name}</h1>
                         <p className="text-3xl font-medium text-studio-muted leading-relaxed">{project.client} &bull; {project.location}</p>
                         <div className="grid grid-cols-2 gap-12 pt-12 border-t border-black/5">
                            <div>
                               <p className="text-[11px] font-bold uppercase tracking-widest text-studio-muted">Status</p>
                               <p className="text-4xl font-bold mt-2">{project.status}</p>
                            </div>
                            <div>
                               <p className="text-[11px] font-bold uppercase tracking-widest text-studio-muted">Completion</p>
                               <p className="text-4xl font-bold mt-2">{timeline.progressPercent}%</p>
                            </div>
                         </div>
                      </div>
                   )}
                </div>
             </div>
          )}
        </PresentationOverlay>
      )}
      {/* Workspace Header */}
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b border-black/[0.05] pb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="grid h-10 w-10 place-items-center rounded-full border border-black/[0.05] bg-white text-studio-muted hover:text-studio-ink hover:border-black/20 transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-studio-ink">{project.name}</h1>
              <Badge tone={project.status}>{project.status}</Badge>
            </div>
            <p className="text-sm font-medium text-studio-muted/70 mt-1">
              {project.client || 'Client TBD'} &bull; {project.location || 'Location TBD'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setIsPresenting(true)}>
            <Presentation size={16} />
            Present
          </Button>
          <button
            onClick={onDelete}
            className="grid h-10 w-10 place-items-center rounded-full border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 transition-all"
            title="Delete Project"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      {/* Workspace Navigation */}
      <nav className="flex gap-1 overflow-x-auto pb-2 no-scrollbar border-b border-black/[0.03]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex h-10 items-center gap-2 rounded-lg px-4 text-[12px] font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-studio-ink text-white shadow-studioSoft'
                  : `text-studio-muted hover:bg-black/[0.04] hover:text-studio-ink ${tab.color || ''}`
              }`}
            >
              <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Workspace Content */}
      <div className="min-h-[60vh]">
        {activeTab === 'overview' && (
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-8">
              <NarrativePanel project={project} onUpdate={(id, updates) => onUpdate(updates)} />

              <SectionCard title="Studio Financials" eyebrow="Real-time Performance">
                <div className="grid gap-8">
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
                    <Field
                      label="Total Project Value"
                      type="number"
                      value={project.useManualProjectValue ? project.projectValue || '' : String(financials.automaticProjectValue || '')}
                      disabled={!project.useManualProjectValue}
                      onChange={(value) => onUpdate({ projectValue: value })}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <FinanceStat label="Project value" value={formatTHB(financials.projectValue)} />
                    <FinanceStat label="Total cost" value={formatTHB(financials.totalCost)} />
                    <FinanceStat label="Profit" value={formatTHB(financials.profit)} tone={financials.profitStatus} />
                    <FinanceStat label="Margin" value={`${financials.marginPercent}%`} tone={financials.profitStatus} />
                  </div>
                </div>
              </SectionCard>
            </div>

            <div className="lg:col-span-4 space-y-8">
              <div className="rounded-2xl border border-black/[0.08] bg-white p-8 shadow-studioSoft">
                <p className="text-[10px] font-bold uppercase tracking-widest text-studio-muted">Delivery Progress</p>
                <div className="mt-6 flex items-end justify-between">
                  <p className="text-5xl font-bold tracking-tight">{timeline.progressPercent}%</p>
                  <Badge tone={timeline.deliveryPressure}>{timeline.deliveryPressure}</Badge>
                </div>
                <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.03]">
                  <div
                    className={`h-full transition-all duration-1000 ${timeline.riskBarClass}`}
                    style={{ width: `${timeline.progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-black/[0.08] bg-white p-8 shadow-studioSoft space-y-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-studio-muted">Key Milestones</p>
                <KeyDate calendarLabel="Start date" label="Kickoff" project={project} value={project.startDate} />
                <KeyDate label="Design Finalized" value={project.designCompleteDate} />
                <KeyDate calendarLabel="Handover date" label="Client Handover" project={project} value={project.handoverDate} />
                <KeyDate calendarLabel="Opening date" label="Grand Opening" project={project} value={project.openingDate} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="space-y-8">
            <SectionCard title="Project Schedule" eyebrow="Operational Timeline">
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
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
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === 'artwork' && (
          <div className="space-y-6">
             <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-studio-ink">Design Surface</h3>
                  <p className="text-sm text-studio-muted">Spatial thinking and reference for {project.name}.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Cloud Synced
                  </span>
                </div>
             </div>
             <ArtworkSpace projectId={project.id} user={user} />
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4 space-y-8">
              <SectionCard title="Strategic Notes" eyebrow="Internal Narrative">
                 <Field
                  label="Project Notes"
                  multiline
                  value={project.notes || ''}
                  onChange={(value) => onUpdate({ notes: value })}
                />
                <Field
                  label="Critical Blockers"
                  multiline
                  value={project.blockers || ''}
                  onChange={(value) => onUpdate({ blockers: value })}
                />
              </SectionCard>
            </div>
            <div className="lg:col-span-8 space-y-8">
              <div className="flex items-center justify-between border-b border-black/[0.05] pb-4">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-studio-muted">Site Logs & Field Reports</h3>
                <Button variant="secondary" onClick={addSiteLog}>
                  <Plus size={14} />
                  New Entry
                </Button>
              </div>
              <div className="grid gap-6">
                {siteLogs.length === 0 ? (
                  <EmptyState message="No site logs captured yet." />
                ) : (
                  siteLogs.map((log) => (
                    <div key={log.id} className="rounded-xl border border-black/[0.08] bg-white p-6 shadow-studioSoft space-y-6">
                      <div className="flex justify-between items-center">
                        <Field
                          label="Visit Date"
                          type="date"
                          value={log.date || ''}
                          wrapperClassName="w-48"
                          onChange={(value) => onUpdate({ siteLogs: siteLogs.map(l => l.id === log.id ? {...l, date: value} : l) })}
                        />
                        <button
                           onClick={() => onUpdate({ siteLogs: siteLogs.filter(l => l.id !== log.id) })}
                           className="text-studio-muted hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <Field
                        label="Observations"
                        multiline
                        value={log.notes || ''}
                        onChange={(value) => onUpdate({ siteLogs: siteLogs.map(l => l.id === log.id ? {...l, notes: value} : l) })}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="grid gap-8 lg:grid-cols-2">
            <SectionCard title="Documentation Links" eyebrow="Digital Assets">
               <div className="space-y-6">
                <Field
                  label="Drawing Package (URL)"
                  value={project.drawingLink || ''}
                  onChange={(value) => onUpdate({ drawingLink: value })}
                />
                <Field
                  label="Revision Status"
                  value={project.drawingVersion || ''}
                  onChange={(value) => onUpdate({ drawingVersion: value })}
                />
                <StatusSelect
                  label="Control State"
                  options={drawingStatuses}
                  value={project.drawingStatus || 'draft'}
                  onChange={(value) => onUpdate({ drawingStatus: value })}
                />
              </div>
            </SectionCard>
            <div className="rounded-2xl border-2 border-dashed border-black/[0.05] bg-black/[0.01] grid place-items-center p-12 text-center">
               <div className="max-w-xs space-y-4">
                  <div className="mx-auto h-12 w-12 rounded-full bg-studio-bone grid place-items-center text-studio-muted">
                    <Link size={24} />
                  </div>
                  <h4 className="font-bold text-studio-ink">Linked Studio Assets</h4>
                  <p className="text-sm text-studio-muted font-medium">Link external CAD files, specification sheets, and client portals.</p>
                  <Button variant="secondary" disabled>Connect Resource</Button>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'deliverables' && (
           <div className="grid place-items-center min-h-[40vh] text-center p-12">
              <div className="max-w-md space-y-6">
                <div className="mx-auto h-16 w-16 rounded-full bg-studio-stone/20 grid place-items-center text-studio-muted/30">
                  <CheckSquare size={32} strokeWidth={1.5} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-studio-ink italic text-[#111111]/30">Deliverables Engine</h3>
                  <p className="text-sm font-medium text-studio-muted">Automated task tracking and phase-based deliverable checklists coming in v1.2.</p>
                </div>
              </div>
           </div>
        )}

        {activeTab === 'ai' && (
           <div className="grid place-items-center min-h-[40vh] text-center p-12 bg-studio-orange/[0.02] rounded-[40px] border border-studio-orange/10">
              <div className="max-w-md space-y-6">
                <div className="mx-auto h-16 w-16 rounded-full bg-studio-orange/10 grid place-items-center text-studio-orange">
                  <Sparkles size={32} strokeWidth={1.5} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-studio-ink uppercase tracking-widest text-studio-orange">AI Synthesis</h3>
                  <p className="text-sm font-medium text-studio-muted">Automated project summaries, risk detection, and budget forecasting powered by the Studio Context Engine.</p>
                </div>
                <Badge tone="medium">System Ready</Badge>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
