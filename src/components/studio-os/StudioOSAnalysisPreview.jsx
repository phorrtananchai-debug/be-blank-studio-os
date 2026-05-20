import { Button } from '../Button.jsx';

export function StudioOSAnalysisPreview({ pendingAnalysis, onCancel, onConfirm }) {
  if (!pendingAnalysis) {
    return null;
  }

  const { diffPreview, fileName, preview } = pendingAnalysis;

  return (
    <section className="rounded-2xl border border-black/[0.05] bg-studio-bone/60 rhythm-card shadow-studioSoft">
      <div className="flex flex-col rhythm-stack lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="type-label text-studio-orange">Review AI Analysis</p>
          <h2 className="type-section-title">{fileName}</h2>
          <p className="type-body font-semibold text-studio-ink">
            Review AI analysis before applying to Studio OS.
          </p>
          <p className="type-body">
            This will apply confirmed priorities, constraints, notes, pressure/status metadata, and suggested operational tasks.
          </p>
          <p className="type-caption border-l border-studio-orange/40 pl-3 text-studio-muted">
            Review changes before applying. A local recovery snapshot will be created.
          </p>
          {preview.summary && <p className="type-caption border-l border-black/[0.1] pl-3">{preview.summary}</p>}
        </div>
        <div className="grid min-w-[280px] rhythm-stack-tight lg:grid-cols-3">
          <PreviewMetric label="Project updates" value={preview.projectUpdates} />
          <PreviewMetric label="New tasks" value={preview.newTasks} />
          <PreviewMetric label="Notes" value={preview.notes} />
        </div>
      </div>
      {preview.samples?.length > 0 && (
        <div className="mt-6 rounded-xl border border-black/[0.05] bg-studio-bone/45 rhythm-card-compact">
          <p className="type-control text-studio-muted">Projects touched</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {preview.samples.map((sample, index) => (
              <span key={`${sample}-${index}`} className="type-caption rounded-sm border border-black/[0.06] px-2 py-1">
                {sample}
              </span>
            ))}
          </div>
        </div>
      )}
      {diffPreview?.projectDiffs?.length > 0 && (
        <div className="mt-6 grid gap-4">
          <p className="type-label text-studio-muted">Change Preview</p>
          {diffPreview.projectDiffs.map((projectDiff) => (
            <article key={projectDiff.projectId || projectDiff.projectName} className="rounded-lg border border-black/[0.06] bg-studio-bone/42 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.05] pb-3">
                <p className="type-card-title">{projectDiff.projectName}</p>
                <p className="type-control text-studio-muted">{projectDiff.changes.length} changes / {projectDiff.skipped.length} skipped</p>
              </div>
              <div className="mt-4 grid gap-3">
                {projectDiff.changes.slice(0, 8).map((change, index) => (
                  <div key={`${change.target}-${index}`} className="grid gap-2 border-b border-black/[0.04] pb-3 last:border-b-0 lg:grid-cols-[12rem_1fr_1fr]">
                    <p className="type-control text-studio-muted">{change.field}</p>
                    <DiffValue label="Before" value={change.before} />
                    <DiffValue label="After" value={change.after} />
                  </div>
                ))}
                {!projectDiff.changes.length && <p className="type-caption text-studio-muted">No meaningful field changes detected.</p>}
                {projectDiff.suggestedTasks.length > 0 && (
                  <p className="type-caption text-studio-muted">
                    New project tasks: {projectDiff.suggestedTasks.map((task) => task.title || task.name || task.action || 'Untitled task').slice(0, 4).join(', ')}
                  </p>
                )}
                {projectDiff.skipped.length > 0 && (
                  <p className="type-caption text-studio-muted/70">
                    Skipped empty incoming fields: {projectDiff.skipped.map((item) => item.field).join(', ')}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {(diffPreview?.newTasks?.length > 0 || diffPreview?.notes?.length > 0) && (
        <div className="mt-4 rounded-lg border border-black/[0.06] bg-studio-bone/35 p-5">
          <p className="type-label text-studio-muted">Append-only Additions</p>
          {diffPreview.newTasks?.length > 0 && <p className="type-caption mt-2">Global tasks to create: {diffPreview.newTasks.length}</p>}
          {diffPreview.notes?.length > 0 && <p className="type-caption mt-1">Notes to append: {diffPreview.notes.length}</p>}
        </div>
      )}
      <div className="mt-6 flex flex-wrap rhythm-control-gap">
        <Button onClick={onConfirm}>Apply Analysis</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </section>
  );
}

function formatDiffValue(value) {
  if (Array.isArray(value)) {
    return value.length ? value.map((item) => (typeof item === 'string' ? item : item?.title || item?.id || JSON.stringify(item))).join('\n') : 'Empty';
  }
  if (value && typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value || 'Empty');
}

function DiffValue({ label, value }) {
  return (
    <div>
      <p className="type-control text-studio-muted/60">{label}</p>
      <p className="type-caption mt-1 whitespace-pre-wrap text-studio-ink">{formatDiffValue(value)}</p>
    </div>
  );
}

function PreviewMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-black/[0.05] bg-studio-bone/45 rhythm-card-compact">
      <p className="type-control text-studio-muted">{label}</p>
      <p className="type-page-title mt-2">{value}</p>
    </div>
  );
}
