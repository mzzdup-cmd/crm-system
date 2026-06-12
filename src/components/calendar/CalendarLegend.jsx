import {
  CALENDAR_EVENT_TYPES,
  CALENDAR_TYPE_LABELS,
  CALENDAR_TYPE_STYLES,
} from "../../constants/calendar";

const LEGEND_ITEMS = [
  CALENDAR_EVENT_TYPES.DAY_OFF,
  CALENDAR_EVENT_TYPES.VACATION,
  CALENDAR_EVENT_TYPES.SUBSTITUTION,
  CALENDAR_EVENT_TYPES.MEETING,
  "important",
];

export default function CalendarLegend() {
  return (
    <div className="flex flex-wrap gap-2">
      {LEGEND_ITEMS.map((type) => {
        const style =
          CALENDAR_TYPE_STYLES[type];

        const label =
          type === "important"
            ? "Важное"
            : CALENDAR_TYPE_LABELS[type];

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
    </div>
  );
}
