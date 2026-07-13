import {
  buildDayManagerRows,
} from "../../domain/calendar/dayManagerRows";

import {
  getMajorCalendarAlerts,
  getMajorAlertLabel,
} from "../../domain/calendar/calendarAlerts";

function ManagerRow({ row }) {
  const rowClass = row.highlight
    ? "bg-violet-500/20 border-violet-500/40 text-violet-100"
    : "bg-slate-800/50 border-slate-700/60 text-slate-300";

  return (
    <div
      className={`
        flex items-center justify-between gap-1
        rounded border px-1 py-0.5
        text-[9px] md:text-[10px] leading-tight
        ${rowClass}
      `}
      title={row.tooltip}
    >
      <span className="font-medium truncate shrink-0 max-w-[42%]">
        {row.shortLabel}
      </span>
      <span className="truncate text-right opacity-90">
        {row.statusLabel}
      </span>
    </div>
  );
}

function MajorAlertChip({ event }) {
  return (
    <div
      className="
        rounded border border-red-500/60
        bg-red-500/30 px-1 py-0.5
        text-[9px] md:text-[10px] font-semibold
        text-red-50 truncate
      "
      title={event.title}
    >
      {getMajorAlertLabel(event)}
    </div>
  );
}

export default function CalendarDayCell({
  cell,
  schedule = null,
  events = [],
  onSelect,
}) {
  const rows = buildDayManagerRows({
    date: cell.date,
    schedule,
  });

  const majorAlerts =
    getMajorCalendarAlerts(events);
  const hasMajorAlert =
    majorAlerts.length > 0;

  const highlightCount = rows.filter(
    (row) => row.highlight
  ).length;

  let borderClass =
    "border-slate-800 bg-slate-900/50";

  if (hasMajorAlert) {
    borderClass =
      "border-red-500 bg-red-500/10 ring-2 ring-red-500/45 shadow-[0_0_16px_rgba(239,68,68,0.25)]";
  } else if (cell.isToday) {
    borderClass =
      "border-cyan-500/60 bg-cyan-500/5";
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(cell.date)}
      className={`
        min-h-[120px] md:min-h-[168px]
        rounded-xl border p-1.5 md:p-2 text-left
        transition-all duration-200
        hover:border-cyan-500/40 hover:bg-slate-800/60
        ${borderClass}
        ${
          !cell.isCurrentMonth
            ? "opacity-40"
            : ""
        }
        ${
          hasMajorAlert
            ? "hover:border-red-400 hover:ring-red-400/50"
            : ""
        }
      `}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span
          className={`
            text-sm md:text-base font-semibold
            ${
              hasMajorAlert
                ? "text-red-200"
                : cell.isToday
                  ? "text-cyan-300"
                  : "text-slate-200"
            }
          `}
        >
          {cell.dayNumber}
        </span>

        {highlightCount > 0 && !hasMajorAlert && (
          <span className="text-[10px] text-violet-300">
            {highlightCount}
          </span>
        )}
      </div>

      {majorAlerts.length > 0 && (
        <div className="space-y-0.5 mb-1">
          {majorAlerts.slice(0, 2).map((event) => (
            <MajorAlertChip
              key={event.id || `${event.type}_${event.title}`}
              event={event}
            />
          ))}
        </div>
      )}

      <div className="space-y-0.5 hidden sm:block">
        {rows.map((row) => (
          <ManagerRow
            key={row.managerId}
            row={row}
          />
        ))}
      </div>

      <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
        {hasMajorAlert && (
          <span
            className="w-2 h-2 rounded-full bg-red-400"
            title={majorAlerts.map(getMajorAlertLabel).join(", ")}
          />
        )}
        {rows.map((row) => (
          <span
            key={row.managerId}
            className={`
              w-1.5 h-1.5 rounded-full
              ${
                row.highlight
                  ? "bg-violet-400"
                  : "bg-slate-600"
              }
            `}
            title={row.tooltip}
          />
        ))}
      </div>
    </button>
  );
}
