function isoNow() {
  return new Date().toISOString();
}

export function buildTaskDetailPayload(task = {}, source = '/os/work-queue') {
  return {
    description: 'Task detail from Studio operations queue.',
    source,
    task: {
      id: task.id || 'TASK-UNSPECIFIED',
      projectId: task.projectId || 'UNASSIGNED',
      status: task.status || 'OPEN',
      title: task.title || 'Untitled task',
      updatedAt: task.updatedAt || isoNow(),
      ...task,
    },
    title: 'Task Detail',
  };
}

export function buildDocumentRevisionPayload(document = {}, source = '/os/documents') {
  return {
    description: 'Document revision context from Studio document control.',
    document: {
      id: document.id || 'DOC-UNSPECIFIED',
      projectId: document.projectId || 'UNASSIGNED',
      revision: document.revision || document.version || 'R0',
      status: document.status || 'Draft',
      title: document.title || document.label || 'Untitled document',
      updatedAt: document.updatedAt || isoNow(),
      ...document,
    },
    source,
    title: 'Document Revision',
  };
}

export function buildArtworkPreviewPayload(artwork = {}, source = '/os/artwork') {
  return {
    artwork: {
      id: artwork.id || artwork.projectId || 'ART-UNSPECIFIED',
      name: artwork.name || artwork.title || 'Artwork',
      previewUrl: artwork.previewUrl || artwork.thumbnailUrl || artwork.url || '',
      projectId: artwork.projectId || 'UNASSIGNED',
      projectName: artwork.projectName || 'Studio',
      status: artwork.status || 'review',
      title: artwork.title || artwork.name || 'Artwork',
      updatedAt: artwork.updatedAt || isoNow(),
      ...artwork,
    },
    description: 'Preview studio board context before opening the full artwork surface.',
    source,
    title: 'Artwork Preview',
  };
}

export function buildFilterDrawerPayload({ query = '', status = 'all', source = '/os/projects' } = {}) {
  return {
    content: `Search query: ${query || 'none'} | Status: ${status}`,
    filter: {
      id: `FILTER-${status || 'all'}`,
      query,
      source,
      status,
      updatedAt: isoNow(),
    },
    source,
    title: 'Filter Drawer',
  };
}

export function buildConfirmationPayload({
  confirmLabel = 'Confirm',
  description = '',
  id = 'CONFIRMATION-UNSPECIFIED',
  name = 'Confirm Action',
  onConfirm,
  projectId = '',
  source = '/os/projects',
  status = 'pending',
  title = 'Confirm Action',
} = {}) {
  return {
    confirmLabel,
    confirmation: {
      id,
      name,
      projectId: projectId || 'UNASSIGNED',
      source,
      status,
      updatedAt: isoNow(),
    },
    description,
    onConfirm,
    source,
    title,
  };
}

export function buildNewProjectPayload(onConfirm, source = '/os/projects') {
  return {
    confirmLabel: 'Create Project',
    description: 'Create a new project shell and open it in the current workspace.',
    source,
    title: 'New Project',
    workspace: {
      id: 'NEW-PROJECT',
      name: 'New Project',
      source,
      updatedAt: isoNow(),
    },
    onConfirm,
  };
}
