import type {
  CorebaseArtwork,
  CorebaseCalendarEvent,
  CorebaseDocument,
  CorebaseDriveFile,
  CorebaseProjectRef,
  CorebaseTask,
} from './models';

const NOW = new Date().toISOString();

export const mockProjects: CorebaseProjectRef[] = [
  { id: 'karun-phuket', name: 'Karun Phuket', phase: 'Design Development' },
  { id: 'suriya-hills', name: 'Suriya Hills', phase: 'Execution Planning' },
];

export const mockTasks: CorebaseTask[] = [
  { id: 'task-001', projectId: 'karun-phuket', title: 'Review terrace lighting samples', status: 'IN_PROGRESS', assignee: 'Design Director', dueDate: '2026-06-03', updatedAt: NOW },
  { id: 'task-002', projectId: 'karun-phuket', title: 'Confirm stone edge detail', status: 'WAITING', assignee: 'Studio Principal', dueDate: '2026-06-05', updatedAt: NOW },
  { id: 'task-003', projectId: 'suriya-hills', title: 'Approve millwork elevation set', status: 'TODO', assignee: 'Project Lead', dueDate: '2026-06-10', updatedAt: NOW },
];

export const mockDocuments: CorebaseDocument[] = [
  { id: 'doc-001', projectId: 'karun-phuket', title: 'Drawing Set A-102', revision: 'R3', status: 'Review', owner: 'Studio Team', updatedAt: NOW },
  { id: 'doc-002', projectId: 'karun-phuket', title: 'Material Board Index', revision: 'R2', status: 'Approved', owner: 'Design Director', updatedAt: NOW },
];

export const mockEvents: CorebaseCalendarEvent[] = [
  { id: 'evt-001', projectId: 'karun-phuket', title: 'Site coordination call', startAt: '2026-06-02T03:00:00.000Z', endAt: '2026-06-02T04:00:00.000Z', location: 'Meet' },
  { id: 'evt-002', projectId: 'karun-phuket', title: 'Internal design review', startAt: '2026-06-04T07:00:00.000Z', endAt: '2026-06-04T08:30:00.000Z', location: 'Studio' },
];

export const mockFiles: CorebaseDriveFile[] = [
  { id: 'drv-001', projectId: 'karun-phuket', name: 'Karun-FF&E-Tracker.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', modifiedTime: NOW },
  { id: 'drv-002', projectId: 'karun-phuket', name: 'Karun-Issue-Log.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', modifiedTime: NOW },
];

export const mockArtwork: CorebaseArtwork[] = [
  { id: 'art-001', projectId: 'karun-phuket', title: 'Pool deck atmosphere board', mediaType: 'image', updatedAt: NOW },
  { id: 'art-002', projectId: 'karun-phuket', title: 'Lobby palette board', mediaType: 'board', updatedAt: NOW },
];
