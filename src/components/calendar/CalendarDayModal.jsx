import {
  getEventStyle,
  getManagerInitials,
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
  events = [],
  isAdmin,
  onClose,
  onEditEvent,
  onDeleteEvent,
}) {
  if (!open || !dateKey) {
    return null;
  }

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
              {events.length
                ? `${events.length} событий`
                : "Событий нет"}
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

        <div className="space-y-3">
          {events.length === 0 && (
            <p className="text-slate-500 text-sm">
              На этот день пока ничего не запланировано.
            </p>
          )}

          {events.map((event) => {
            const style = getEventStyle(event);

            return (
              <div
                key={event.id}
                className={`
                  rounded-xl border p-4
                  ${style.chip}
                `}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
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

                    {event.description && (
                      <p className="text-sm mt-2 opacity-90">
                        {event.description}
                      </p>
                    )}
                  </div>

                  {event.managerId && (
                    <div
                      className="
                        w-9 h-9 rounded-full bg-slate-950/40
                        flex items-center justify-center
                        text-xs font-bold
                      "
                      title={event.managerId}
                    >
                      {getManagerInitials(
                        event.managerId
                      )}
                    </div>
                  )}
                </div>

                {isAdmin &&
                  event.editable && (
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
      </div>
    </div>
  );
}
