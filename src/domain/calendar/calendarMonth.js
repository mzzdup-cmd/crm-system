import {
  MONTH_LABELS,
} from "../../constants/calendar";

export function formatMonthTitle(
  year,
  monthIndex
) {
  return `${MONTH_LABELS[monthIndex]} ${year}`;
}

export function getMonthRange(
  year,
  monthIndex
) {
  const start = new Date(
    year,
    monthIndex,
    1
  );

  const end = new Date(
    year,
    monthIndex + 1,
    0
  );

  const toKey = (date) => {
    const y = date.getFullYear();
    const m = String(
      date.getMonth() + 1
    ).padStart(2, "0");
    const d = String(
      date.getDate()
    ).padStart(2, "0");

    return `${y}-${m}-${d}`;
  };

  return {
    startDate: toKey(start),
    endDate: toKey(end),
    year,
    monthIndex,
  };
}

export function shiftMonth(
  year,
  monthIndex,
  delta
) {
  const date = new Date(
    year,
    monthIndex + delta,
    1
  );

  return {
    year: date.getFullYear(),
    monthIndex: date.getMonth(),
  };
}

export function buildMonthGrid(
  year,
  monthIndex,
  today = new Date()
) {
  const firstDay = new Date(
    year,
    monthIndex,
    1
  );

  const todayKey = today
    .toISOString()
    .split("T")[0];

  const startOffset =
    (firstDay.getDay() + 6) % 7;

  const gridStart = new Date(firstDay);
  gridStart.setDate(
    firstDay.getDate() - startOffset
  );

  const cells = [];
  const cursor = new Date(gridStart);

  for (let index = 0; index < 42; index += 1) {
    const y = cursor.getFullYear();
    const m = String(
      cursor.getMonth() + 1
    ).padStart(2, "0");
    const d = String(
      cursor.getDate()
    ).padStart(2, "0");
    const dateKey = `${y}-${m}-${d}`;

    cells.push({
      date: dateKey,
      dayNumber: cursor.getDate(),
      isCurrentMonth:
        cursor.getMonth() === monthIndex,
      isToday: dateKey === todayKey,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  while (
    cells.length > 35 &&
    cells[cells.length - 7].dayNumber > 7
  ) {
    cells.splice(-7);
  }

  return cells;
}

export function formatDisplayDate(
  dateKey
) {
  if (!dateKey) {
    return "";
  }

  const date = new Date(`${dateKey}T12:00:00`);

  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
}

export function eventOverlapsRange(
  event,
  startDate,
  endDate
) {
  const eventStart =
    event.startDate || event.date;

  const eventEnd =
    event.endDate || event.date || eventStart;

  return (
    eventStart <= endDate &&
    eventEnd >= startDate
  );
}

export function eventOccursOnDate(
  event,
  dateKey
) {
  if (event.isRange) {
    const eventStart =
      event.startDate || event.date;

    const eventEnd =
      event.endDate || event.date || eventStart;

    return (
      dateKey >= eventStart &&
      dateKey <= eventEnd
    );
  }

  return event.date === dateKey;
}
