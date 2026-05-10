import { formatDate } from '../../utils/dashboard.js';
import { CalendarActions } from './ProjectFinancials.jsx';

export function TimelineDate({ calendarLabel, label, project, value }) {
  return (
    <div className="rounded-xl border border-black/5 bg-[#f9f9f7]/50 p-5 transition-all duration-300 hover:bg-white hover:shadow-studioSoft">
      <p className="text-[10px] font-bold uppercase text-studio-muted/50">{label}</p>
      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-[15px] font-bold text-[#111111]">{value ? formatDate(value) : 'TBD'}</p>
        {project && calendarLabel && value && <CalendarActions date={value} label={calendarLabel} project={project} />}
      </div>
    </div>
  );
}
