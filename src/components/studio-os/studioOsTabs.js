import {
  CalendarClock,
  ClipboardCopy,
  FileStack,
  Image as ImageIcon,
  LayoutDashboard,
  Layers,
  ListTodo,
  Settings2,
  Signal,
  Wind,
} from 'lucide-react';

export const studioOsTabs = [
  { id: 'flow', label: 'Daily Flow', icon: Wind },
  { id: 'projects', label: 'Overview', icon: LayoutDashboard },
  { id: 'artwork', label: 'Artwork Space', icon: Layers },
  { id: 'timeline', label: 'Schedule', icon: CalendarClock },
  { id: 'documents', label: 'Documents', icon: FileStack },
  { id: 'workQueue', label: 'Work Queue', icon: ListTodo },
  { id: 'siteWatch', label: 'Site Watch', icon: Signal },
  { id: 'content', label: 'Journal', icon: ClipboardCopy },
  { id: 'portfolio', label: 'Gallery', icon: ImageIcon },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];
