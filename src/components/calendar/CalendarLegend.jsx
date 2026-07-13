import {
  CALENDAR_EVENT_TYPES,
  CALENDAR_TYPE_LABELS,
  CALENDAR_TYPE_STYLES,
} from "../../constants/calendar";

const LEGEND_ITEMS = [
  CALENDAR_EVENT_TYPES.DAY_OFF,
  CALENDAR_EVENT_TYPES.VACATION,
  CALENDAR_EVENT_TYPES.SUBSTITUTION,
  CALENDAR_EVENT_TYPES.TRAFFIC,
  CALENDAR_EVENT_TYPES.UPSELL,
  CALENDAR_EVENT_TYPES.MAILING,
];

export default function CalendarLegend() {
  return (
    <div className="flex flex-wrap gap-2">
      {LEGEND_ITEMS.map((type) => {
        const style =
          CALENDAR_TYPE_STYLES[type];

        const label =
          CALENDAR_TYPE_LABELS[type];

        return (
          <div
            key={type}
            className={`
              inline-flex items-center gap-2 px-3 py-1.5
              rounded-full border text-xs
              ${style.chip}
            `}
          >
            <span
              className={`w-2 h-2 rounded-full ${style.dot}`}
            />
            {label}
          </div>
        );
      })}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs border-neutral-700 bg-surface-raised text-neutral-300">
        Наведите на «выходной» — кто заменяет
      </div>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs bg-red-500/15 text-red-200 border-red-500/40">
        <span className="w-2 h-2 rounded-full bg-red-400" />
        Трафик / Апсейл / Рассылка — красная дата
      </div>
    </div>
  );
}
