import { X } from 'lucide-react';
import { useOverlayContract } from './useOverlayContract.js';

function isDrawer(kind = '') {
  return kind.includes('drawer');
}

export function OverlayHost() {
  const { closeOverlay, overlay, overlayKinds } = useOverlayContract();
  if (!overlay.active) return null;

  const { active, payload } = overlay;
  const titleByKind = {
    [overlayKinds.NEW_PROJECT_MODAL]: 'New Project',
    [overlayKinds.TASK_DETAIL_DRAWER]: 'Task Detail',
    [overlayKinds.DOCUMENT_REVISION_DRAWER]: 'Document Revision',
    [overlayKinds.ARTWORK_PREVIEW_MODAL]: 'Artwork Preview',
    [overlayKinds.FILTER_DRAWER]: 'Filters',
    [overlayKinds.CONFIRMATION_DIALOG]: 'Confirm Action',
  };
  const title = payload?.title || titleByKind[active] || 'Overlay';
  const description = payload?.description || '';
  const source = payload?.source || payload?.task?.source || payload?.document?.source || payload?.artwork?.source || payload?.confirmation?.source || '';
  const drawer = isDrawer(active);
  const panelClass = drawer
    ? 'ml-auto h-full w-full max-w-md rounded-l-2xl border-l border-black/[0.08] bg-studio-bone/95 p-6 shadow-2xl'
    : 'w-full max-w-lg rounded-2xl border border-black/[0.08] bg-studio-bone/95 p-6 shadow-2xl';

  const onConfirm = async () => {
    await payload?.onConfirm?.();
    closeOverlay();
  };

  const onSecondary = async () => {
    await payload?.onSecondary?.();
    if (!payload?.keepOpenOnSecondary) {
      closeOverlay();
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex bg-black/15 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0" aria-label="Close overlay" onClick={closeOverlay} />
      <section className={`relative ${panelClass}`}>
        <header className="mb-5 flex items-start justify-between gap-4 border-b border-black/[0.06] pb-4">
          <div>
            <p className="type-label text-studio-orange">{title}</p>
            {description && <p className="type-caption mt-2 text-studio-muted">{description}</p>}
          </div>
          <button type="button" onClick={closeOverlay} className="grid h-8 w-8 place-items-center rounded-full border border-black/[0.07] text-studio-muted hover:text-studio-ink">
            <X size={14} />
          </button>
        </header>
        <div className="space-y-3 text-sm text-studio-ink">
          {source && <p className="type-caption">Source: {source}</p>}
          {payload?.task && (
            <>
              <p className="font-semibold">{payload.task.title || 'Untitled task'}</p>
              <p className="type-caption">ID: {payload.task.id || 'TASK-UNSPECIFIED'}</p>
              <p className="type-caption">Project: {payload.task.projectId || 'UNASSIGNED'}</p>
              <p className="type-caption">Status: {payload.task.status || 'OPEN'}</p>
              <p className="type-caption">Due: {payload.task.dueDate || 'No date'}</p>
              <p className="type-caption">Updated: {payload.task.updatedAt || 'Unknown'}</p>
              {(payload.task.notes || payload.task.detail) && <p className="type-caption">{payload.task.notes || payload.task.detail}</p>}
            </>
          )}
          {payload?.document && (
            <>
              <p className="font-semibold">{payload.document.title || payload.document.label || 'Untitled document'}</p>
              <p className="type-caption">ID: {payload.document.id || 'DOC-UNSPECIFIED'}</p>
              <p className="type-caption">Project: {payload.document.projectId || 'UNASSIGNED'}</p>
              <p className="type-caption">Revision: {payload.document.revision || payload.document.version || 'R0'}</p>
              <p className="type-caption">Status: {payload.document.status || 'Draft'}</p>
              <p className="type-caption">Updated: {payload.document.updatedAt || 'Unknown'}</p>
            </>
          )}
          {payload?.artwork && (
            <>
              <p className="font-semibold">{payload.artwork.title || payload.artwork.name || 'Artwork'}</p>
              <p className="type-caption">ID: {payload.artwork.id || 'ART-UNSPECIFIED'}</p>
              <p className="type-caption">Project: {payload.artwork.projectId || 'UNASSIGNED'}</p>
              <p className="type-caption">Project Name: {payload.artwork.projectName || payload.artwork.client || 'Studio'}</p>
              <p className="type-caption">Status: {payload.artwork.status || 'review'}</p>
              <p className="type-caption">Updated: {payload.artwork.updatedAt || 'Unknown'}</p>
              {payload.artwork.previewUrl && (
                <img
                  alt={payload.artwork.title || 'Artwork preview'}
                  className="mt-2 w-full rounded-lg border border-black/[0.06] object-cover"
                  src={payload.artwork.previewUrl}
                />
              )}
            </>
          )}
          {payload?.filter && (
            <>
              <p className="font-semibold">Filter Context</p>
              <p className="type-caption">ID: {payload.filter.id || 'FILTER-UNSPECIFIED'}</p>
              <p className="type-caption">Status: {payload.filter.status || 'all'}</p>
              <p className="type-caption">Query: {payload.filter.query || 'none'}</p>
              <p className="type-caption">Updated: {payload.filter.updatedAt || 'Unknown'}</p>
            </>
          )}
          {payload?.confirmation && (
            <>
              <p className="font-semibold">{payload.confirmation.name || 'Confirmation Target'}</p>
              <p className="type-caption">ID: {payload.confirmation.id || 'CONFIRMATION-UNSPECIFIED'}</p>
              <p className="type-caption">Project: {payload.confirmation.projectId || 'UNASSIGNED'}</p>
              <p className="type-caption">Status: {payload.confirmation.status || 'pending'}</p>
              <p className="type-caption">Updated: {payload.confirmation.updatedAt || 'Unknown'}</p>
            </>
          )}
          {payload?.content && <p className="type-caption">{payload.content}</p>}
          {!payload?.task && !payload?.document && !payload?.artwork && !payload?.filter && !payload?.confirmation && !payload?.content && (
            <p className="type-caption">No additional details provided.</p>
          )}
        </div>
        <footer className="mt-6 flex items-center justify-end gap-3 border-t border-black/[0.06] pt-4">
          <button type="button" className="rounded-full border border-black/[0.08] px-4 py-2 text-xs font-bold uppercase tracking-wide text-studio-muted" onClick={closeOverlay}>
            Close
          </button>
          {payload?.secondaryLabel && (
            <button type="button" className="rounded-full border border-black/[0.08] px-4 py-2 text-xs font-bold uppercase tracking-wide text-studio-ink" onClick={onSecondary}>
              {payload.secondaryLabel}
            </button>
          )}
          {payload?.confirmLabel && (
            <button type="button" className="rounded-full bg-studio-ink px-4 py-2 text-xs font-bold uppercase tracking-wide text-white" onClick={onConfirm}>
              {payload.confirmLabel}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
