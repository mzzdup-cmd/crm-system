import { useEffect, useState } from "react";

import {
  CALENDAR_EVENT_TYPES,
  CALENDAR_IMPORTANCE,
  CALENDAR_MAJOR_ALERT_TYPES,
  CALENDAR_TYPE_LABELS,
} from "../../constants/calendar";

const TYPE_OPTIONS = [
  CALENDAR_EVENT_TYPES.TRAFFIC,
  CALENDAR_EVENT_TYPES.UPSELL,
  CALENDAR_EVENT_TYPES.MAILING,
  CALENDAR_EVENT_TYPES.ANNOUNCEMENT,
  CALENDAR_EVENT_TYPES.MEETING,
  CALENDAR_EVENT_TYPES.CUSTOM,
];

function isTypedAlertType(eventType) {
  return CALENDAR_MAJOR_ALERT_TYPES.includes(
    eventType
  );
}

function resolveEventTitle(eventType, rawTitle) {
  if (isTypedAlertType(eventType)) {
    return CALENDAR_TYPE_LABELS[eventType];
  }

  return rawTitle.trim();
}

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

  const typedAlert = isTypedAlertType(type);

  function handleSubmit(event) {
    event.preventDefault();

    const resolvedTitle = resolveEventTitle(
      type,
      title
    );

    if (!resolvedTitle) {
      return;
    }

    onSave({
      title: resolvedTitle,
      description: description.trim(),
      type,
      importance: typedAlert
        ? CALENDAR_IMPORTANCE.HIGH
        : importance,
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
          w-full max-w-lg bg-surface border border-neutral-700
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block space-y-1">
            <span className="text-sm text-neutral-400">
              Тип
            </span>
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value)
              }
              className="w-full bg-surface-raised rounded-xl px-3 py-2 border border-neutral-800"
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

          {!typedAlert && (
            <label className="block space-y-1">
              <span className="text-sm text-neutral-400">
                Важность
              </span>
              <select
                value={importance}
                onChange={(event) =>
                  setImportance(event.target.value)
                }
                className="w-full bg-surface-raised rounded-xl px-3 py-2 border border-neutral-800"
              >
                <option value={CALENDAR_IMPORTANCE.NORMAL}>
                  Обычное
                </option>
                <option value={CALENDAR_IMPORTANCE.HIGH}>
                  Важное
                </option>
              </select>
            </label>
          )}
        </div>

        {typedAlert ? (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            Событие:{" "}
            <span className="font-semibold">
              {CALENDAR_TYPE_LABELS[type]}
            </span>
            <span className="block text-xs text-red-200/80 mt-1">
              Дата будет подсвечена красным в календаре
            </span>
          </div>
        ) : (
          <label className="block space-y-1">
            <span className="text-sm text-neutral-400">
              Название
            </span>
            <input
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              required
              className="w-full bg-surface-raised rounded-xl px-3 py-2 border border-neutral-800"
              placeholder="Созвон команды"
            />
          </label>
        )}

        <label className="block space-y-1">
          <span className="text-sm text-neutral-400">
            Описание
          </span>
          <textarea
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            rows={3}
            className="w-full bg-surface-raised rounded-xl px-3 py-2 border border-neutral-800"
            placeholder={
              typedAlert
                ? "Ссылки, детали (необязательно)"
                : "Дополнительные детали"
            }
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block space-y-1">
            <span className="text-sm text-neutral-400">
              Дата начала
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(event) =>
                setStartDate(event.target.value)
              }
              required
              className="w-full bg-surface-raised rounded-xl px-3 py-2 border border-neutral-800"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm text-neutral-400">
              Дата окончания
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(event) =>
                setEndDate(event.target.value)
              }
              className="w-full bg-surface-raised rounded-xl px-3 py-2 border border-neutral-800"
            />
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-raised"
          >
            Отмена
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-xl crm-btn-primary disabled:opacity-50"
          >
            {loading ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </form>
    </div>
  );
}
