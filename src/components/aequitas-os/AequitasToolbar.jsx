import { ClipboardCopy, Download, RotateCcw, Upload } from 'lucide-react';
import { Badge } from '../Badge.jsx';
import { Button } from '../Button.jsx';
import { StatusToast } from '../StatusToast.jsx';

export function AequitasToolbar({
  backupInputRef,
  importInputRef,
  onCopyPrompt,
  onExportBackup,
  onExportPrompt,
  onImportAiPlan,
  onImportBackup,
  onResetToEmpty,
  onResetToSample,
  toast,
}) {
  return (
    <section className="flex flex-col border-y border-black/[0.02] rhythm-section-pad lg:flex-row lg:items-center lg:justify-between rhythm-stack">
      <div className="space-y-1">
        <p className="type-label text-studio-orange">Local-first operating layer</p>
        <p className="type-caption">
          Manual input, AI context export, manual AI import, and snapshots all stay inside this device unless you intentionally export them.
        </p>
      </div>

      <div className="flex flex-wrap items-center rhythm-control-gap">
        <Badge tone="safe">No Broker Sync</Badge>
        <Badge tone="medium">Manual-first</Badge>
        <Badge tone="review">Private Workspace</Badge>
        {toast?.message && <StatusToast message={toast.message} tone={toast.tone} />}

        <input ref={importInputRef} accept="application/json" className="hidden" type="file" onChange={onImportAiPlan} />
        <input ref={backupInputRef} accept="application/json" className="hidden" type="file" onChange={onImportBackup} />

        <Button variant="secondary" onClick={onCopyPrompt}>
          <ClipboardCopy size={14} strokeWidth={2.5} />
          Copy AI Prompt
        </Button>
        <Button variant="secondary" onClick={onExportPrompt}>
          <Download size={14} strokeWidth={2.5} />
          Export Prompt
        </Button>
        <Button variant="secondary" onClick={() => importInputRef.current?.click()}>
          <Upload size={14} strokeWidth={2.5} />
          Import AI Plan
        </Button>
        <Button variant="secondary" onClick={() => backupInputRef.current?.click()}>
          <Upload size={14} strokeWidth={2.5} />
          Import Backup
        </Button>
        <Button variant="secondary" onClick={onExportBackup}>
          <Download size={14} strokeWidth={2.5} />
          Export Backup
        </Button>
        <Button variant="secondary" onClick={onResetToSample}>
          <RotateCcw size={14} strokeWidth={2.5} />
          Reset Sample
        </Button>
        <Button onClick={onResetToEmpty}>
          <RotateCcw size={14} strokeWidth={2.5} />
          Reset Empty
        </Button>
      </div>
    </section>
  );
}
