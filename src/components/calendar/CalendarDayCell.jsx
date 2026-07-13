import {
  buildDayManagerRows,
} from "../../domain/calendar/dayManagerRows";

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

export default function CalendarDayCell({
  cell,
  schedule = null,
  onSelect,
}) {
  const rows = buildDayManagerRows({
    date: cell.date,
    schedule,
  });

  const highlightCount = rows.filter(
    (row) => row.highlight
  ).length;

  return (
    <button
      type="button"
      onClick={() => onSelect(cell.date)}
      className={`
        min-h-[120px] md:min-h-[168px]
        rounded-xl border p-1.5 md:p-2 text-left
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
      <div className="flex items-center justify-between gap-2 mb-1">
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

        {highlightCount > 0 && (
          <span className="text-[10px] text-violet-300">
            {highlightCount}
          </span>
        )}
      </div>

      <div className="space-y-0.5 hidden sm:block">
        {rows.map((row) => (
          <ManagerRow
            key={row.managerId}
            row={row}
          />
        ))}
      </div>

      <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
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
