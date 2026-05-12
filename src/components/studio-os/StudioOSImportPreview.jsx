import { Button } from '../Button.jsx';

export function StudioOSImportPreview({ pendingBackup, studioUser, onCancel, onConfirm }) {
  if (!pendingBackup) {
    return null;
  }

  const { fileName, preview } = pendingBackup;
  const summary = `This backup contains ${preview.projects} project${preview.projects === 1 ? '' : 's'}, ${preview.contentItems} content item${preview.contentItems === 1 ? '' : 's'}, ${preview.portfolioItems} portfolio item${preview.portfolioItems === 1 ? '' : 's'}.`;
  const projectNote = studioUser
    ? `${preview.projects} project${preview.projects === 1 ? '' : 's'} will be imported to Firebase.`
    : 'Project import is skipped until a studio user is signed in.';

  return (
    <section className="rounded-2xl border border-black/[0.05] bg-white/60 p-6 shadow-studioSoft">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-[9px] font-bold uppercase  text-studio-orange">Review Backup Import</p>
          <h2 className="text-xl font-bold tracking-tight text-studio-ink">{fileName}</h2>
          <p className="text-sm font-semibold leading-6 text-studio-ink">
            {summary}
          </p>
          <p className="text-sm font-medium leading-6 text-studio-muted">
            {projectNote} Local journal and portfolio data will be replaced after confirmation.
          </p>
        </div>
        <div className="grid min-w-[280px] gap-3 lg:grid-cols-3">
          <PreviewGroup label="Projects" samples={preview.samples?.projects} value={preview.projects} />
          <PreviewGroup label="Content items" samples={preview.samples?.contentItems} value={preview.contentItems} />
          <PreviewGroup label="Portfolio items" samples={preview.samples?.portfolioItems} value={preview.portfolioItems} />
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={onConfirm}>Confirm Import</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </section>
  );
}

function PreviewGroup({ label, samples = [], value }) {
  return (
    <div className="rounded-xl border border-black/[0.05] bg-[#f9f9f7] p-4">
      <p className="text-[10px] font-bold uppercase tracking-tight text-studio-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-studio-ink">{value}</p>
      <div className="mt-3 space-y-1">
        {samples.length ? (
          samples.map((sample, index) => (
            <p key={`${sample}-${index}`} className="truncate text-xs font-medium text-studio-muted">
              {sample}
            </p>
          ))
        ) : (
          <p className="text-xs font-medium text-studio-muted">No items in backup.</p>
        )}
      </div>
    </div>
  );
}
