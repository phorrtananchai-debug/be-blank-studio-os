import {
  Command as CommandIcon,
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
  onDisconnect,
  onExportBackup,
  onImportBackup,
  onOpenCommandPalette,
  onToggleDebug,
  projectsError,
  studioUser,
  toast,
}) {
  return (
    <section className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between border-y border-black/[0.02] py-12">
      <div className="space-y-1">
        <p className="type-label text-studio-orange">Realtime Workspace</p>
        <p className="type-caption">
          Projects and assets are synced via Firestore &bull; Local backups remain active.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
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
        <input ref={importInputRef} accept="application/json" className="hidden" type="file" onChange={onImportBackup} />
        <Button variant="secondary" onClick={onOpenCommandPalette}>
          <CommandIcon size={14} strokeWidth={2.5} />
          Commands
        </Button>
        <Button variant="secondary" onClick={() => importInputRef.current?.click()}>
          <Upload size={14} strokeWidth={2.5} />
          Import
        </Button>
        <Button onClick={onExportBackup}>
          <FileJson size={14} strokeWidth={2.5} />
          Export
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
