import { useMemo } from 'react';
import { SectionCard } from '../SectionCard.jsx';
import { EmptyState } from '../EmptyState.jsx';
import { Field } from '../Field.jsx';

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

export function WorkQueueSurface({ tasks = [], onOpenTask, projects = [] }) {
  const taskRows = tasks.length ? tasks : projects.map((project, index) => ({
    dueDate: project.handoverDate || project.openingDate || '',
    id: `work-queue-fallback-${project.id || index + 1}`,
    projectId: project.id || 'UNASSIGNED',
    status: 'OPEN',
    title: project.nextAction || `Next action for ${project.name || 'project'}`,
  }));
  const orderedTasks = useMemo(() => [...taskRows].sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || ''))), [taskRows]);
  return (
    <SectionCard title="Work Queue" eyebrow="Dedicated Surface">
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
                <p className="type-caption mt-1 text-studio-muted">{task.projectId || 'Unassigned'}</p>
              </div>
              <p className="type-caption text-studio-muted">{task.dueDate || 'No date'}</p>
              <p className="type-control text-studio-muted md:text-right">{task.status || 'OPEN'}</p>
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

export function SettingsSurface({ settings, onChange, corebaseStatus }) {
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
          <p className="type-caption text-studio-muted">Fallback source: {corebaseStatus?.fallback || 'none'}</p>
          <p className="type-caption text-studio-muted">Stale data: {corebaseStatus?.stale ? 'yes' : 'no'}</p>
          <p className="type-caption text-studio-muted">Last sync: {corebaseStatus?.lastSyncAt || 'not synced yet'}</p>
          <p className="type-caption text-studio-muted">Last error code: {corebaseStatus?.lastErrorCode || 'none'}</p>
          <p className="type-caption text-studio-muted">Retryable: {corebaseStatus?.retryable ? 'yes' : 'no'}</p>
          <p className="type-caption text-studio-muted">Suggested retry: {corebaseStatus?.suggestedRetryMs ? `${corebaseStatus.suggestedRetryMs}ms` : 'n/a'}</p>
        </div>
        <p className="mt-3 type-control text-studio-muted">Read-only mode: active</p>
      </div>
    </SectionCard>
  );
}
