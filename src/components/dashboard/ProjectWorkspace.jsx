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
  Palette,
  CreditCard,
  Eye,
  EyeOff,
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
  const [isClientMode, setIsClientMode] = useState(false);

  const timeline = calculateTimeline(project);
  const financials = calculateProjectFinancials(project);

  const siteLogs = Array.isArray(project.siteLogs) ? project.siteLogs : [];
  const materialApprovals = Array.isArray(project.materialApprovals) ? project.materialApprovals : [];
  const billingMilestones = Array.isArray(project.billingMilestones) ? project.billingMilestones : [];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Layout },
    { id: 'timeline', label: 'Timeline', icon: Calendar },
    { id: 'artwork', label: 'Artwork Space', icon: Layers },
    { id: 'materials', label: 'Materials', icon: Palette },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'notes', label: 'Notes & Logs', icon: FileText },
    { id: 'assets', label: 'Assets', icon: Link },
    { id: 'deliverables', label: 'Deliverables', icon: CheckSquare },
    { id: 'ai', label: 'AI Insights', icon: Sparkles, color: 'text-studio-orange' },
  ].filter(tab => !isClientMode || ['overview', 'timeline', 'artwork', 'materials', 'billing', 'assets'].includes(tab.id));

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
          status: 'pending',
          imageLink: '',
        },
        ...siteLogs,
      ],
    });
  };

  const addMaterialApproval = () => {
    onUpdate({
      materialApprovals: [
        {
          id: `mat-${crypto.randomUUID()}`,
          name: 'New Material',
          description: '',
          status: 'pending',
          clientVisible: true,
          imageUrl: '',
        },
        ...materialApprovals,
      ],
    });
  };

  const addBillingMilestone = () => {
    onUpdate({
      billingMilestones: [
        {
          id: `bill-${crypto.randomUUID()}`,
          label: 'New Milestone',
          amount: '',
          date: '',
          status: 'pending',
          clientVisible: true,
        },
        ...billingMilestones,
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
                   {/* Presentation layers for other tabs can be added here, ensuring internal data is filtered */}
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
          <Button
            variant={isClientMode ? "primary" : "secondary"}
            onClick={() => setIsClientMode(!isClientMode)}
            className={isClientMode ? "bg-studio-orange hover:bg-studio-orange/90" : ""}
          >
            {isClientMode ? <EyeOff size={16} /> : <Eye size={16} />}
            {isClientMode ? 'Internal View' : 'Client Mode'}
          </Button>
          {!isClientMode && (
            <Button variant="secondary" onClick={() => setIsPresenting(true)}>
              <Presentation size={16} />
              Present
            </Button>
          )}
          {!isClientMode && (
            <button
              onClick={onDelete}
              className="grid h-10 w-10 place-items-center rounded-full border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 transition-all"
              title="Delete Project"
            >
              <Trash2 size={18} />
            </button>
          )}
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
              <NarrativePanel project={project} onUpdate={(id, updates) => onUpdate(updates)} isClientView={isClientMode} />

              {!isClientMode && (
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
              )}
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

        {activeTab === 'materials' && (
          <div className="space-y-8">
             <div className="flex items-center justify-between border-b border-black/[0.05] pb-4">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-studio-muted">Material Approvals</h3>
                {!isClientMode && (
                  <Button variant="secondary" onClick={addMaterialApproval}>
                    <Plus size={14} />
                    Add Material
                  </Button>
                )}
             </div>
             <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {materialApprovals
                  .filter(m => !isClientMode || m.clientVisible)
                  .map((mat) => (
                    <div key={mat.id} className="rounded-xl border border-black/[0.08] bg-white overflow-hidden shadow-studioSoft group">
                      <div className="aspect-square bg-studio-bone relative">
                        {mat.imageUrl ? (
                          <img src={mat.imageUrl} alt={mat.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full grid place-items-center text-studio-muted/20">
                            <Palette size={48} />
                          </div>
                        )}
                        {!isClientMode && (
                           <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => onUpdate({ materialApprovals: materialApprovals.filter(m => m.id !== mat.id) })}
                                className="bg-white/80 backdrop-blur size-8 rounded-full grid place-items-center text-red-500 shadow-sm"
                              >
                                <Trash2 size={14} />
                              </button>
                           </div>
                        )}
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <input
                            value={mat.name}
                            readOnly={isClientMode}
                            onChange={(e) => onUpdate({ materialApprovals: materialApprovals.map(m => m.id === mat.id ? {...m, name: e.target.value} : m) })}
                            className="font-bold text-studio-ink outline-none bg-transparent w-full"
                          />
                          <Badge tone={mat.status === 'approved' ? 'safe' : mat.status === 'rejected' ? 'high' : 'medium'}>
                            {mat.status}
                          </Badge>
                        </div>
                        <textarea
                          value={mat.description}
                          readOnly={isClientMode}
                          placeholder="Material description..."
                          onChange={(e) => onUpdate({ materialApprovals: materialApprovals.map(m => m.id === mat.id ? {...m, description: e.target.value} : m) })}
                          className="text-xs text-studio-muted w-full bg-transparent resize-none outline-none h-12"
                        />
                        {!isClientMode && (
                          <div className="flex items-center justify-between pt-2 border-t border-black/5">
                            <label className="flex items-center gap-2 text-[10px] font-bold uppercase cursor-pointer">
                              <input
                                type="checkbox"
                                checked={mat.clientVisible}
                                onChange={(e) => onUpdate({ materialApprovals: materialApprovals.map(m => m.id === mat.id ? {...m, clientVisible: e.target.checked} : m) })}
                              />
                              Client Visible
                            </label>
                            <select
                              value={mat.status}
                              onChange={(e) => onUpdate({ materialApprovals: materialApprovals.map(m => m.id === mat.id ? {...m, status: e.target.value} : m) })}
                              className="text-[10px] font-bold uppercase bg-studio-bone px-2 py-1 rounded"
                            >
                              <option value="pending">Pending</option>
                              <option value="approved">Approved</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                ))}
                {materialApprovals.length === 0 && <EmptyState message="No material approvals tracked yet." />}
             </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-black/[0.05] pb-4">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-studio-muted">Billing Milestones</h3>
                {!isClientMode && (
                  <Button variant="secondary" onClick={addBillingMilestone}>
                    <Plus size={14} />
                    Add Milestone
                  </Button>
                )}
            </div>
            <div className="grid gap-4">
               {billingMilestones
                 .filter(b => !isClientMode || b.clientVisible)
                 .map((bill) => (
                   <div key={bill.id} className="flex items-center gap-6 p-6 bg-white border border-black/[0.08] rounded-xl shadow-studioSoft">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                         <input
                            value={bill.label}
                            readOnly={isClientMode}
                            onChange={(e) => onUpdate({ billingMilestones: billingMilestones.map(b => b.id === bill.id ? {...b, label: e.target.value} : b) })}
                            className="font-bold text-studio-ink bg-transparent outline-none"
                         />
                         <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold text-studio-muted uppercase tracking-widest">Amount</span>
                           <input
                              type="number"
                              value={bill.amount}
                              readOnly={isClientMode}
                              onChange={(e) => onUpdate({ billingMilestones: billingMilestones.map(b => b.id === bill.id ? {...b, amount: e.target.value} : b) })}
                              className="font-bold text-studio-ink bg-transparent outline-none w-24"
                           />
                         </div>
                         <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold text-studio-muted uppercase tracking-widest">Date</span>
                           <input
                              type="date"
                              value={bill.date}
                              readOnly={isClientMode}
                              onChange={(e) => onUpdate({ billingMilestones: billingMilestones.map(b => b.id === bill.id ? {...b, date: e.target.value} : b) })}
                              className="font-bold text-studio-ink bg-transparent outline-none"
                           />
                         </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge tone={bill.status === 'paid' ? 'safe' : 'medium'}>{bill.status}</Badge>
                        {!isClientMode && (
                          <div className="flex items-center gap-3 border-l border-black/5 pl-4">
                             <label className="flex items-center gap-2 text-[10px] font-bold uppercase cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={bill.clientVisible}
                                  onChange={(e) => onUpdate({ billingMilestones: billingMilestones.map(b => b.id === bill.id ? {...b, clientVisible: e.target.checked} : b) })}
                                />
                                Visible
                             </label>
                             <select
                                value={bill.status}
                                onChange={(e) => onUpdate({ billingMilestones: billingMilestones.map(b => b.id === bill.id ? {...b, status: e.target.value} : b) })}
                                className="text-[10px] font-bold uppercase bg-studio-bone px-2 py-1 rounded"
                             >
                                <option value="pending">Pending</option>
                                <option value="invoiced">Invoiced</option>
                                <option value="paid">Paid</option>
                             </select>
                             <button
                                onClick={() => onUpdate({ billingMilestones: billingMilestones.filter(b => b.id !== bill.id) })}
                                className="text-red-500"
                             >
                               <Trash2 size={14} />
                             </button>
                          </div>
                        )}
                      </div>
                   </div>
               ))}
               {billingMilestones.length === 0 && <EmptyState message="No billing milestones defined." />}
            </div>
            {isClientMode && billingMilestones.length > 0 && (
               <div className="pt-8 border-t border-black/5 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-studio-muted">Total Projected</p>
                  <p className="text-2xl font-bold text-studio-ink mt-1">
                    {formatTHB(billingMilestones.filter(b => b.clientVisible).reduce((sum, b) => sum + (Number(b.amount) || 0), 0))}
                  </p>
               </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="grid gap-8 lg:grid-cols-12">
            {!isClientMode && (
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
            )}
            <div className={`${isClientMode ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-8`}>
              <div className="flex items-center justify-between border-b border-black/[0.05] pb-4">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-studio-muted">Site Logs & Field Reports</h3>
                {!isClientMode && (
                  <Button variant="secondary" onClick={addSiteLog}>
                    <Plus size={14} />
                    New Entry
                  </Button>
                )}
              </div>
              <div className="grid gap-6">
                {siteLogs
                  .filter(l => !isClientMode || l.status === 'issued')
                  .map((log) => (
                    <div key={log.id} className="rounded-xl border border-black/[0.08] bg-white p-6 shadow-studioSoft space-y-6">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <Field
                            label="Visit Date"
                            type="date"
                            value={log.date || ''}
                            readOnly={isClientMode}
                            wrapperClassName="w-48"
                            onChange={(value) => onUpdate({ siteLogs: siteLogs.map(l => l.id === log.id ? {...l, date: value} : l) })}
                          />
                          {isClientMode && <Badge tone="safe">Issued</Badge>}
                        </div>
                        {!isClientMode && (
                           <div className="flex items-center gap-3">
                              <select
                                value={log.status || 'pending'}
                                onChange={(e) => onUpdate({ siteLogs: siteLogs.map(l => l.id === log.id ? {...l, status: e.target.value} : l) })}
                                className="text-[10px] font-bold uppercase bg-studio-bone px-2 py-1 rounded"
                              >
                                <option value="pending">Internal</option>
                                <option value="issued">Issued to Client</option>
                              </select>
                              <button
                                onClick={() => onUpdate({ siteLogs: siteLogs.filter(l => l.id !== log.id) })}
                                className="text-studio-muted hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                           </div>
                        )}
                      </div>
                      <Field
                        label="Observations"
                        multiline
                        readOnly={isClientMode}
                        value={log.notes || ''}
                        onChange={(value) => onUpdate({ siteLogs: siteLogs.map(l => l.id === log.id ? {...l, notes: value} : l) })}
                      />
                    </div>
                  ))
                }
                {siteLogs.filter(l => !isClientMode || l.status === 'issued').length === 0 && <EmptyState message="No site logs available." />}
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
