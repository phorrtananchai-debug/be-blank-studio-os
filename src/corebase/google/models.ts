export type GoogleProvider = 'sheets' | 'calendar' | 'drive';

export type CorebaseProjectRef = {
  id: string;
  name: string;
  phase?: string;
};

export type CorebaseTask = {
  id: string;
  projectId: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'WAITING' | 'BLOCKED' | 'DONE';
  assignee?: string;
  dueDate?: string;
  updatedAt: string;
};

export type CorebaseDocument = {
  id: string;
  projectId: string;
  title: string;
  revision: string;
  status: 'Draft' | 'Review' | 'Approved' | 'Superseded';
  owner?: string;
  updatedAt: string;
};

export type CorebaseArtwork = {
  id: string;
  projectId: string;
  title: string;
  mediaType: 'image' | 'pdf' | 'board';
  previewUrl?: string;
  updatedAt: string;
};

export type CorebaseCalendarEvent = {
  id: string;
  projectId?: string;
  title: string;
  startAt: string;
  endAt: string;
  location?: string;
};

export type CorebaseDriveFile = {
  id: string;
  projectId?: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime: string;
};

export type CorebaseSyncResult = {
  provider: GoogleProvider;
  syncedAt: string;
  itemCount: number;
  mode: 'mock';
};
