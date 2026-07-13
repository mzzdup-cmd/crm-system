import {
  buildDayManagerRows,
} from "../../domain/calendar/dayManagerRows";

import {
  getEventStyle,
} from "../../domain/calendar/calendarAggregator";

import {
  formatDisplayDate,
} from "../../domain/calendar/calendarMonth";

import {
  CALENDAR_TYPE_LABELS,
} from "../../constants/calendar";

function formatEventPeriod(event) {
  if (
    !event.isRange ||
    !event.startDate ||
    !event.endDate ||
    event.startDate === event.endDate
  ) {
    return null;
  }

  return `${formatDisplayDate(event.startDate)} — ${formatDisplayDate(event.endDate)}`;
}

export default function CalendarDayModal({
  open,
  dateKey,
  schedule = null,
  events = [],
  isLeadership,
  onClose,
  onEditEvent,
  onDeleteEvent,
}) {
  if (!open || !dateKey) {
    return null;
  }

  const rows = buildDayManagerRows({
    date: dateKey,
    schedule,
  });

  const customEvents = events.filter(
    (event) => event.editable
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 p-0 md:p-4"
      onClick={onClose}
    >
      <div
        className="
          w-full md:max-w-lg
          bg-slate-900 border border-slate-700
          rounded-t-3xl md:rounded-2xl
          p-5 md:p-6 max-h-[85vh] overflow-y-auto
        "
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold">
              {formatDisplayDate(dateKey)}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Расписание команды
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-1.5 mb-6">
          {rows.map((row) => (
            <div
              key={row.managerId}
              className={`
                flex items-center justify-between gap-3
                rounded-xl border px-3 py-2 text-sm
                ${
                  row.highlight
                    ? "bg-violet-500/15 border-violet-500/40 text-violet-100"
                    : "bg-slate-800/60 border-slate-700 text-slate-200"
                }
              `}
              title={row.tooltip}
            >
              <span className="font-medium">
                {row.name}
              </span>
              <span className="text-xs text-right opacity-90">
                {row.statusLabel}
                {row.isCovering &&
                  row.shiftStart &&
                  row.shiftEnd && (
                    <span className="block mt-0.5">
                      {row.shiftStart}–{row.shiftEnd} MSK
                    </span>
                  )}
              </span>
            </div>
          ))}
        </div>

        {customEvents.length > 0 && (
          <div className="space-y-3 border-t border-slate-800 pt-4">
            <h3 className="text-sm font-semibold text-slate-400">
              События
            </h3>

            {customEvents.map((event) => {
              const style = getEventStyle(event);

              return (
                <div
                  key={event.id}
                  className={`
                    rounded-xl border p-4
                    ${style.chip}
                  `}
                >
                  <div className="font-semibold">
                    {event.title}
                  </div>

                  <div className="text-xs mt-1 opacity-80">
                    {CALENDAR_TYPE_LABELS[event.type] ||
                      "Событие"}
                    {formatEventPeriod(event) && (
                      <span className="block mt-0.5">
                        {formatEventPeriod(event)}
                      </span>
                    )}
                  </div>

                  {isLeadership && (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onEditEvent(event)
                        }
                        className="
                          px-3 py-1.5 rounded-lg text-xs
                          bg-slate-800 hover:bg-slate-700
                        "
                      >
                        Редактировать
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onDeleteEvent(event)
                        }
                        className="
                          px-3 py-1.5 rounded-lg text-xs
                          bg-red-500/20 text-red-300
                          hover:bg-red-500/30
                        "
                      >
                        Удалить
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
