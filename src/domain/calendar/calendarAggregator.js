import {
  CALENDAR_EVENT_TYPES,
  CALENDAR_IMPORTANCE,
  CALENDAR_TYPE_STYLES,
} from "../../constants/calendar";

import {
  getManagerNameById,
} from "../../constants/managers";

import {
  enumerateDateRange,
} from "../schedule/timeOffDates";

import {
  eventOccursOnDate,
} from "./calendarMonth";

export function getManagerInitials(
  managerId
) {
  const name =
    getManagerNameById(managerId) || "?";

  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function getEventStyle(event) {
  if (
    event.importance ===
    CALENDAR_IMPORTANCE.HIGH
  ) {
    return CALENDAR_TYPE_STYLES.important;
  }

  return (
    CALENDAR_TYPE_STYLES[event.type] ||
    CALENDAR_TYPE_STYLES.custom
  );
}

function buildEventKey(
  date,
  managerId,
  type
) {
  return `${date}_${managerId || "team"}_${type}`;
}

export function aggregateCalendarEvents({
  timeOffRequests = [],
  vacationRequests = [],
  schedules = [],
  calendarEvents = [],
}) {
  const items = [];
  const seen = new Set();

  function pushEvent(event) {
    const key =
      event.dedupKey ||
      buildEventKey(
        event.date,
        event.managerId,
        event.type
      );

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    items.push(event);
  }

  timeOffRequests.forEach((request) => {
    if (request.status !== "approved") {
      return;
    }

    pushEvent({
      id: `timeoff_${request.id}`,
      dedupKey: buildEventKey(
        request.date,
        request.managerId,
        CALENDAR_EVENT_TYPES.DAY_OFF
      ),
      type: CALENDAR_EVENT_TYPES.DAY_OFF,
      date: request.date,
      startDate: request.date,
      endDate: request.date,
      managerId: request.managerId,
      title: `${request.manager || getManagerNameById(request.managerId)} — выходной`,
      source: "timeOffRequests",
      editable: false,
    });
  });

  vacationRequests.forEach((request) => {
    if (request.status !== "approved") {
      return;
    }

    pushEvent({
      id: `vacation_${request.id}`,
      dedupKey: `vacation_${request.id}`,
      type: CALENDAR_EVENT_TYPES.VACATION,
      date: request.startDate,
      startDate: request.startDate,
      endDate: request.endDate,
      managerId: request.managerId,
      title: `${request.manager || getManagerNameById(request.managerId)} — отпуск`,
      source: "vacationRequests",
      isRange: true,
      editable: false,
    });
  });

  schedules.forEach((schedule) => {
    const date = schedule.date;

    (schedule.offDays || []).forEach(
      (managerId) => {
        pushEvent({
          id: `schedule_off_${date}_${managerId}`,
          dedupKey: buildEventKey(
            date,
            managerId,
            CALENDAR_EVENT_TYPES.DAY_OFF
          ),
          type: CALENDAR_EVENT_TYPES.DAY_OFF,
          date,
          startDate: date,
          endDate: date,
          managerId,
          title: `${getManagerNameById(managerId)} — выходной`,
          source: "schedule",
          editable: false,
        });
      }
    );

    Object.entries(
      schedule.shifts || {}
    ).forEach(([managerId, shift]) => {
      if (!shift?.coveringFor) {
        return;
      }

      pushEvent({
        id: `substitution_${date}_${managerId}`,
        dedupKey: `${date}_substitution_${managerId}`,
        type: CALENDAR_EVENT_TYPES.SUBSTITUTION,
        date,
        startDate: date,
        endDate: date,
        managerId,
        relatedManagerId: shift.coveringFor,
        title: `${getManagerNameById(managerId)} заменяет ${getManagerNameById(shift.coveringFor)}`,
        source: "schedule",
        editable: false,
      });
    });
  });

  calendarEvents.forEach((event) => {
    enumerateDateRange(
      event.startDate,
      event.endDate || event.startDate
    ).forEach((date) => {
      items.push({
        ...event,
        date,
        editable: true,
        source: "calendarEvents",
      });
    });
  });

  return items.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }

    return a.title.localeCompare(b.title);
  });
}

export function groupEventsByDate(events) {
  return events.reduce((acc, event) => {
    const dates = event.isRange
      ? enumerateDateRange(
          event.startDate,
          event.endDate || event.startDate
        )
      : [event.date];

    dates.forEach((date) => {
      if (!acc[date]) {
        acc[date] = [];
      }

      acc[date].push(event);
    });

    return acc;
  }, {});
}

export function getEventsForDate(
  events,
  dateKey
) {
  return events.filter((event) =>
    eventOccursOnDate(event, dateKey)
  );
}

export function getUniqueEventsForMonth(
  events
) {
  const map = new Map();

  events.forEach((event) => {
    const key =
      event.source === "calendarEvents"
        ? event.id
        : event.dedupKey || event.id;

    if (!map.has(key)) {
      map.set(key, event);
    }
  });

  return [...map.values()];
}
