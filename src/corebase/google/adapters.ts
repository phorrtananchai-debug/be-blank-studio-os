import type {
  CorebaseArtwork,
  CorebaseCalendarEvent,
  CorebaseDocument,
  CorebaseDriveFile,
  CorebaseProjectRef,
  CorebaseSyncResult,
  CorebaseTask,
} from './models';

export interface GoogleSheetsAdapter {
  listProjects(): Promise<CorebaseProjectRef[]>;
  listTasks(projectId?: string): Promise<CorebaseTask[]>;
  listDocuments(projectId?: string): Promise<CorebaseDocument[]>;
  sync(): Promise<CorebaseSyncResult>;
}

export interface GoogleCalendarAdapter {
  listEvents(projectId?: string): Promise<CorebaseCalendarEvent[]>;
  sync(): Promise<CorebaseSyncResult>;
}

export interface GoogleDriveAdapter {
  listFiles(projectId?: string): Promise<CorebaseDriveFile[]>;
  listArtwork(projectId?: string): Promise<CorebaseArtwork[]>;
  sync(): Promise<CorebaseSyncResult>;
}

export type GoogleCorebaseAdapters = {
  sheets: GoogleSheetsAdapter;
  calendar: GoogleCalendarAdapter;
  drive: GoogleDriveAdapter;
};
