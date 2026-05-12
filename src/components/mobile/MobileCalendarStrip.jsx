import { isSameDay } from '../../pages/mobile/mobileTaskUtils.js';

export function MobileCalendarStrip({ onSelectDate, selectedDate, weekDays }) {
  return (
    <div className="mt-8 flex gap-3 overflow-x-auto snap-x no-scrollbar px-1">
      {weekDays.map((day) => {
        const selected = isSameDay(day.date, selectedDate);
        return (
          <button
            key={day.date.toISOString()}
            className={`flex shrink-0 snap-start cursor-pointer flex-col items-center justify-center rounded-[18px] px-4 py-3 text-center transition duration-[120ms] ease-out active:scale-95 ${selected ? 'bg-[#212121] text-white' : 'bg-white text-[#212121]'}`}
            type="button"
            onClick={() => onSelectDate(day.date)}
          >
            <span className={`block text-[10px] font-semibold uppercase tracking-tight ${selected ? 'text-white/60' : 'text-[#777777]'}`}>
              {day.date.toLocaleDateString([], { weekday: 'short' })}
            </span>
            <span className="mt-1 block text-sm font-bold">{day.date.getDate()}</span>
            {selected && <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#EFFF0A]" />}
          </button>
        );
      })}
    </div>
  );
}
