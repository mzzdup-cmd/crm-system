import {
  getEventStyle,
} from "../../domain/calendar/calendarAggregator";

export default function CalendarDayCell({
  cell,
  events = [],
  onSelect,
}) {
  const preview = events.slice(0, 3);
  const hiddenCount =
    events.length - preview.length;

  return (
    <button
      type="button"
      onClick={() => onSelect(cell.date)}
      className={`
        min-h-[88px] md:min-h-[112px]
        rounded-xl border p-2 md:p-3 text-left
        transition-all duration-200
        hover:border-cyan-500/40 hover:bg-slate-800/60
        ${
          cell.isToday
            ? "border-cyan-500/60 bg-cyan-500/5"
            : "border-slate-800 bg-slate-900/50"
        }
        ${
          !cell.isCurrentMonth
            ? "opacity-40"
            : ""
        }
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`
            text-sm md:text-base font-semibold
            ${
              cell.isToday
                ? "text-cyan-300"
                : "text-slate-200"
            }
          `}
        >
          {cell.dayNumber}
        </span>

        {events.length > 0 && (
          <span className="text-[10px] md:text-xs text-slate-500">
            {events.length}
          </span>
        )}
      </div>

      <div className="mt-2 space-y-1 hidden sm:block">
        {preview.map((event) => {
          const style = getEventStyle(event);

          return (
            <div
              key={event.id}
              className={`
                truncate rounded-md border px-1.5 py-0.5
                text-[10px] md:text-xs
                ${style.chip}
              `}
              title={event.title}
            >
              {event.title}
            </div>
          );
        })}

        {hiddenCount > 0 && (
          <div className="text-[10px] text-slate-500">
            +{hiddenCount} ещё
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1 sm:hidden">
        {preview.map((event) => {
          const style = getEventStyle(event);

          return (
            <span
              key={event.id}
              className={`w-2 h-2 rounded-full ${style.dot}`}
              title={event.title}
            />
          );
        })}
      </div>
    </button>
  );
}
