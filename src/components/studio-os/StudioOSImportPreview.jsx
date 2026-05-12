import { Button } from '../Button.jsx';

export function StudioOSImportPreview({ pendingBackup, studioUser, onCancel, onConfirm }) {
  if (!pendingBackup) {
    return null;
  }

  const { fileName, preview } = pendingBackup;
  const projectNote = studioUser
    ? `${preview.projects} project${preview.projects === 1 ? '' : 's'} will be imported to Firebase.`
    : 'Project import is skipped until a studio user is signed in.';

  return (
    <section className="rounded-2xl border border-black/[0.05] bg-white/60 p-6 shadow-studioSoft">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-[9px] font-bold uppercase  text-studio-orange">Review Backup Import</p>
          <h2 className="text-xl font-bold tracking-tight text-studio-ink">{fileName}</h2>
          <p className="text-sm font-medium leading-6 text-studio-muted">
            {projectNote} Local journal and portfolio data will be replaced after confirmation.
          </p>
        </div>
        <div className="grid min-w-[280px] grid-cols-3 gap-3">
          <PreviewCount label="Projects" value={preview.projects} />
          <PreviewCount label="Journal" value={preview.contentItems} />
          <PreviewCount label="Portfolio" value={preview.portfolioItems} />
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={onConfirm}>Confirm Import</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </section>
  );
}

function PreviewCount({ label, value }) {
  return (
    <div className="rounded-xl border border-black/[0.05] bg-[#f9f9f7] p-4">
      <p className="text-[10px] font-bold uppercase tracking-tight text-studio-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-studio-ink">{value}</p>
    </div>
  );
}
