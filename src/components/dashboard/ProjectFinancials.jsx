import {
  CalendarPlus,
  Download,
} from 'lucide-react';
import { createGoogleCalendarUrl, downloadIcsCalendarEvent, formatDate } from '../../utils/dashboard.js';
import { Badge } from '../Badge.jsx';

export function KeyDate({ calendarLabel, label, project, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-black/[0.08] pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-studio-muted">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-sm font-bold text-[#111111]">{value ? formatDate(value) : 'TBD'}</span>
        {project && calendarLabel && value && <CalendarActions date={value} label={calendarLabel} project={project} />}
      </span>
    </div>
  );
}

export function CalendarActions({ date, label, project }) {
  const openGoogleCalendar = () => {
    window.open(createGoogleCalendarUrl(project, date, label), '_blank', 'noopener,noreferrer');
  };

  return (
    <span className="flex shrink-0 items-center gap-1">
      <button
        aria-label={`Add ${label} to Google Calendar`}
        className="grid size-8 place-items-center rounded-full border border-black/[0.08] text-studio-muted transition hover:border-studio-orange hover:text-studio-orange"
        title="Add to Google Calendar"
        type="button"
        onClick={openGoogleCalendar}
      >
        <CalendarPlus size={15} />
      </button>
      <button
        aria-label={`Download ${label} ICS file`}
        className="grid size-8 place-items-center rounded-full border border-black/[0.08] text-studio-muted transition hover:border-studio-orange hover:text-studio-orange"
        title="Download .ics"
        type="button"
        onClick={() => downloadIcsCalendarEvent(project, date, label)}
      >
        <Download size={14} />
      </button>
    </span>
  );
}

export function FinanceStat({ label, value, tone = 'neutral' }) {
  const toneClass = {
    healthy: 'text-emerald-700',
    watch: 'text-amber-700',
    loss: 'text-red-700',
    neutral: 'text-[#111111]',
  }[tone];

  return (
    <div className="rounded-lg border border-black/[0.08] bg-[#f3f2ee] p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-studio-muted">{label}</p>
      <p className={`mt-2 text-xl font-extrabold leading-tight ${toneClass}`}>{value}</p>
    </div>
  );
}

export function ProfitStatusBadge({ status }) {
  const label = {
    healthy: 'Profit',
    watch: 'Low margin',
    loss: 'Loss',
  }[status];
  const tone = {
    healthy: 'low',
    watch: 'medium',
    loss: 'high',
  }[status];

  return <Badge tone={tone}>{label}</Badge>;
}

export function getProfitBarClass(status) {
  if (status === 'loss') {
    return 'bg-red-400';
  }
  if (status === 'watch') {
    return 'bg-amber-300';
  }
  return 'bg-emerald-400';
}
