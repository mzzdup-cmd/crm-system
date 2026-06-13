import {
  ANALYTICS_PERIODS,
  getDateRange,
  filterItemsByRange,
  parsePaymentDate,
  startOfDay,
  endOfDay,
} from "../analytics/periodFilters";

import {
  buildSalaryReport,
} from "./salaryCalculator";

export function parseShiftDate(shift) {
  const raw = shift?.date;

  if (!raw) {
    return null;
  }

  if (
    typeof raw === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(raw)
  ) {
    const [year, month, day] =
      raw.split("-").map(Number);

    return new Date(year, month - 1, day);
  }

  return new Date(raw);
}

export function parseBonusDate(bonus) {
  const raw = bonus?.createdAt;

  if (!raw) {
    return null;
  }

  if (typeof raw === "number") {
    return new Date(raw);
  }

  return new Date(raw);
}

export function getCalendarMonthRange(
  year,
  monthIndex
) {
  const start = startOfDay(
    new Date(year, monthIndex, 1)
  );

  const end = endOfDay(
    new Date(year, monthIndex + 1, 0)
  );

  return {
    start,
    end,
    year,
    monthIndex,
  };
}

export function getSalaryPeriodByOffset(
  offset = 0
) {
  const now = new Date();

  if (offset === 0) {
    return getDateRange(
      ANALYTICS_PERIODS.MONTH
    );
  }

  const target = new Date(
    now.getFullYear(),
    now.getMonth() + offset,
    1
  );

  return getCalendarMonthRange(
    target.getFullYear(),
    target.getMonth()
  );
}

export function formatSalaryMonthLabel(
  range
) {
  const date = range?.start;

  if (!date) {
    return "";
  }

  const label = date.toLocaleDateString(
    "ru-RU",
    {
      month: "long",
      year: "numeric",
    }
  );

  return label.charAt(0).toUpperCase()
    + label.slice(1);
}

export function formatSalaryPeriodSubtitle(
  range
) {
  if (!range?.start || !range?.end) {
    return "";
  }

  const sameMonth =
    range.start.getMonth()
      === range.end.getMonth()
    && range.start.getFullYear()
      === range.end.getFullYear();

  if (sameMonth) {
    const month = range.start.toLocaleDateString(
      "ru-RU",
      { month: "long" }
    );

    return `${range.start.getDate()} — ${range.end.getDate()} ${month}`;
  }

  const startLabel =
    range.start.toLocaleDateString(
      "ru-RU",
      {
        day: "numeric",
        month: "long",
      }
    );

  const endLabel =
    range.end.toLocaleDateString(
      "ru-RU",
      {
        day: "numeric",
        month: "long",
      }
    );

  return `${startLabel} — ${endLabel}`;
}

export function filterSalaryDataByRange({
  payments = [],
  nightShifts = [],
  manualBonuses = [],
  range,
}) {
  return {
    payments: filterItemsByRange(
      payments,
      range,
      parsePaymentDate
    ),
    nightShifts: filterItemsByRange(
      nightShifts,
      range,
      parseShiftDate
    ),
    manualBonuses: filterItemsByRange(
      manualBonuses,
      range,
      parseBonusDate
    ),
  };
}

export function buildSalaryReportForPeriod({
  payments = [],
  nightShifts = [],
  manualBonuses = [],
  managerNames = {},
  allManagerKeys = [],
  range,
  offset = 0,
}) {
  const periodRange =
    range || getSalaryPeriodByOffset(offset);

  const filtered =
    filterSalaryDataByRange({
      payments,
      nightShifts,
      manualBonuses,
      range: periodRange,
    });

  const rows = buildSalaryReport({
    ...filtered,
    managerNames,
    allManagerKeys,
  });

  return {
    offset,
    label: formatSalaryMonthLabel(
      periodRange
    ),
    subtitle: formatSalaryPeriodSubtitle(
      periodRange
    ),
    range: periodRange,
    rows,
  };
}

export function buildSalaryReportBundle({
  payments = [],
  nightShifts = [],
  manualBonuses = [],
  managerNames = {},
  allManagerKeys = [],
  archiveOffsets = [-1],
}) {
  const current =
    buildSalaryReportForPeriod({
      payments,
      nightShifts,
      manualBonuses,
      managerNames,
      allManagerKeys,
      offset: 0,
    });

  const archive = archiveOffsets.map(
    (offset) =>
      buildSalaryReportForPeriod({
        payments,
        nightShifts,
        manualBonuses,
        managerNames,
        allManagerKeys,
        offset,
      })
  );

  return {
    current,
    archive,
  };
}

export function filterSalaryRowsForManager(
  rows = [],
  userData,
  managerId
) {
  return rows.filter(
    (item) =>
      item.managerKey === managerId
      || item.managerKey
        === userData?.name
  );
}
