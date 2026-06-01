import { useMemo } from 'react';
import { SectionCard } from '../SectionCard.jsx';
import { EmptyState } from '../EmptyState.jsx';
import { Field } from '../Field.jsx';
import { Button } from '../Button.jsx';

export function DocumentsSurface({ documents = [], onOpenDocument, projects = [] }) {
  const rows = documents.length ? documents : projects.flatMap((project) => (
    [{
      id: `${project.id}-drawing`,
      projectId: project.id,
      revision: project.drawingVersion || 'R0',
      status: project.drawingStatus || 'draft',
      title: `${project.name} drawing package`,
      url: project.drawingLink,
    }]
  ));

  return (
    <SectionCard title="Document Control" eyebrow="Dedicated Surface">
      {rows.length ? (
        <div className="divide-y divide-black/[0.06] border-y border-black/[0.06]">
          {rows.map((document, index) => (
            <article
              key={document.id || `${document.title}-${index}`}
              className="grid cursor-pointer gap-3 py-4 md:grid-cols-[1fr_8rem_8rem]"
              role="button"
              tabIndex={0}
              onClick={() => onOpenDocument?.(document)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onOpenDocument?.(document);
              }}
            >
              <div>
                <p className="type-card-title">{document.title || document.label || 'Untitled document'}</p>
                <p className="type-caption mt-1 text-studio-muted">{document.url || 'No URL'}</p>
              </div>
              <p className="type-caption text-studio-muted">{document.revision || 'R0'}</p>
              <p className="type-control text-studio-muted md:text-right">{document.status || 'draft'}</p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState message="No document rows are available." />
      )}
    </SectionCard>
  );
}

export function WorkQueueSurface({
  tasks = [],
  onAddKarunTask,
  onOpenTask,
  onSaveKarunTaskField,
  projects = [],
  writeEnabled = false,
}) {
  const taskRows = tasks.length ? tasks : projects.map((project, index) => ({
    dueDate: project.handoverDate || project.openingDate || '',
    id: `work-queue-fallback-${project.id || index + 1}`,
    projectId: project.id || 'UNASSIGNED',
    status: 'OPEN',
    title: project.nextAction || `Next action for ${project.name || 'project'}`,
  }));
  const orderedTasks = useMemo(() => [...taskRows].sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || ''))), [taskRows]);
  const statusOptions = ['TODO', 'IN_PROGRESS', 'WAITING', 'BLOCKED', 'DONE'];
  const priorityOptions = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];
  const isKarunTask = (task) => {
    const value = String(task?.projectId || '').toLowerCase();
    return value === 'karun-phuket' || value === 'karun-phuket-oldtown';
  };
  return (
    <SectionCard
      title="Work Queue"
      eyebrow="Dedicated Surface"
      action={writeEnabled ? (
        <Button variant="secondary" onClick={() => onAddKarunTask?.()}>
          Add Karun Item
        </Button>
      ) : null}
    >
      {orderedTasks.length ? (
        <div className="divide-y divide-black/[0.06] border-y border-black/[0.06]">
          {orderedTasks.map((task) => (
            <article
              key={task.id}
              className="grid cursor-pointer gap-3 py-4 md:grid-cols-[1fr_9rem_7rem]"
              role="button"
              tabIndex={0}
              onClick={() => onOpenTask?.(task)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onOpenTask?.(task);
              }}
            >
              <div>
                <p className="type-card-title">{task.title || 'Untitled task'}</p>
                <p className="type-caption mt-1 text-studio-muted">{task.projectId || 'Unassigned'} / {task.source || 'local'}</p>
              </div>
              <p className="type-caption text-studio-muted">{task.dueDate || 'No date'}</p>
              <p className="type-control text-studio-muted md:text-right">{task.status || 'OPEN'}</p>
              {writeEnabled && isKarunTask(task) && (
                <div className="mt-2 grid gap-3 border-t border-black/[0.05] pt-3 md:col-span-3" onClick={(event) => event.stopPropagation()}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="type-label text-studio-muted">Status</span>
                      <select
                        className="h-9 rounded-lg border border-black/[0.08] bg-white px-3 text-xs font-semibold text-studio-ink outline-none"
                        value={task.status || 'TODO'}
                        onChange={(event) => onSaveKarunTaskField?.(task, { status: event.target.value })}
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
                        onChange={(event) => onSaveKarunTaskField?.(task, { priority: event.target.value })}
                      >
                        {priorityOptions.map((priority) => (
                          <option key={priority} value={priority}>{priority}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="grid gap-1">
                    <span className="type-label text-studio-muted">Notes</span>
                    <textarea
                      className="min-h-16 rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-xs font-medium text-studio-ink outline-none"
                      defaultValue={task.notes || ''}
                      onBlur={(event) => onSaveKarunTaskField?.(task, { notes: event.target.value })}
                    />
                  </label>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState message="No operational tasks are visible." />
      )}
    </SectionCard>
  );
}

export function SiteWatchSurface({ projects = [], siteUpdates = [] }) {
  const rows = useMemo(() => {
    if (siteUpdates.length) {
      return siteUpdates.map((item) => ({
        date: item.date || item.createdAt || '',
        id: item.id,
        issues: item.issues || '',
        notes: item.body || item.message || '',
        projectName: item.projectName || item.projectId || 'Studio',
        title: item.title || 'Site log',
      }));
    }
    return projects.flatMap((project) => (
      Array.isArray(project.siteLogs) ? project.siteLogs.map((log) => ({ ...log, projectName: project.name })) : []
    ));
  }, [projects, siteUpdates]);
  return (
    <SectionCard title="Site Watch" eyebrow="Dedicated Surface">
      {rows.length ? (
        <div className="divide-y divide-black/[0.06] border-y border-black/[0.06]">
          {rows.map((log, index) => (
            <article key={`${log.id || index}-${log.projectName}`} className="grid gap-2 py-4">
              <p className="type-card-title">{log.projectName}</p>
              <p className="type-caption text-studio-muted">{log.date || 'No date'} / {log.title || 'Site log'}</p>
              <p className="type-body text-studio-ink">{log.notes || log.issues || 'No note'}</p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState message="No site-watch rows are available." />
      )}
    </SectionCard>
  );
}

export function SettingsSurface({
  settings,
  onChange,
  corebaseStatus,
  corebaseVerification,
  runtimeOverride,
  onRuntimeOverrideChange,
  onSaveRuntimeOverride,
  onClearRuntimeOverride,
  onVerifyGoogleCorebase,
  verifyingCorebase = false,
}) {
  const setupChecklist = [
    {
      done: Boolean(corebaseStatus?.lastSyncAt && corebaseStatus?.mode === 'google-readonly'),
      label: 'Sheet template created',
    },
    {
      done: Boolean(corebaseStatus?.endpointConfigured),
      label: 'Apps Script deployed',
    },
    {
      done: Boolean(corebaseStatus?.endpointConfigured),
      label: 'Endpoint configured',
    },
    {
      done: corebaseStatus?.mode === 'google-readonly',
      label: 'Read-only mode active',
    },
    {
      done: Boolean(corebaseStatus?.lastSyncAt && !corebaseStatus?.lastErrorCode),
      label: 'First sync successful',
    },
    {
      done: corebaseStatus?.mode === 'karun-live-control' ? false : true,
      label: corebaseStatus?.mode === 'karun-live-control' ? 'Write-back limited to Karun only' : 'Write-back disabled',
    },
  ];

  return (
    <SectionCard title="Studio System Settings" eyebrow="Dedicated Surface">
      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label="Studio Label"
          value={settings.studioLabel}
          onChange={(value) => onChange({ ...settings, studioLabel: value })}
        />
        <Field
          label="Operational Timezone"
          value={settings.timezone}
          onChange={(value) => onChange({ ...settings, timezone: value })}
        />
        <Field
          label="Review Cadence"
          value={settings.reviewCadence}
          onChange={(value) => onChange({ ...settings, reviewCadence: value })}
        />
        <Field
          label="Backup Retention"
          value={settings.backupRetention}
          onChange={(value) => onChange({ ...settings, backupRetention: value })}
        />
      </div>
      <div className="mt-8 rounded-3xl border border-black/[0.06] bg-white/70 p-6">
        <p className="type-label text-studio-muted">Corebase Sync Status</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <p className="type-caption text-studio-muted">Corebase mode: {corebaseStatus?.mode || 'mock'}</p>
          <p className="type-caption text-studio-muted">Endpoint configured: {corebaseStatus?.endpointConfigured ? 'yes' : 'no'}</p>
          <p className="type-caption text-studio-muted">Endpoint host: {corebaseStatus?.endpointHost || 'n/a'}</p>
          <p className="type-caption text-studio-muted">Override active: {corebaseStatus?.overrideActive ? 'yes' : 'no'}</p>
          <p className="type-caption text-studio-muted">Fallback source: {corebaseStatus?.fallback || 'none'}</p>
          <p className="type-caption text-studio-muted">Stale data: {corebaseStatus?.stale ? 'yes' : 'no'}</p>
          <p className="type-caption text-studio-muted">Last sync: {corebaseStatus?.lastSyncAt || 'not synced yet'}</p>
          <p className="type-caption text-studio-muted">Last error code: {corebaseStatus?.lastErrorCode || 'none'}</p>
          <p className="type-caption text-studio-muted">Retryable: {corebaseStatus?.retryable ? 'yes' : 'no'}</p>
          <p className="type-caption text-studio-muted">Suggested retry: {corebaseStatus?.suggestedRetryMs ? `${corebaseStatus.suggestedRetryMs}ms` : 'n/a'}</p>
        </div>
        <p className="mt-3 type-control text-studio-muted">
          Read-only mode: {corebaseStatus?.mode === 'karun-live-control' ? 'partial (Karun write enabled)' : 'active'}
        </p>
        {!corebaseStatus?.endpointConfigured && (
          <p className="mt-2 type-caption text-studio-muted">
            Endpoint not configured. Set deployment env vars and redeploy. Or use Runtime Override below for browser-only testing.
          </p>
        )}
      </div>
      <div className="mt-6 rounded-3xl border border-black/[0.06] bg-white/70 p-6">
        <p className="type-label text-studio-muted">Google Corebase Runtime Override</p>
        <p className="mt-2 type-caption text-studio-muted">
          Browser-only override for testing when deployment env vars are unavailable.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="type-label text-studio-muted">Mode</span>
            <select
              className="h-10 rounded-xl border border-black/[0.08] bg-white px-3 text-xs font-semibold text-studio-ink outline-none"
              value={runtimeOverride?.mode || 'mock'}
              onChange={(event) => onRuntimeOverrideChange?.({ ...runtimeOverride, mode: event.target.value })}
            >
              <option value="mock">mock</option>
              <option value="google-readonly">google-readonly</option>
              <option value="karun-live-control">karun-live-control</option>
            </select>
          </label>
          <label className="grid gap-1 sm:col-span-2">
            <span className="type-label text-studio-muted">Endpoint</span>
            <input
              type="url"
              className="h-10 rounded-xl border border-black/[0.08] bg-white px-3 text-xs font-medium text-studio-ink outline-none"
              value={runtimeOverride?.endpoint || ''}
              onChange={(event) => onRuntimeOverrideChange?.({ ...runtimeOverride, endpoint: event.target.value })}
              placeholder="https://script.google.com/macros/s/.../exec"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onSaveRuntimeOverride}>Save Override</Button>
          <Button variant="ghost" onClick={onClearRuntimeOverride}>Clear Override</Button>
          <Button variant="secondary" onClick={onVerifyGoogleCorebase} disabled={verifyingCorebase}>
            {verifyingCorebase ? 'Verifying...' : 'Verify Now'}
          </Button>
        </div>
      </div>
      <div className="mt-6 rounded-3xl border border-black/[0.06] bg-white/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="type-label text-studio-muted">Google Corebase Verification</p>
          <Button variant="secondary" onClick={onVerifyGoogleCorebase} disabled={verifyingCorebase}>
            {verifyingCorebase ? 'Verifying...' : 'Verify Google Corebase'}
          </Button>
        </div>
        <p className="mt-3 type-caption text-studio-muted">
          Run a safe read-only check for projects, workscope, documents, images, calendar, and alerts.
        </p>
        {corebaseVerification && (
          <div className="mt-4 rounded-2xl border border-black/[0.06] bg-studio-bone/30 p-4">
            <p className="type-caption text-studio-muted">Result: {corebaseVerification.ok ? 'pass' : 'fail'}</p>
            <p className="type-caption text-studio-muted">Mode: {corebaseVerification.mode || 'mock'}</p>
            <p className="type-caption text-studio-muted">Endpoint configured: {corebaseVerification.endpointConfigured ? 'yes' : 'no'}</p>
            <p className="type-caption text-studio-muted">Endpoint host: {corebaseVerification.endpointHost || 'n/a'}</p>
            <p className="type-caption text-studio-muted">WorkScope count: {corebaseVerification.workscopeCount ?? 0}</p>
            <p className="type-caption text-studio-muted">First WorkScope item: {corebaseVerification.workscopeFirstItemId || 'n/a'}</p>
            <p className="type-caption text-studio-muted">WorkScope source: {corebaseVerification.workscopeSource || 'n/a'}</p>
            <p className="type-caption text-studio-muted">Message: {corebaseVerification.message || 'No message'}</p>
            <p className="type-caption text-studio-muted">Error code: {corebaseVerification.errorCode || 'none'}</p>
          </div>
        )}
      </div>
      <div className="mt-6 rounded-3xl border border-black/[0.06] bg-white/70 p-6">
        <p className="type-label text-studio-muted">Read-only Setup Checklist</p>
        <div className="mt-4 grid gap-2">
          {setupChecklist.map((item) => (
            <p key={item.label} className="type-caption text-studio-muted">
              [{item.done ? 'x' : ' '}] {item.label}
            </p>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
