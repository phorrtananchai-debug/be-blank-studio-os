import type { GoogleCalendarAdapter, GoogleCorebaseAdapters, GoogleDriveAdapter, GoogleSheetsAdapter } from './adapters';
import { mockArtwork, mockDocuments, mockEvents, mockFiles, mockProjects, mockTasks } from './mockData';

const createSyncResult = (provider: 'sheets' | 'calendar' | 'drive', itemCount: number) => ({
  provider,
  syncedAt: new Date().toISOString(),
  itemCount,
  mode: 'mock' as const,
});

export const createMockSheetsAdapter = (): GoogleSheetsAdapter => ({
  async listProjects() {
    return mockProjects;
  },
  async listTasks(projectId) {
    if (!projectId) return mockTasks;
    return mockTasks.filter((task) => task.projectId === projectId);
  },
  async listDocuments(projectId) {
    if (!projectId) return mockDocuments;
    return mockDocuments.filter((doc) => doc.projectId === projectId);
  },
  async sync() {
    return createSyncResult('sheets', mockProjects.length + mockTasks.length + mockDocuments.length);
  },
});

export const createMockCalendarAdapter = (): GoogleCalendarAdapter => ({
  async listEvents(projectId) {
    if (!projectId) return mockEvents;
    return mockEvents.filter((event) => event.projectId === projectId);
  },
  async sync() {
    return createSyncResult('calendar', mockEvents.length);
  },
});

export const createMockDriveAdapter = (): GoogleDriveAdapter => ({
  async listFiles(projectId) {
    if (!projectId) return mockFiles;
    return mockFiles.filter((file) => file.projectId === projectId);
  },
  async listArtwork(projectId) {
    if (!projectId) return mockArtwork;
    return mockArtwork.filter((artwork) => artwork.projectId === projectId);
  },
  async sync() {
    return createSyncResult('drive', mockFiles.length + mockArtwork.length);
  },
});

export const createMockGoogleCorebaseAdapters = (): GoogleCorebaseAdapters => ({
  sheets: createMockSheetsAdapter(),
  calendar: createMockCalendarAdapter(),
  drive: createMockDriveAdapter(),
});
