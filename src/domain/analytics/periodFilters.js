export const ANALYTICS_PERIODS = {
  TODAY: "today",
  WEEK: "week",
  MONTH: "month",
  CUSTOM: "custom",
};

export function startOfDay(date) {
  const copy = new Date(date);

  copy.setHours(0, 0, 0, 0);

  return copy;
}

export function endOfDay(date) {
  const copy = new Date(date);

  copy.setHours(23, 59, 59, 999);

  return copy;
}

export function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getDateRange(
  period,
  customRange = {}
) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  if (period === ANALYTICS_PERIODS.TODAY) {
    return {
      start: todayStart,
      end: todayEnd,
      label: "Сегодня",
    };
  }

  if (period === ANALYTICS_PERIODS.WEEK) {
    const start = new Date(todayStart);

    start.setDate(start.getDate() - 6);

    return {
      start,
      end: todayEnd,
      label: "7 дней",
    };
  }

  if (period === ANALYTICS_PERIODS.MONTH) {
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    return {
      start: startOfDay(start),
      end: todayEnd,
      label: "Месяц",
    };
  }

  const customStart =
    customRange.start
      ? startOfDay(new Date(customRange.start))
      : todayStart;

  const customEnd =
    customRange.end
      ? endOfDay(new Date(customRange.end))
      : todayEnd;

  return {
    start: customStart,
    end: customEnd,
    label: "Период",
  };
}

export function parsePaymentDate(payment) {
  const raw =
    payment.paymentDate ||
    payment.createdAt;

  if (!raw) {
    return null;
  }

  if (typeof raw === "number") {
    return new Date(raw);
  }

  if (
    typeof raw === "object"
    && raw !== null
  ) {
    if (typeof raw.toDate === "function") {
      return raw.toDate();
    }

    if (typeof raw.seconds === "number") {
      return new Date(raw.seconds * 1000);
    }
  }

  if (
    typeof raw === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(raw)
  ) {
    const [year, month, day] =
      raw.split("-").map(Number);

    return new Date(year, month - 1, day);
  }

  const parsed = new Date(raw);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

export function isWithinRange(
  date,
  range
) {
  if (!date || !range) {
    return false;
  }

  return (
    date >= range.start &&
    date <= range.end
  );
}

export function filterItemsByRange(
  items,
  range,
  getDate
) {
  return items.filter((item) => {
    const date = getDate(item);

    return isWithinRange(date, range);
  });
}

export function groupByDay(
  items,
  range,
  getDate,
  getValue
) {
  const buckets = {};
  const cursor = new Date(range.start);

  while (cursor <= range.end) {
    buckets[toDateString(cursor)] = 0;
    cursor.setDate(cursor.getDate() + 1);
  }

  items.forEach((item) => {
    const date = getDate(item);

    if (!date) {
      return;
    }

    const key = toDateString(date);

    if (key in buckets) {
      buckets[key] += getValue(item);
    }
  });

  return Object.entries(buckets).map(
    ([date, value]) => ({
      date,
      value,
    })
  );
}
