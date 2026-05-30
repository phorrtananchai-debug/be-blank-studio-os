export type GoogleProvider = 'sheets' | 'calendar' | 'drive';

export type CorebaseProjectRef = {
  id: string;
  name: string;
  phase?: string;
  aliases?: string[];
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
export type WorkScopeItem = CorebaseTask & {
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  blockedBy?: string;
  waitingFor?: string;
  notes?: string;
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
export type DocumentItem = CorebaseDocument & {
  legacySource?: string;
  url?: string;
};

export type CorebaseArtwork = {
  id: string;
  projectId: string;
  title: string;
  mediaType: 'image' | 'pdf' | 'board';
  previewUrl?: string;
  updatedAt: string;
};
export type ProjectImage = CorebaseArtwork & {
  role?: 'cover' | 'gallery' | 'board';
  legacySource?: string;
};

export type CorebaseCalendarEvent = {
  id: string;
  projectId?: string;
  title: string;
  startAt: string;
  endAt: string;
  location?: string;
};
export type CalendarEvent = CorebaseCalendarEvent & {
  category?: 'timeline' | 'milestone';
  legacySource?: string;
};

export type CorebaseDriveFile = {
  id: string;
  projectId?: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime: string;
};

export type DecisionLogItem = {
  id: string;
  projectId?: string;
  title: string;
  body: string;
  type: 'journal' | 'decision' | 'site-update' | 'ai-note';
  createdAt: string;
  source?: string;
};

export type SiteUpdateItem = {
  id: string;
  projectId: string;
  title: string;
  body: string;
  date: string;
};

export type AlertItem = {
  id: string;
  projectId?: string;
  level: 'SAFE' | 'WATCH' | 'RISK' | 'CRITICAL';
  message: string;
  source: 'operational-pressure';
  createdAt: string;
};

export type CostDiffItem = {
  id: string;
  projectId: string;
  baselineCost: number;
  currentCost: number;
  delta: number;
  updatedAt: string;
};

export type CorebaseSyncResult = {
  provider: GoogleProvider;
  syncedAt: string;
  itemCount: number;
  mode: 'mock';
};
