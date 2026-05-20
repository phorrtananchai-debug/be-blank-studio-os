import { Button } from '../Button.jsx';

export function StudioOSAnalysisPreview({ pendingAnalysis, onCancel, onConfirm }) {
  if (!pendingAnalysis) {
    return null;
  }

  const { fileName, preview } = pendingAnalysis;

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
      <div className="mt-6 flex flex-wrap rhythm-control-gap">
        <Button onClick={onConfirm}>Apply Analysis</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </section>
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
