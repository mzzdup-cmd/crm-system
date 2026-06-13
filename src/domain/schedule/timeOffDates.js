export function enumerateDateRange(
  startDate,
  endDate
) {
  if (!startDate || !endDate) {
    return [];
  }

  const dates = [];
  const cursor = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);

  if (cursor > end) {
    return [];
  }

  while (cursor <= end) {
    dates.push(
      cursor.toISOString().split("T")[0]
    );
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export function countVacationDays(
  startDate,
  endDate
) {
  return enumerateDateRange(
    startDate,
    endDate
  ).length;
}

export function mergeOffDays(
  existingOffDays = [],
  managerId
) {
  return [
    ...new Set([
      ...existingOffDays,
      managerId,
    ]),
  ];
}

export function isDateWithinRange(
  date,
  startDate,
  endDate
) {
  return (
    date >= startDate &&
    date <= endDate
  );
}

export function formatAbsenceDayLabel(dateKey) {
  if (!dateKey) {
    return {
      title: "",
      subtitle: "",
    };
  }

  const date = new Date(`${dateKey}T12:00:00`);

  const dayMonth = date.toLocaleDateString(
    "ru-RU",
    {
      day: "numeric",
      month: "long",
    }
  );

  const weekday = date.toLocaleDateString(
    "ru-RU",
    { weekday: "long" }
  );

  return {
    title: dayMonth,
    subtitle: weekday,
  };
}

export function formatVacationRangeLabel(
  startDate,
  endDate
) {
  if (!startDate || !endDate) {
    return "";
  }

  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);

  const sameMonth =
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear();

  if (startDate === endDate) {
    return formatAbsenceDayLabel(startDate).title;
  }

  if (sameMonth) {
    const month = start.toLocaleDateString(
      "ru-RU",
      { month: "long" }
    );

    return `${start.getDate()} — ${end.getDate()} ${month}`;
  }

  const startLabel = start.toLocaleDateString(
    "ru-RU",
    {
      day: "numeric",
      month: "long",
    }
  );

  const endLabel = end.toLocaleDateString(
    "ru-RU",
    {
      day: "numeric",
      month: "long",
    }
  );

  return `${startLabel} — ${endLabel}`;
}

export function getManagerUpcomingAbsences({
  timeOffRequests = [],
  vacationRequests = [],
  managerId,
  fromDate,
  dayOffLimit = 6,
}) {
  const today =
    fromDate ||
    new Date().toISOString().split("T")[0];

  const dayOffs = timeOffRequests
    .filter(
      (request) =>
        request.status === "approved" &&
        request.managerId === managerId &&
        request.date >= today
    )
    .sort((a, b) =>
      a.date.localeCompare(b.date)
    )
    .slice(0, dayOffLimit)
    .map((request) => ({
      type: "day_off",
      date: request.date,
      ...formatAbsenceDayLabel(
        request.date
      ),
    }));

  const vacations = vacationRequests
    .filter(
      (request) =>
        request.status === "approved" &&
        request.managerId === managerId &&
        request.endDate >= today
    )
    .sort((a, b) =>
      a.startDate.localeCompare(b.startDate)
    )
    .map((request) => ({
      type: "vacation",
      startDate: request.startDate,
      endDate: request.endDate,
      title: formatVacationRangeLabel(
        request.startDate,
        request.endDate
      ),
      subtitle: "отпуск",
      daysCount: countVacationDays(
        request.startDate,
        request.endDate
      ),
    }));

  return {
    dayOffs,
    vacations,
    nextVacation: vacations[0] || null,
  };
}

export function getUpcomingApprovedDates({
  timeOffRequests = [],
  vacationRequests = [],
  managerId,
  fromDate,
  limit = 5,
}) {
  const today =
    fromDate ||
    new Date().toISOString().split("T")[0];

  const dates = new Set();

  timeOffRequests.forEach((request) => {
    if (
      request.status !== "approved" ||
      request.managerId !== managerId ||
      request.date < today
    ) {
      return;
    }

    dates.add(request.date);
  });

  vacationRequests.forEach((request) => {
    if (
      request.status !== "approved" ||
      request.managerId !== managerId
    ) {
      return;
    }

    enumerateDateRange(
      request.startDate,
      request.endDate
    ).forEach((date) => {
      if (date >= today) {
        dates.add(date);
      }
    });
  });

  return [...dates]
    .sort()
    .slice(0, limit);
}

export function findOverlappingAbsences({
  timeOffRequests = [],
  vacationRequests = [],
  fromDate,
  daysAhead = 30,
}) {
  const start =
    fromDate ||
    new Date().toISOString().split("T")[0];
  const endDate = new Date(`${start}T12:00:00`);
  endDate.setDate(endDate.getDate() + daysAhead);
  const end =
    endDate.toISOString().split("T")[0];

  const byDate = {};

  function addAbsence(date, managerId) {
    if (date < start || date > end) {
      return;
    }

    if (!byDate[date]) {
      byDate[date] = new Set();
    }

    byDate[date].add(managerId);
  }

  timeOffRequests.forEach((request) => {
    if (request.status !== "approved") {
      return;
    }

    addAbsence(
      request.date,
      request.managerId
    );
  });

  vacationRequests.forEach((request) => {
    if (request.status !== "approved") {
      return;
    }

    enumerateDateRange(
      request.startDate,
      request.endDate
    ).forEach((date) => {
      addAbsence(date, request.managerId);
    });
  });

  return Object.entries(byDate)
    .filter(([, managers]) => managers.size > 1)
    .map(([date, managers]) => ({
      date,
      managerIds: [...managers],
    }))
    .sort((a, b) =>
      a.date.localeCompare(b.date)
    );
}
