import { useEffect, useState } from "react";

import {
  CALENDAR_EVENT_TYPES,
  CALENDAR_IMPORTANCE,
  CALENDAR_TYPE_LABELS,
} from "../../constants/calendar";

const TYPE_OPTIONS = [
  CALENDAR_EVENT_TYPES.ANNOUNCEMENT,
  CALENDAR_EVENT_TYPES.MAILING,
  CALENDAR_EVENT_TYPES.MEETING,
  CALENDAR_EVENT_TYPES.CUSTOM,
];

export default function CalendarEventModal({
  open,
  initialEvent,
  defaultDate,
  loading,
  onClose,
  onSave,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");

  const [type, setType] = useState(
    CALENDAR_EVENT_TYPES.MEETING
  );

  const [importance, setImportance] =
    useState(CALENDAR_IMPORTANCE.NORMAL);

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setTitle(initialEvent?.title || "");
    setDescription(
      initialEvent?.description || ""
    );
    setType(
      initialEvent?.type ||
        CALENDAR_EVENT_TYPES.MEETING
    );
    setImportance(
      initialEvent?.importance ||
        CALENDAR_IMPORTANCE.NORMAL
    );
    setStartDate(
      initialEvent?.startDate ||
        defaultDate ||
        ""
    );
    setEndDate(
      initialEvent?.endDate ||
        initialEvent?.startDate ||
        defaultDate ||
        ""
    );
  }, [open, initialEvent, defaultDate]);

  if (!open) {
    return null;
  }

  function handleSubmit(event) {
    event.preventDefault();

    onSave({
      title: title.trim(),
      description: description.trim(),
      type,
      importance,
      startDate,
      endDate: endDate || startDate,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <form
        className="
          w-full max-w-lg bg-slate-900 border border-slate-700
          rounded-2xl p-6 space-y-4
        "
        onClick={(event) => {
          event.stopPropagation();
        }}
        onSubmit={handleSubmit}
      >
        <h2 className="text-xl font-bold">
          {initialEvent
            ? "Редактировать событие"
            : "Новое событие"}
        </h2>

        <label className="block space-y-1">
          <span className="text-sm text-slate-400">
            Название
          </span>
          <input
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            required
            className="w-full bg-slate-800 rounded-xl px-3 py-2"
            placeholder="Созвон команды"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm text-slate-400">
            Описание
          </span>
          <textarea
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            rows={3}
            className="w-full bg-slate-800 rounded-xl px-3 py-2"
            placeholder="Дополнительные детали"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block space-y-1">
            <span className="text-sm text-slate-400">
              Тип
            </span>
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value)
              }
              className="w-full bg-slate-800 rounded-xl px-3 py-2"
            >
              {TYPE_OPTIONS.map((option) => (
                <option
                  key={option}
                  value={option}
                >
                  {CALENDAR_TYPE_LABELS[option]}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm text-slate-400">
              Важность
            </span>
            <select
              value={importance}
              onChange={(event) =>
                setImportance(event.target.value)
              }
              className="w-full bg-slate-800 rounded-xl px-3 py-2"
            >
              <option value={CALENDAR_IMPORTANCE.NORMAL}>
                Обычное
              </option>
              <option value={CALENDAR_IMPORTANCE.HIGH}>
                Важное
              </option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block space-y-1">
            <span className="text-sm text-slate-400">
              Дата начала
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(event) =>
                setStartDate(event.target.value)
              }
              required
              className="w-full bg-slate-800 rounded-xl px-3 py-2"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm text-slate-400">
              Дата окончания
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(event) =>
                setEndDate(event.target.value)
              }
              className="w-full bg-slate-800 rounded-xl px-3 py-2"
            />
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800"
          >
            Отмена
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-cyan-500 text-white disabled:opacity-50"
          >
            {loading ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </form>
    </div>
  );
}
