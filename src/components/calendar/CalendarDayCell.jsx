import {
  buildDayCalendarLines,
} from "../../domain/calendar/buildDayCalendarLines";

function DayLine({ line }) {
  if (line.kind === "alert") {
    return (
      <div
        className="
          text-[10px] md:text-xs font-semibold
          text-red-200 truncate
        "
        title={line.tooltip}
      >
        {line.label}
      </div>
    );
  }

  return (
    <div
      className="
        text-[10px] md:text-xs text-neutral-300
        truncate cursor-default
        hover:text-brand
      "
      title={line.tooltip}
    >
      {line.label}
    </div>
  );
}

export default function CalendarDayCell({
  cell,
  schedule = null,
  events = [],
  onSelect,
}) {
  const lines = buildDayCalendarLines({
    date: cell.date,
    schedule,
    events,
  });

  const hasMajorAlert = lines.some(
    (line) => line.kind === "alert"
  );
  const isEmpty = lines.length === 0;

  let shellClass =
    "border-neutral-800 bg-surface-deep";

  if (hasMajorAlert) {
    shellClass =
      "border-red-500 bg-red-500/10 ring-2 ring-red-500/40";
  } else if (cell.isToday) {
    shellClass =
      "border-brand/50 bg-brand/5";
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(cell.date)}
      className={`
        w-full rounded-xl border p-2 text-left
        transition-all duration-200
        hover:border-brand/40
        ${isEmpty ? "min-h-[52px] md:min-h-[56px]" : "min-h-[72px] md:min-h-[88px]"}
        ${shellClass}
        ${
          !cell.isCurrentMonth
            ? "opacity-35"
            : ""
        }
      `}
    >
      <span
        className={`
          block text-sm md:text-base font-semibold mb-1
          ${
            hasMajorAlert
              ? "text-red-200"
              : cell.isToday
                ? "text-brand"
                : "text-white"
          }
        `}
      >
        {cell.dayNumber}
      </span>

      {lines.length > 0 && (
        <div className="space-y-1">
          {lines.map((line) => (
            <DayLine
              key={line.id}
              line={line}
            />
          ))}
        </div>
      )}
    </button>
  );
}
