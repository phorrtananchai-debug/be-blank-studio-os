import {
  CalendarClock,
  ClipboardCopy,
  Image as ImageIcon,
  LayoutDashboard,
  Layers,
  Wind,
} from 'lucide-react';

export const studioOsTabs = [
  { id: 'flow', label: 'Daily Flow', icon: Wind },
  { id: 'projects', label: 'Overview', icon: LayoutDashboard },
  { id: 'artwork', label: 'Artwork Space', icon: Layers },
  { id: 'timeline', label: 'Schedule', icon: CalendarClock },
  { id: 'content', label: 'Journal', icon: ClipboardCopy },
  { id: 'portfolio', label: 'Gallery', icon: ImageIcon },
];
