import {
  Command as CommandIcon,
  ClipboardCopy,
  FileJson,
  LayoutDashboard,
  Upload,
} from 'lucide-react';
import { Badge } from '../Badge.jsx';
import { Button } from '../Button.jsx';
import { StatusToast } from '../StatusToast.jsx';

export function StudioOSToolbar({
  authMessage,
  dataMode,
  importInputRef,
  isFirebaseConfigured,
  onCopyIntelligenceJson,
  onCopyIntelligencePrompt,
  onCopyWeeklyReview,
  onDisconnect,
  onExportBackup,
  onExportIntelligenceJson,
  onExportIntelligenceSummary,
  onExportWeeklyReviewBriefing,
  onExportWeeklyReviewJson,
  onImportFile,
  onOpenCommandPalette,
  onRequestAnalysisImport,
  onRequestBackupImport,
  onRestoreLastAiSnapshot,
  onToggleDebug,
  projectsError,
  studioUser,
  toast,
}) {
  return (
    <section className="flex flex-col rhythm-stack lg:flex-row lg:items-center lg:justify-between border-y border-black/[0.02] rhythm-section-pad">
      <div className="space-y-1">
        <p className="type-label text-studio-orange">Realtime Workspace</p>
        <p className="type-caption">
          Projects and assets are synced via Firestore &bull; Local backups remain active.
        </p>
      </div>
      <div className="flex flex-wrap items-center rhythm-control-gap">
        <Badge tone={dataMode === 'firebase' ? 'safe' : 'medium'}>
          {dataMode === 'firebase' ? 'Encrypted Connection' : 'Sync Offline'}
        </Badge>
        {isFirebaseConfigured && studioUser && (
          <Button variant="secondary" onClick={onDisconnect}>
            Disconnect
          </Button>
        )}
        {(authMessage || projectsError) && <span className="type-control text-red-500">{authMessage || projectsError}</span>}
        {toast?.message && <StatusToast message={toast.message} tone={toast.tone} />}
        <input ref={importInputRef} accept="application/json" className="hidden" type="file" onChange={onImportFile} />
        <Button variant="secondary" onClick={onOpenCommandPalette}>
          <CommandIcon size={14} strokeWidth={2.5} />
          Commands
        </Button>
        <Button variant="secondary" onClick={onCopyIntelligencePrompt}>
          <ClipboardCopy size={14} strokeWidth={2.5} />
          AI Prompt
        </Button>
        <Button variant="secondary" onClick={onCopyWeeklyReview}>
          <ClipboardCopy size={14} strokeWidth={2.5} />
          Copy Weekly Review
        </Button>
        <Button variant="secondary" onClick={onExportWeeklyReviewBriefing}>
          <FileJson size={14} strokeWidth={2.5} />
          Briefing Text
        </Button>
        <Button variant="secondary" onClick={onExportWeeklyReviewJson}>
          <FileJson size={14} strokeWidth={2.5} />
          Weekly JSON
        </Button>
        <Button variant="secondary" onClick={onCopyIntelligenceJson}>
          <ClipboardCopy size={14} strokeWidth={2.5} />
          Copy JSON
        </Button>
        <Button variant="secondary" onClick={onExportIntelligenceSummary}>
          <FileJson size={14} strokeWidth={2.5} />
          Summary Text
        </Button>
        <Button variant="secondary" onClick={onRequestAnalysisImport}>
          <Upload size={14} strokeWidth={2.5} />
          Import Analysis
        </Button>
        <Button variant="secondary" onClick={onRestoreLastAiSnapshot}>
          <FileJson size={14} strokeWidth={2.5} />
          Restore AI Snapshot
        </Button>
        <Button variant="secondary" onClick={onRequestBackupImport}>
          <Upload size={14} strokeWidth={2.5} />
          Import
        </Button>
        <Button variant="secondary" onClick={onExportBackup}>
          <FileJson size={14} strokeWidth={2.5} />
          Export
        </Button>
        <Button aria-label="Download Intelligence JSON" onClick={onExportIntelligenceJson}>
          <FileJson size={14} strokeWidth={2.5} />
          Export Intelligence JSON
        </Button>
        <button
          onClick={onToggleDebug}
          className="size-11 grid place-items-center rounded-full border border-black/[0.03] text-studio-muted hover:text-studio-ink transition-colors"
        >
          <LayoutDashboard size={16} strokeWidth={1.5} />
        </button>
      </div>
    </section>
  );
}
