import {
  getManagerNameById,
} from "../../constants/managers";

import {
  findOverlappingAbsences,
} from "../schedule/timeOffDates";

import {
  formatDisplayDate,
} from "./calendarMonth";

import {
  CALENDAR_EVENT_TYPES,
} from "../../constants/calendar";

function rangesOverlap(
  aStart,
  aEnd,
  bStart,
  bEnd
) {
  return aStart <= bEnd && bStart <= aEnd;
}

function findVacationPairOverlaps(
  vacationRequests
) {
  const approved =
    vacationRequests.filter(
      (item) => item.status === "approved"
    );

  const overlaps = [];

  for (
    let left = 0;
    left < approved.length;
    left += 1
  ) {
    for (
      let right = left + 1;
      right < approved.length;
      right += 1
    ) {
      const first = approved[left];
      const second = approved[right];

      if (
        !rangesOverlap(
          first.startDate,
          first.endDate,
          second.startDate,
          second.endDate
        )
      ) {
        continue;
      }

      overlaps.push({
        managerIds: [
          first.managerId,
          second.managerId,
        ],
        startDate: [
          first.startDate,
          second.startDate,
        ].sort()[1],
        endDate: [
          first.endDate,
          second.endDate,
        ].sort()[0],
      });
    }
  }

  return overlaps;
}

export function buildCalendarInsights({
  events = [],
  timeOffRequests = [],
  vacationRequests = [],
  monthStart,
  monthEnd,
}) {
  const insights = [];
  const byDate = {};

  events.forEach((event) => {
    if (
      event.type !== CALENDAR_EVENT_TYPES.DAY_OFF &&
      event.type !== CALENDAR_EVENT_TYPES.VACATION
    ) {
      return;
    }

    if (
      event.date < monthStart ||
      event.date > monthEnd
    ) {
      return;
    }

    if (!byDate[event.date]) {
      byDate[event.date] = new Set();
    }

    if (event.managerId) {
      byDate[event.date].add(event.managerId);
    }
  });

  Object.entries(byDate).forEach(
    ([date, managers]) => {
      if (managers.size >= 3) {
        insights.push({
          id: `off_count_${date}`,
          tone:
            managers.size >= 4
              ? "warning"
              : "info",
          message: `${formatDisplayDate(date)} выходят одновременно ${managers.size} менеджера`,
        });
      }
    }
  );

  findOverlappingAbsences({
    timeOffRequests,
    vacationRequests,
    fromDate: monthStart,
    daysAhead: 31,
  }).forEach((item) => {
    if (
      item.date < monthStart ||
      item.date > monthEnd
    ) {
      return;
    }

    const names = item.managerIds
      .map((id) => getManagerNameById(id))
      .join(", ");

    insights.push({
      id: `overlap_${item.date}`,
      tone: "warning",
      message: `${formatDisplayDate(item.date)} пересекаются отсутствия: ${names}`,
    });
  });

  findVacationPairOverlaps(
    vacationRequests
  ).forEach((item, index) => {
    const names = item.managerIds
      .map((id) => getManagerNameById(id))
      .join(" и ");

    insights.push({
      id: `vacation_overlap_${index}`,
      tone: "warning",
      message: `У ${names} пересечение отпусков`,
    });
  });

  const teamEvents = events.filter(
    (event) =>
      event.source === "calendarEvents" &&
      event.date >= monthStart &&
      event.date <= monthEnd
  );

  teamEvents.slice(0, 5).forEach((event) => {
    insights.push({
      id: `team_${event.id}`,
      tone:
        event.importance === "high"
          ? "danger"
          : "neutral",
      message: `${formatDisplayDate(event.date)} — ${event.title}`,
    });
  });

  return insights;
}
