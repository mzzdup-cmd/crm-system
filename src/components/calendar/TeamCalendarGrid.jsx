import { useRef } from "react";

import { WEEKDAY_LABELS } from "../../constants/calendar";

import CalendarDayCell
from "./CalendarDayCell";

export default function TeamCalendarGrid({
  monthGrid,
  schedulesByDate = {},
  eventsByDate = {},
  onSelectDay,
  onSwipe,
}) {
  const touchStartX = useRef(0);

  function handleTouchStart(event) {
    touchStartX.current =
      event.changedTouches[0].screenX;
  }

  function handleTouchEnd(event) {
    const delta =
      event.changedTouches[0].screenX -
      touchStartX.current;

    if (Math.abs(delta) < 60 || !onSwipe) {
      return;
    }

    onSwipe(delta > 0 ? "prev" : "next");
  }

  return (
    <div
      className="bg-surface border border-neutral-800 rounded-2xl p-3 md:p-4"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-xs md:text-sm text-neutral-500 font-medium py-1"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {monthGrid.map((cell) => (
          <CalendarDayCell
            key={cell.date}
            cell={cell}
            schedule={
              schedulesByDate[cell.date] || null
            }
            events={
              eventsByDate[cell.date] || []
            }
            onSelect={onSelectDay}
          />
        ))}
      </div>
    </div>
  );
}
