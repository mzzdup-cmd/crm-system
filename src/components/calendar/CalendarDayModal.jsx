import {
  buildDayCalendarLines,
} from "../../domain/calendar/buildDayCalendarLines";

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

  const lines = buildDayCalendarLines({
    date: dateKey,
    schedule,
    events,
  });

  const customEvents = events.filter(
    (event) =>
      event.editable &&
      !lines.some(
        (line) =>
          line.kind === "alert" &&
          line.label === event.title
      )
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 p-0 md:p-4"
      onClick={onClose}
    >
      <div
        className="
          w-full md:max-w-lg
          bg-surface border border-neutral-800
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
            <p className="text-neutral-400 text-sm mt-1">
              {lines.length === 0
                ? "Событий нет"
                : "События дня"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {lines.length > 0 && (
          <div className="space-y-2 mb-6">
            {lines.map((line) => (
              <div
                key={line.id}
                className={`
                  rounded-xl border px-3 py-2 text-sm
                  ${
                    line.kind === "alert"
                      ? "border-red-500/50 bg-red-500/10 text-red-100"
                      : "border-neutral-700 bg-surface-raised text-neutral-200"
                  }
                `}
                title={line.tooltip}
              >
                <div className="font-medium">
                  {line.label}
                </div>
                {line.kind === "off" &&
                  line.tooltip && (
                    <div className="text-xs text-neutral-400 mt-1">
                      {line.tooltip}
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}

        {customEvents.length > 0 && (
          <div className="space-y-3 border-t border-neutral-800 pt-4">
            <h3 className="text-sm font-semibold text-neutral-400">
              Другие события
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
                          bg-surface-raised hover:bg-surface-hover
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
