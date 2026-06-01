import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Circle,
  Layout,
  Calendar,
  Layers,
  FileText,
  Link,
  Presentation,
  ScreenShare,
  CheckSquare,
  Sparkles,
  UserRound,
  Trash2,
  Plus,
  SwatchBook,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import {
  billingMilestoneStatuses,
  billingVisibilityOptions,
  createBillingMilestoneDraft,
  normalizeBillingMilestones,
  serializeBillingMilestones,
} from '../../utils/billingMilestones.js';
import { KeyDate, FinanceStat } from './ProjectFinancials.jsx';
import { NarrativePanel } from './NarrativePanel.jsx';
import { CriticalPathPanel } from './CriticalPathPanel.jsx';
import { ArtworkSpace } from '../artwork/ArtworkSpace.jsx';
import { EmptyState } from '../EmptyState.jsx';
import { PresentationOverlay } from './PresentationOverlay.jsx';
import { createClientProjectProjection } from '../../utils/clientPresentation.js';
import {
  createSiteIssueDraft,
  createSiteVisitDraft,
  normalizeSiteVisits,
  serializeSiteVisits,
  siteVisitStatuses,
  siteVisibilityOptions,
} from '../../utils/siteVisits.js';
import {
  createMaterialApprovalDraft,
  materialApprovalStates,
  materialVisibilityOptions,
  normalizeMaterialApprovals,
  serializeMaterialApprovals,
} from '../../utils/materialApprovals.js';
import { getCanonicalProjectId } from '../../corebase/google/legacyToCorebase.ts';
import {
  addWorkScopeItem,
  getArtwork,
  getDocuments,
  getWorkScope,
  updateWorkScopeItem,
} from '../../corebase/google/selectors.ts';
import { useOverlayContract } from '../../overlays/useOverlayContract.js';
import {
  buildConfirmationPayload,
  buildDocumentRevisionPayload,
  buildTaskDetailPayload,
} from '../../overlays/overlayPayloads.js';

const drawingStatuses = ['draft', 'review', 'approved', 'issued'];

function EditorialEntry({ children, emptyText, tone = 'neutral' }) {
  const hasContent = String(children || '').trim();

  return (
    <div className="studio-accent-left min-h-28 rounded-md border border-black/[0.06] bg-studio-bone/30 p-5" data-tone={tone}>
      {hasContent ? (
        <p className="type-body whitespace-pre-wrap text-studio-ink">{children}</p>
      ) : (
        <p className="type-caption italic text-studio-muted/60">{emptyText}</p>
      )}
    </div>
  );
}

function ClientPresentationView({ project }) {
  const leadImage = project.gallery[0];
  const visibleMilestones = project.milestones.filter((milestone) => milestone.targetDate).slice(0, 6);
  const visibleDocuments = project.documents.slice(0, 4);
  const decisions = project.decisionsNeeded.slice(0, 4);
  const approvedMaterials = project.approvedMaterials.slice(0, 4);
  const clientSiteVisits = project.siteVisits.slice(0, 4);
  const billingMilestones = project.billingMilestones.slice(0, 4);
  const hasClientContent = Boolean(
    visibleMilestones.length
    || decisions.length
    || visibleDocuments.length
    || approvedMaterials.length
    || clientSiteVisits.length
    || billingMilestones.length
    || project.publicNotes.length,
  );

  return (
    <div className="h-full overflow-y-auto px-8 pb-32 pt-32 lg:px-16">
      <div className="mx-auto grid max-w-7xl gap-14">
        <section className="grid min-h-[58vh] gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div className="space-y-10">
            <div>
              <p className="type-label text-studio-muted">Client Presentation View</p>
              <h1 className="mt-4 text-6xl font-bold leading-[0.95] tracking-normal text-studio-ink lg:text-8xl">
                {project.name}
              </h1>
              <p className="type-body mt-6 max-w-2xl text-studio-muted">
                {[project.status, project.location].filter(Boolean).join(' / ')}
              </p>
            </div>
            <p className="max-w-3xl text-2xl font-semibold leading-tight text-studio-ink lg:text-3xl">
              {project.overview}
            </p>
          </div>

          <div className="overflow-hidden rounded-sm border border-black/[0.07] bg-studio-paper shadow-studioSoft">
            {leadImage ? (
              <img
                alt={leadImage.alt || project.name}
                className="aspect-[4/3] w-full object-cover"
                src={leadImage.mediumUrl || leadImage.fullUrl || leadImage.url}
              />
            ) : (
              <div className="grid aspect-[4/3] place-items-center bg-studio-bone/45">
                <p className="type-caption text-studio-muted">Visual reference will appear here when shared.</p>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-8 border-y border-black/[0.07] py-8 md:grid-cols-3">
          <ClientMetric label="Status" value={project.status} />
          <ClientMetric label="Progress" value={`${project.progressPercent}%`} />
          <ClientMetric label="Area" value={project.areaSqm ? `${project.areaSqm} sqm` : 'TBD'} />
        </section>

        <section className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="type-label text-studio-muted">Timeline</p>
            <h2 className="type-section-title mt-2">Milestones</h2>
          </div>
          <div className="grid gap-0 border-y border-black/[0.06]">
            {visibleMilestones.length ? visibleMilestones.map((milestone) => (
              <div key={milestone.id} className="grid gap-4 border-b border-black/[0.05] py-4 last:border-b-0 md:grid-cols-[1fr_8rem_8rem]">
                <p className="type-card-title">{milestone.label}</p>
                <p className="type-caption text-studio-muted">{milestone.targetDate}</p>
                <p className="type-control text-studio-muted md:text-right">{milestone.status}</p>
              </div>
            )) : (
              <p className="type-caption py-5 text-studio-muted">Milestones will be confirmed in the next presentation issue.</p>
            )}
          </div>
        </section>

        <section className="grid gap-10 lg:grid-cols-2">
          <ClientList title="Decisions Needed" empty="No client decisions are currently listed." items={decisions} />
          <ClientDocumentList documents={visibleDocuments} />
        </section>

        {!hasClientContent && (
          <section className="rounded-sm border border-dashed border-black/[0.08] bg-studio-bone/25 p-8">
            <p className="type-label text-studio-muted">Client View</p>
            <p className="type-body mt-3 text-studio-ink">Client-safe content has not been curated yet. Mark materials, site notes, and billing milestones as client visible when ready to share.</p>
          </section>
        )}

        <section className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="type-label text-studio-muted">Approved Materials</p>
            <h2 className="type-section-title mt-2">Material Archive</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {approvedMaterials.length ? approvedMaterials.map((material) => (
              <article key={`${material.name}-${material.area}`} className="rounded-sm border border-black/[0.06] bg-studio-bone/35 p-5 transition-colors duration-500 hover:bg-studio-bone/45">
                {material.image && (
                  <img
                    alt={material.image.alt || material.name}
                    className="mb-5 aspect-[4/3] w-full rounded-sm object-cover"
                    src={material.image.thumbnailUrl || material.image.mediumUrl || material.image.url}
                  />
                )}
                <p className="type-card-title">{material.name}</p>
                <p className="type-caption mt-2 text-studio-muted">
                  {[material.category, material.area, material.supplier].filter(Boolean).join(' / ') || 'Approved selection'}
                </p>
                {material.notes && <p className="type-body mt-3 text-studio-ink">{material.notes}</p>}
              </article>
            )) : (
              <div className="rounded-sm border border-dashed border-black/[0.08] bg-studio-bone/25 p-8">
                <p className="type-caption text-studio-muted">Approved materials will appear here when selections are ready to share.</p>
              </div>
            )}
          </div>
        </section>

        {!!project.publicNotes.length && (
          <section className="grid gap-10 border-t border-black/[0.07] pt-8 lg:grid-cols-[0.85fr_1.15fr]">
            <p className="type-label text-studio-muted">Notes</p>
            <div className="grid gap-4">
              {project.publicNotes.map((note) => (
                <p key={note} className="type-body text-studio-ink">{note}</p>
              ))}
            </div>
          </section>
        )}

        {!!clientSiteVisits.length && (
          <section className="grid gap-10 border-t border-black/[0.07] pt-8 lg:grid-cols-[0.85fr_1.15fr]">
            <p className="type-label text-studio-muted">Site Visits</p>
            <div className="grid gap-4">
              {clientSiteVisits.map((visit) => (
                <article key={`${visit.title}-${visit.date}`} className="rounded-sm border border-black/[0.06] bg-studio-bone/30 p-5 transition-colors duration-500 hover:bg-studio-bone/38">
                  <p className="type-card-title">{visit.title}</p>
                  <p className="type-caption mt-1 text-studio-muted">{visit.date || 'Undated'}</p>
                  {visit.notes && <p className="type-body mt-3 text-studio-ink">{visit.notes}</p>}
                  {!!visit.issues.length && (
                    <div className="mt-3 grid gap-2 border-t border-black/[0.05] pt-3">
                      {visit.issues.map((issue) => (
                        <p key={`${issue.title}-${issue.deadline}`} className="type-caption text-studio-muted">
                          {issue.title}{issue.deadline ? ` / ${issue.deadline}` : ''} / {issue.status.replace('_', ' ')}
                        </p>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {!!billingMilestones.length && (
          <section className="grid gap-10 border-t border-black/[0.07] pt-8 lg:grid-cols-[0.85fr_1.15fr]">
            <p className="type-label text-studio-muted">Billing Milestones</p>
            <div className="grid gap-3 border-y border-black/[0.06]">
              {billingMilestones.map((milestone) => (
                <article key={`${milestone.label}-${milestone.dueDate}`} className="grid gap-3 border-b border-black/[0.05] py-4 transition-colors duration-500 hover:bg-studio-bone/24 last:border-b-0 md:grid-cols-[1fr_8rem_8rem]">
                  <div>
                    <p className="type-card-title">{milestone.label}</p>
                    {milestone.amount && <p className="type-caption mt-1 text-studio-muted">{formatTHB(Number(milestone.amount || 0))}</p>}
                    {milestone.notes && <p className="type-caption mt-1 text-studio-muted">{milestone.notes}</p>}
                  </div>
                  <p className="type-caption text-studio-muted">{milestone.dueDate || 'TBD'}</p>
                  <p className="type-control text-studio-muted md:text-right">{milestone.status.replace('_', ' ')}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ClientMetric({ label, value }) {
  return (
    <div>
      <p className="type-label text-studio-muted">{label}</p>
      <p className="type-section-title mt-2">{value || 'TBD'}</p>
    </div>
  );
}

function ClientList({ empty, items, title }) {
  return (
    <section className="rounded-sm border border-black/[0.06] bg-studio-bone/32 p-6">
      <p className="type-label text-studio-muted">{title}</p>
      <div className="mt-5 grid gap-3">
        {items.length ? items.map((item) => (
          <p key={item} className="studio-accent-left type-body border-b border-black/[0.05] pb-3 pl-4 text-studio-ink last:border-b-0" data-tone="waiting">
            {item}
          </p>
        )) : (
          <p className="type-caption text-studio-muted">{empty}</p>
        )}
      </div>
    </section>
  );
}

function ClientDocumentList({ documents }) {
  return (
    <section className="rounded-sm border border-black/[0.06] bg-studio-bone/32 p-6">
      <p className="type-label text-studio-muted">Key Documents</p>
      <div className="mt-5 grid gap-3">
        {documents.length ? documents.map((document) => (
          <a
            key={`${document.label}-${document.url}`}
            className="grid gap-1 border-b border-black/[0.05] pb-3 text-studio-ink transition hover:text-studio-rust last:border-b-0"
            href={document.url || undefined}
            rel="noreferrer"
            target={document.url ? '_blank' : undefined}
          >
            <span className="type-card-title">{document.label || document.url}</span>
            {document.status && <span className="type-caption text-studio-muted">{document.status}</span>}
          </a>
        )) : (
          <p className="type-caption text-studio-muted">Key documents will appear here when ready to share.</p>
        )}
      </div>
    </section>
  );
}

const issueStatuses = siteVisitStatuses;

function getVisitTone(status) {
  if (status === 'resolved') return 'safe';
  if (status === 'in_progress') return 'watch';
  if (status === 'deferred') return 'waiting';
  return 'blocked';
}

function getIssueChipClass(status) {
  if (status === 'resolved') return 'border-studio-olive/30 bg-studio-bone/45 text-studio-olive';
  if (status === 'in_progress') return 'border-studio-ochre/30 bg-studio-bone/45 text-studio-ochre';
  if (status === 'deferred') return 'border-studio-muted/25 bg-studio-bone/35 text-studio-muted';
  return 'border-studio-rust/25 bg-studio-bone/45 text-studio-rust';
}

function getMaterialTone(state) {
  if (state === 'approved') return 'safe';
  if (state === 'waiting_review') return 'watch';
  if (state === 'rejected') return 'blocked';
  if (state === 'revised') return 'waiting';
  return 'default';
}

function getMaterialImageUrl(material) {
  const firstImage = (material.images || [])[0];
  if (!firstImage) return '';
  if (typeof firstImage === 'string') return firstImage;
  return firstImage.thumbnailUrl || firstImage.mediumUrl || firstImage.fullUrl || firstImage.url || '';
}

function getBillingTone(status) {
  if (status === 'paid') return 'safe';
  if (status === 'sent') return 'watch';
  if (status === 'overdue') return 'blocked';
  return 'default';
}

function BillingMilestonePanel({ milestones, onUpdate }) {
  const addMilestone = () => {
    onUpdate([createBillingMilestoneDraft(), ...milestones]);
  };

  const updateMilestone = (id, updates) => {
    onUpdate(milestones.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const deleteMilestone = (id) => {
    onUpdate(milestones.filter((item) => item.id !== id));
  };

  const summary = milestones.reduce(
    (acc, item) => {
      const amount = Number(item.amount || 0);
      if (!Number.isFinite(amount)) return acc;
      acc.total += amount;
      if (item.status === 'paid') acc.paid += amount;
      return acc;
    },
    { paid: 0, total: 0 },
  );

  return (
    <SectionCard title="Billing Milestones" eyebrow="Payment Schedule">
      <div className="grid gap-5">
        <div className="flex items-center justify-between border-b border-black/[0.05] pb-4">
          <div className="flex items-center gap-4">
            <p className="type-caption text-studio-muted">{milestones.length} milestone(s)</p>
            <p className="type-caption text-studio-muted">Visible total: {formatTHB(summary.total)}</p>
            <p className="type-caption text-studio-muted">Paid: {formatTHB(summary.paid)}</p>
          </div>
          <Button variant="secondary" onClick={addMilestone}>
            <Plus size={14} />
            Add Milestone
          </Button>
        </div>

        {!milestones.length && <EmptyState message="No billing milestones yet. Capture draft, sent, paid, or overdue checkpoints as needed." />}

        <div className="grid gap-3">
          {milestones.map((milestone) => (
            <article key={milestone.id} className="rounded-sm border border-black/[0.07] bg-studio-bone/30 p-4 transition-colors duration-500 hover:bg-studio-bone/38">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge tone={getBillingTone(milestone.status)}>{milestone.status.replace('_', ' ')}</Badge>
                  <Badge tone={milestone.visibility === 'client_visible' ? 'safe' : 'default'}>
                    {milestone.visibility === 'client_visible' ? 'client visible' : 'internal'}
                  </Badge>
                </div>
                <button
                  onClick={() => deleteMilestone(milestone.id)}
                  className="text-studio-muted transition-colors hover:text-studio-rust"
                  aria-label="Delete billing milestone"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Label" value={milestone.label || ''} onChange={(value) => updateMilestone(milestone.id, { label: value })} />
                <Field label="Amount" type="number" value={milestone.amount || ''} onChange={(value) => updateMilestone(milestone.id, { amount: value })} />
                <Field label="Due Date" type="date" value={milestone.dueDate || ''} onChange={(value) => updateMilestone(milestone.id, { dueDate: value })} />
                <StatusSelect
                  label="Status"
                  options={billingMilestoneStatuses}
                  value={milestone.status || 'draft'}
                  onChange={(value) => updateMilestone(milestone.id, { status: value })}
                />
                <StatusSelect
                  label="Visibility"
                  options={billingVisibilityOptions}
                  value={milestone.visibility || 'internal'}
                  onChange={(value) => updateMilestone(milestone.id, { visibility: value })}
                />
                <Field
                  label="Notes"
                  multiline
                  wrapperClassName="md:col-span-2"
                  value={milestone.notes || ''}
                  onChange={(value) => updateMilestone(milestone.id, { notes: value })}
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function ProjectTaskPanel({
  onAddTask,
  onOpenTask,
  onSaveTaskField,
  savingTaskMap = {},
  tasks,
  writeEnabled = false,
}) {
  const visibleTasks = tasks.slice(0, 6);
  const statusOptions = ['TODO', 'IN_PROGRESS', 'WAITING', 'BLOCKED', 'DONE'];
  const priorityOptions = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];

  return (
    <SectionCard
      title="Project Tasks"
      eyebrow="Operational Queue"
      action={writeEnabled ? (
        <Button variant="secondary" onClick={() => onAddTask?.()}>
          <Plus size={14} />
          Add WorkScope
        </Button>
      ) : null}
    >
      {visibleTasks.length ? (
        <div className="divide-y divide-black/[0.06] border-y border-black/[0.06]">
          {visibleTasks.map((task) => (
            <article
              key={task.id || task.title}
              className="grid cursor-pointer gap-3 py-4 md:grid-cols-[1fr_8rem_8rem]"
              role="button"
              tabIndex={0}
              onClick={() => onOpenTask?.(task)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  onOpenTask?.(task);
                }
              }}
            >
              <div>
                <p className="type-card-title">{task.title || 'Untitled Task'}</p>
                {(task.notes || task.detail) && <p className="type-caption mt-1 line-clamp-2 text-studio-muted">{task.notes || task.detail}</p>}
              </div>
              <p className="type-caption text-studio-muted">{task.dueDate || task.date || 'No date'}</p>
              <p className="type-control text-studio-muted md:text-right">{task.status || 'OPEN'}</p>
              {writeEnabled && (
                <div
                  className="mt-2 grid gap-3 border-t border-black/[0.05] pt-3 md:col-span-3 md:grid-cols-2"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="type-label text-studio-muted">Status</span>
                      <select
                        className="h-9 rounded-lg border border-black/[0.08] bg-white px-3 text-xs font-semibold text-studio-ink outline-none"
                        value={task.status || 'TODO'}
                        onChange={(event) => onSaveTaskField?.(task, { status: event.target.value })}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1">
                      <span className="type-label text-studio-muted">Priority</span>
                      <select
                        className="h-9 rounded-lg border border-black/[0.08] bg-white px-3 text-xs font-semibold text-studio-ink outline-none"
                        value={String(task.priority || 'NORMAL').toUpperCase()}
                        onChange={(event) => onSaveTaskField?.(task, { priority: event.target.value })}
                      >
                        {priorityOptions.map((priority) => (
                          <option key={priority} value={priority}>{priority}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="grid gap-2">
                    <label className="grid gap-1">
                      <span className="type-label text-studio-muted">Responsible</span>
                      <input
                        className="h-9 rounded-lg border border-black/[0.08] bg-white px-3 text-xs font-medium text-studio-ink outline-none"
                        defaultValue={task.responsible || task.assignee || ''}
                        onBlur={(event) => onSaveTaskField?.(task, { responsible: event.target.value })}
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="type-label text-studio-muted">Due / Target</span>
                      <input
                        className="h-9 rounded-lg border border-black/[0.08] bg-white px-3 text-xs font-medium text-studio-ink outline-none"
                        defaultValue={task.dueDate || ''}
                        onBlur={(event) => onSaveTaskField?.(task, { due_date: event.target.value })}
                        placeholder="YYYY-MM-DD"
                      />
                    </label>
                  </div>
                  <label className="grid gap-1 md:col-span-2">
                    <span className="type-label text-studio-muted">Decision Needed / Notes</span>
                    <textarea
                      className="min-h-20 rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-xs font-medium text-studio-ink outline-none"
                      defaultValue={task.waitingFor || task.decisionNeeded || task.notes || ''}
                      onBlur={(event) => onSaveTaskField?.(task, {
                        decision_needed: event.target.value,
                        notes: event.target.value,
                        waiting_for: event.target.value,
                      })}
                    />
                  </label>
                  {!!savingTaskMap[task.id] && (
                    <p className="type-caption text-studio-muted md:col-span-2">{savingTaskMap[task.id]}</p>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState message="No project tasks are attached yet." />
      )}
    </SectionCard>
  );
}

function ProjectDocumentPanel({ documents, onOpenDocument }) {
  const visibleDocuments = documents.slice(0, 8);
  return (
    <SectionCard title="Document Control" eyebrow="Revision Surface">
      {visibleDocuments.length ? (
        <div className="divide-y divide-black/[0.06] border-y border-black/[0.06]">
          {visibleDocuments.map((document, index) => (
            <article
              key={document.id || `${document.title || document.label}-${index}`}
              className="grid cursor-pointer gap-3 py-4 md:grid-cols-[1fr_8rem_8rem]"
              role="button"
              tabIndex={0}
              onClick={() => onOpenDocument?.(document)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  onOpenDocument?.(document);
                }
              }}
            >
              <div>
                <p className="type-card-title">{document.title || document.label || 'Untitled Document'}</p>
                {(document.url || document.webViewLink) && (
                  <p className="type-caption mt-1 line-clamp-1 text-studio-muted">{document.url || document.webViewLink}</p>
                )}
              </div>
              <p className="type-caption text-studio-muted">{document.revision || document.version || 'R0'}</p>
              <p className="type-control text-studio-muted md:text-right">{document.status || 'Draft'}</p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState message="No document rows are available yet." />
      )}
    </SectionCard>
  );
}

function MaterialApprovalArchive({ materials, onUpdate }) {
  const addMaterial = () => {
    onUpdate([createMaterialApprovalDraft(), ...materials]);
  };

  const updateMaterial = (id, updates) => {
    onUpdate(materials.map((material) => (material.id === id ? { ...material, ...updates } : material)));
  };

  const deleteMaterial = (id) => {
    onUpdate(materials.filter((material) => material.id !== id));
  };

  const groupedMaterials = materials.reduce((acc, material) => {
    const key = material.roomArea || 'Unassigned area';
    if (!acc[key]) acc[key] = [];
    acc[key].push(material);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-black/[0.05] pb-4">
        <div>
          <p className="type-label text-studio-muted">Material / FF&E</p>
          <h3 className="type-section-title mt-2">Approval Archive</h3>
        </div>
        <Button variant="secondary" onClick={addMaterial}>
          <Plus size={14} />
          Add Material
        </Button>
      </div>

      {!materials.length && <EmptyState message="No material approvals captured yet. Add proposed selections and move them through review states." />}

      <div className="grid gap-8">
        {Object.entries(groupedMaterials).map(([area, areaMaterials]) => (
          <section key={area} className="space-y-4">
            <div className="flex items-center justify-between border-b border-black/[0.05] pb-3">
              <p className="type-label text-studio-muted">{area}</p>
              <p className="type-caption text-studio-muted">{areaMaterials.length} item(s)</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {areaMaterials.map((material) => {
                const imageUrl = getMaterialImageUrl(material);
                return (
                  <article key={material.id} className="rounded-sm border border-black/[0.07] bg-studio-bone/35 p-5 transition-colors duration-500 hover:bg-studio-bone/42">
                    <div className="mb-4 overflow-hidden rounded-sm border border-black/[0.06] bg-studio-paper">
                      {imageUrl ? (
                        <img alt={material.name || 'Material reference'} className="aspect-[4/3] w-full object-cover" src={imageUrl} />
                      ) : (
                        <div className="grid aspect-[4/3] place-items-center bg-studio-bone/45">
                          <p className="type-caption text-studio-muted">Image reference pending</p>
                        </div>
                      )}
                    </div>

                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge tone={getMaterialTone(material.approvalState)}>{material.approvalState.replace('_', ' ')}</Badge>
                        <Badge tone={material.visibility === 'client_visible' ? 'safe' : 'default'}>
                          {material.visibility === 'client_visible' ? 'client visible' : 'internal'}
                        </Badge>
                      </div>
                      <button
                        onClick={() => deleteMaterial(material.id)}
                        className="text-studio-muted transition-colors hover:text-studio-rust"
                        aria-label="Delete material approval"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="grid gap-3">
                      <Field label="Name" value={material.name || ''} onChange={(value) => updateMaterial(material.id, { name: value })} />
                      <div className="grid gap-3 md:grid-cols-2">
                        <Field label="Category" value={material.category || ''} onChange={(value) => updateMaterial(material.id, { category: value })} />
                        <Field label="Room / Area" value={material.roomArea || ''} onChange={(value) => updateMaterial(material.id, { roomArea: value })} />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <Field label="Supplier" value={material.supplier || ''} onChange={(value) => updateMaterial(material.id, { supplier: value })} />
                        <Field label="Lead Time" value={material.leadTime || ''} onChange={(value) => updateMaterial(material.id, { leadTime: value })} />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <StatusSelect
                          label="Approval State"
                          options={materialApprovalStates}
                          value={material.approvalState || 'proposed'}
                          onChange={(value) => updateMaterial(material.id, { approvalState: value })}
                        />
                        <StatusSelect
                          label="Visibility"
                          options={materialVisibilityOptions}
                          value={material.visibility || 'internal'}
                          onChange={(value) => updateMaterial(material.id, { visibility: value })}
                        />
                      </div>
                      <Field
                        label="Image URL(s)"
                        value={(material.images || []).map((img) => (typeof img === 'string' ? img : img.url || '')).filter(Boolean).join('\n')}
                        onChange={(value) => updateMaterial(material.id, { images: value.split(/\n|,/).map((item) => item.trim()).filter(Boolean) })}
                      />
                      <Field
                        label="Alternatives"
                        value={(material.alternatives || []).join('\n')}
                        onChange={(value) => updateMaterial(material.id, { alternatives: value.split(/\n|,/).map((item) => item.trim()).filter(Boolean) })}
                      />
                      <Field
                        label="Notes"
                        multiline
                        value={material.notes || ''}
                        onChange={(value) => updateMaterial(material.id, { notes: value })}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function SiteVisitNotebook({ onUpdate, visits }) {
  const addVisit = () => {
    onUpdate([createSiteVisitDraft(), ...visits]);
  };

  const updateVisit = (id, updates) => {
    onUpdate(visits.map((visit) => (visit.id === id ? { ...visit, ...updates } : visit)));
  };

  const deleteVisit = (id) => {
    onUpdate(visits.filter((visit) => visit.id !== id));
  };

  const addIssue = (visit) => {
    const nextIssues = [...(visit.issues || []), createSiteIssueDraft()];
    updateVisit(visit.id, { issues: nextIssues });
  };

  const updateIssue = (visit, issueId, updates) => {
    const nextIssues = (visit.issues || []).map((issue) => (issue.id === issueId ? { ...issue, ...updates } : issue));
    updateVisit(visit.id, { issues: nextIssues });
  };

  const deleteIssue = (visit, issueId) => {
    const nextIssues = (visit.issues || []).filter((issue) => issue.id !== issueId);
    updateVisit(visit.id, { issues: nextIssues });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-black/[0.05] pb-4">
        <div>
          <p className="type-label text-studio-muted">Field Notebook</p>
          <h3 className="type-section-title mt-2">Site Visits & Issues</h3>
        </div>
        <Button variant="secondary" onClick={addVisit}>
          <Plus size={14} />
          Add Visit
        </Button>
      </div>

      {!visits.length && <EmptyState message="No site visits captured yet. Add a quick field note to start the notebook." />}

      <div className="grid gap-5">
        {visits.map((visit, index) => (
          <article key={visit.id} className="studio-accent-left rounded-lg border border-black/[0.07] bg-studio-bone/35 p-5 transition-colors duration-500 hover:bg-studio-bone/42" data-tone={getVisitTone(visit.status)}>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/[0.05] pb-4">
              <div className="space-y-2">
                <p className="type-label flex items-center gap-2 text-studio-muted">
                  <span className="studio-signal-dot" data-tone={getVisitTone(visit.status)} />
                  Visit {visits.length - index}
                </p>
                <Field
                  label="Title"
                  value={visit.title || ''}
                  wrapperClassName="min-w-[16rem]"
                  onChange={(value) => updateVisit(visit.id, { title: value })}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={getVisitTone(visit.status)}>{visit.status.replace('_', ' ')}</Badge>
                  <Badge tone={visit.visibility === 'client_visible' ? 'safe' : 'default'}>
                    {visit.visibility === 'client_visible' ? 'client visible' : 'internal'}
                  </Badge>
                </div>
              </div>
              <button
                onClick={() => deleteVisit(visit.id)}
                className="text-studio-muted transition-colors hover:text-studio-rust"
                aria-label="Delete site visit"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              <Field
                label="Date"
                type="date"
                value={visit.date || ''}
                onChange={(value) => updateVisit(visit.id, { date: value })}
              />
              <StatusSelect
                label="Status"
                options={siteVisitStatuses}
                value={visit.status || 'open'}
                onChange={(value) => updateVisit(visit.id, { status: value })}
              />
              <StatusSelect
                label="Visibility"
                options={siteVisibilityOptions}
                value={visit.visibility || 'internal'}
                onChange={(value) => updateVisit(visit.id, { visibility: value })}
              />
              <Field
                label="Contractor"
                value={visit.contractor || ''}
                onChange={(value) => updateVisit(visit.id, { contractor: value })}
              />
              <Field
                label="Attendees"
                value={visit.attendees || ''}
                onChange={(value) => updateVisit(visit.id, { attendees: value })}
              />
              <Field
                label="Assigned To"
                value={visit.assignedTo || ''}
                onChange={(value) => updateVisit(visit.id, { assignedTo: value })}
              />
              <Field
                label="Deadline"
                type="date"
                value={visit.deadline || ''}
                onChange={(value) => updateVisit(visit.id, { deadline: value })}
              />
              <Field
                label="Photo Links"
                value={(visit.photos || []).join('\n')}
                wrapperClassName="lg:col-span-2"
                onChange={(value) => updateVisit(visit.id, { photos: value.split(/\n|,/).map((item) => item.trim()).filter(Boolean) })}
              />
              <Field
                label="Notes"
                multiline
                value={visit.notes || ''}
                wrapperClassName="lg:col-span-3"
                onChange={(value) => updateVisit(visit.id, { notes: value })}
              />
            </div>

            <div className="mt-5 grid gap-3 border-y border-black/[0.05] py-4">
              <p className="type-label text-studio-muted">Metadata</p>
              <div className="flex flex-wrap items-center gap-4">
                <span className="type-caption flex items-center gap-1.5 text-studio-muted"><UserRound size={13} />{visit.contractor || 'Contractor TBD'}</span>
                <span className="type-caption flex items-center gap-1.5 text-studio-muted"><Calendar size={13} />{visit.deadline || 'No deadline'}</span>
                <span className="type-caption flex items-center gap-1.5 text-studio-muted"><Camera size={13} />{(visit.photos || []).length} photo link(s)</span>
              </div>
            </div>

            {!!visit.legacyIssuesText && (
              <div className="mt-4">
                <p className="type-caption text-studio-muted">Legacy issue note preserved:</p>
                <p className="type-body mt-1 whitespace-pre-wrap text-studio-ink">{visit.legacyIssuesText}</p>
              </div>
            )}

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="type-label text-studio-muted">Issues</p>
                <Button variant="secondary" onClick={() => addIssue(visit)}>
                  <Plus size={13} />
                  Add Issue
                </Button>
              </div>

              {!visit.issues.length && <p className="type-caption border border-dashed border-black/[0.08] bg-studio-bone/25 p-4 text-studio-muted">No issues logged yet.</p>}

              <div className="grid gap-3">
                {(visit.issues || []).map((issue) => (
                  <div key={issue.id} className="rounded-md border border-black/[0.07] bg-studio-paper/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`type-control rounded-full border px-2 py-1 ${getIssueChipClass(issue.status)}`}>
                          {issue.status.replace('_', ' ')}
                        </span>
                        <span className="type-control rounded-full border border-black/[0.08] px-2 py-1 text-studio-muted">
                          {issue.visibility === 'client_visible' ? 'client visible' : 'internal'}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteIssue(visit, issue.id)}
                        className="text-studio-muted transition-colors hover:text-studio-rust"
                        aria-label="Delete issue"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <Field label="Title" value={issue.title || ''} onChange={(value) => updateIssue(visit, issue.id, { title: value })} />
                      <StatusSelect label="Status" options={issueStatuses} value={issue.status || 'open'} onChange={(value) => updateIssue(visit, issue.id, { status: value })} />
                      <Field label="Assigned To" value={issue.assignedTo || ''} onChange={(value) => updateIssue(visit, issue.id, { assignedTo: value })} />
                      <Field label="Deadline" type="date" value={issue.deadline || ''} onChange={(value) => updateIssue(visit, issue.id, { deadline: value })} />
                      <Field label="Linked Milestone" value={issue.linkedMilestone || ''} onChange={(value) => updateIssue(visit, issue.id, { linkedMilestone: value })} />
                      <StatusSelect label="Visibility" options={siteVisibilityOptions} value={issue.visibility || 'internal'} onChange={(value) => updateIssue(visit, issue.id, { visibility: value })} />
                      <Field
                        label="Issue Notes"
                        multiline
                        wrapperClassName="md:col-span-2"
                        value={issue.notes || ''}
                        onChange={(value) => updateIssue(visit, issue.id, { notes: value })}
                      />
                    </div>
                    {issue.legacyText && (
                      <p className="type-caption mt-3 border-t border-black/[0.05] pt-3 text-studio-muted">
                        Legacy text preserved: {issue.legacyText}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      {issue.status === 'resolved' ? <CheckCircle2 size={14} className="text-studio-olive" /> : <Circle size={14} className="text-studio-muted" />}
                      <span className="type-caption text-studio-muted">{issue.notes ? 'Issue captured' : 'Add details to clarify field action.'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ProjectWorkspace({ project, tasks = [], onBack, onDelete, onUpdate, user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isPresenting, setIsPresenting] = useState(false);
  const [isClientViewOpen, setIsClientViewOpen] = useState(false);
  const [corebaseWorkScope, setCorebaseWorkScope] = useState([]);
  const [corebaseDocuments, setCorebaseDocuments] = useState([]);
  const [corebaseArtwork, setCorebaseArtwork] = useState([]);
  const [savingTaskMap, setSavingTaskMap] = useState({});
  const { openOverlay, overlayKinds } = useOverlayContract();
  const canonicalProjectId = useMemo(() => getCanonicalProjectId(project), [project]);
  const karunLiveEnabled = canonicalProjectId === 'KARUN-PHUKET-OLDTOWN';
  const timeline = calculateTimeline(project);
  const financials = calculateProjectFinancials(project);
  const localProjectTasks = useMemo(() => tasks.filter((task) => task.projectId === project.id), [project.id, tasks]);
  const siteVisits = useMemo(() => normalizeSiteVisits(project.siteLogs), [project.siteLogs]);
  const materialApprovals = useMemo(() => normalizeMaterialApprovals(project.materialApprovals), [project.materialApprovals]);
  const billingMilestones = useMemo(() => normalizeBillingMilestones(project.billingMilestones), [project.billingMilestones]);
  const clientProject = createClientProjectProjection(project);
  const projectTasks = localProjectTasks.length ? localProjectTasks : corebaseWorkScope.map((task) => ({
    ...task,
    detail: task.notes || '',
  }));
  const projectDocuments = useMemo(() => {
    const localDocuments = Array.isArray(project.documents) ? project.documents : [];
    if (localDocuments.length) return localDocuments;
    return corebaseDocuments;
  }, [corebaseDocuments, project.documents]);

  useEffect(() => {
    let cancelled = false;
    const loadCorebaseReadPaths = async () => {
      try {
        const [workScope, documents, artwork] = await Promise.all([
          getWorkScope(canonicalProjectId),
          getDocuments(canonicalProjectId),
          getArtwork(canonicalProjectId),
        ]);
        if (!cancelled) {
          setCorebaseWorkScope(Array.isArray(workScope) ? workScope : []);
          setCorebaseDocuments(Array.isArray(documents) ? documents : []);
          setCorebaseArtwork(Array.isArray(artwork) ? artwork : []);
        }
      } catch {
        if (!cancelled) {
          setCorebaseWorkScope([]);
          setCorebaseDocuments([]);
          setCorebaseArtwork([]);
        }
      }
    };
    loadCorebaseReadPaths();
    return () => {
      cancelled = true;
    };
  }, [canonicalProjectId]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Layout },
    { id: 'timeline', label: 'Timeline', icon: Calendar },
    { id: 'artwork', label: 'Artwork Space', icon: Layers },
    { id: 'notes', label: 'Notes & Logs', icon: FileText },
    { id: 'materials', label: 'Materials', icon: SwatchBook },
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

  const updateSiteVisits = (nextVisits) => {
    onUpdate({
      siteLogs: serializeSiteVisits(nextVisits),
    });
  };

  const updateMaterialApprovals = (nextMaterials) => {
    onUpdate({
      materialApprovals: serializeMaterialApprovals(nextMaterials),
    });
  };

  const updateBillingMilestones = (nextMilestones) => {
    onUpdate({
      billingMilestones: serializeBillingMilestones(nextMilestones),
    });
  };

  const requestDeleteProject = () => {
    openOverlay(overlayKinds.CONFIRMATION_DIALOG, buildConfirmationPayload({
      confirmLabel: 'Delete',
      description: `Delete ${project.name || 'this project'} from Studio OS.`,
      id: `DELETE-${project.id || 'PROJECT'}`,
      name: project.name || 'Project',
      onConfirm: onDelete,
      projectId: project.id || '',
      source: '/os/projects',
      title: 'Delete Project',
    }));
  };

  const openTaskDetailDrawer = (task) => {
    openOverlay(overlayKinds.TASK_DETAIL_DRAWER, buildTaskDetailPayload({
      ...task,
      projectId: task?.projectId || project.id || '',
    }, '/os/projects'));
  };

  const openDocumentRevisionDrawer = (document) => {
    openOverlay(overlayKinds.DOCUMENT_REVISION_DRAWER, buildDocumentRevisionPayload({
      ...document,
      projectId: document?.projectId || project.id || '',
    }, '/os/projects'));
  };

  const saveTaskFieldPatch = async (task, patch = {}) => {
    if (!karunLiveEnabled || !task?.id) return;

    setSavingTaskMap((prev) => ({ ...prev, [task.id]: 'Saving...' }));
    const result = await updateWorkScopeItem(task.id, patch, {
      projectId: canonicalProjectId,
      source: '/os/projects/karun-phuket',
    });

    if (result?.ok) {
      const normalizedPatch = {
        ...patch,
        dueDate: patch.due_date ?? task.dueDate,
        waitingFor: patch.waiting_for ?? patch.decision_needed ?? task.waitingFor,
      };
      setCorebaseWorkScope((rows) => rows.map((row) => (
        row.id === task.id
          ? { ...row, ...normalizedPatch, updatedAt: result.updatedAt || new Date().toISOString() }
          : row
      )));
      setSavingTaskMap((prev) => ({ ...prev, [task.id]: 'Saved' }));
      window.setTimeout(() => {
        setSavingTaskMap((prev) => {
          const next = { ...prev };
          delete next[task.id];
          return next;
        });
      }, 1400);
      return;
    }

    const errorMessage = result?.errorCode ? `Save failed (${result.errorCode})` : 'Save failed';
    setSavingTaskMap((prev) => ({ ...prev, [task.id]: errorMessage }));
  };

  const addKarunTask = async () => {
    if (!karunLiveEnabled) return;
    const payload = {
      decision_needed: '',
      due_date: '',
      notes: '',
      priority: 'NORMAL',
      responsible: '',
      status: 'TODO',
      title: 'New WorkScope Item',
    };
    const result = await addWorkScopeItem(payload, {
      projectId: canonicalProjectId,
      source: '/os/projects/karun-phuket',
    });

    if (!result?.ok) return;
    const nextId = result?.item?.id || `TASK-${Date.now()}`;
    setCorebaseWorkScope((rows) => [{
      id: nextId,
      projectId: canonicalProjectId,
      title: payload.title,
      status: payload.status,
      priority: payload.priority,
      notes: payload.notes,
      dueDate: payload.due_date,
      updatedAt: result.updatedAt || new Date().toISOString(),
      responsible: payload.responsible,
      waitingFor: payload.decision_needed,
    }, ...rows]);
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
      {isClientViewOpen && (
        <PresentationOverlay
          eyebrow="Client View"
          footerLabel="CLIENT PRESENTATION"
          title={clientProject.name}
          subtitle={clientProject.status}
          onExit={() => setIsClientViewOpen(false)}
        >
          <ClientPresentationView project={clientProject} />
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
            <p className="text-[10px] font-bold uppercase tracking-wider text-studio-muted/60 mt-1">
              Project ID: {canonicalProjectId} / Source: {project.source || 'local'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setIsClientViewOpen(true)}>
            <ScreenShare size={16} />
            Client View
          </Button>
          <Button variant="secondary" onClick={() => setIsPresenting(true)}>
            <Presentation size={16} />
            Present
          </Button>
          <button
            onClick={requestDeleteProject}
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
              className={`flex h-10 items-center gap-2 rounded-lg px-4 font-mono text-[11px] font-bold uppercase whitespace-nowrap transition-all ${
                isActive
                  ? 'border-l-2 border-studio-orange bg-studio-ink text-white shadow-studioSoft'
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
              <NarrativePanel project={project} tasks={tasks} onUpdate={(id, updates) => onUpdate(updates)} />

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

              <BillingMilestonePanel milestones={billingMilestones} onUpdate={updateBillingMilestones} />

              <ProjectTaskPanel
                tasks={projectTasks}
                onAddTask={addKarunTask}
                onOpenTask={openTaskDetailDrawer}
                onSaveTaskField={saveTaskFieldPatch}
                savingTaskMap={savingTaskMap}
                writeEnabled={karunLiveEnabled}
              />
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
            <CriticalPathPanel project={project} onUpdate={onUpdate} />
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
                  {!!corebaseArtwork.length && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-studio-muted">
                      {corebaseArtwork.length} mapped artwork item(s)
                    </span>
                  )}
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
            <div className="space-y-8 lg:col-span-5">
              <SectionCard title="Project Notes" eyebrow="Internal Narrative">
                <div className="grid gap-5">
                  <Field
                    inputClassName="min-h-56"
                    label="Write / Edit"
                    multiline
                    placeholder="Narrative context, client preference, material direction, decisions to remember..."
                    value={project.notes || ''}
                    onChange={(value) => onUpdate({ notes: value })}
                  />
                  <EditorialEntry emptyText="No project notes saved yet.">{project.notes || ''}</EditorialEntry>
                </div>
              </SectionCard>

              <SectionCard title="Critical Blockers" eyebrow="Operational Friction">
                <div className="grid gap-5">
                  <Field
                    inputClassName="min-h-40"
                    label="Write / Edit"
                    multiline
                    placeholder="What is blocked, who owns the answer, and what unlocks the next move?"
                    value={project.blockers || ''}
                    onChange={(value) => onUpdate({ blockers: value })}
                  />
                  <EditorialEntry emptyText="No critical blockers recorded." tone="blocked">{project.blockers || ''}</EditorialEntry>
                </div>
              </SectionCard>
            </div>
            <div className="space-y-8 lg:col-span-7">
              <SiteVisitNotebook visits={siteVisits} onUpdate={updateSiteVisits} />
            </div>
          </div>
        )}

        {activeTab === 'materials' && (
          <MaterialApprovalArchive materials={materialApprovals} onUpdate={updateMaterialApprovals} />
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
            <div className="grid gap-8">
              <ProjectDocumentPanel documents={projectDocuments} onOpenDocument={openDocumentRevisionDrawer} />
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
