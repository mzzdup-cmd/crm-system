import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { usePermissions }
from "./usePermissions";

import {
  subscribeTimeOffRequests,
} from "../services/timeOffRequestService";

import {
  subscribeVacationRequests,
} from "../services/vacationRequestService";

import {
  subscribeCalendarEvents,
} from "../services/calendarEventService";

import {
  subscribeSchedulesInRange,
} from "../services/calendarScheduleService";

import {
  getMonthRange,
  shiftMonth,
  buildMonthGrid,
  formatMonthTitle,
  eventOverlapsRange,
} from "../domain/calendar/calendarMonth";

import {
  aggregateCalendarEvents,
  groupEventsByDate,
  getEventsForDate,
} from "../domain/calendar/calendarAggregator";

import {
  buildCalendarInsights,
} from "../domain/calendar/calendarInsights";

export function useTeamCalendar(
  initialDate = new Date()
) {
  const { userData, isLeadership } =
    usePermissions();

  const [year, setYear] = useState(
    initialDate.getFullYear()
  );

  const [monthIndex, setMonthIndex] =
    useState(initialDate.getMonth());

  const [timeOffRequests, setTimeOffRequests] =
    useState([]);

  const [vacationRequests, setVacationRequests] =
    useState([]);

  const [schedules, setSchedules] =
    useState([]);

  const [calendarEvents, setCalendarEvents] =
    useState([]);

  const [connected, setConnected] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const monthRange = useMemo(
    () => getMonthRange(year, monthIndex),
    [year, monthIndex]
  );

  useEffect(() => {
    if (!userData) {
      return undefined;
    }

    setLoading(true);
    setConnected(true);

    let pending = 4;

    const markReady = () => {
      pending -= 1;

      if (pending <= 0) {
        setLoading(false);
      }
    };

    const unsubTimeOff =
      subscribeTimeOffRequests(
        userData,
        (items) => {
          setTimeOffRequests(items);
          markReady();
        }
      );

    const unsubVacation =
      subscribeVacationRequests(
        userData,
        (items) => {
          setVacationRequests(items);
          markReady();
        }
      );

    const unsubSchedules =
      subscribeSchedulesInRange(
        monthRange.startDate,
        monthRange.endDate,
        (items) => {
          setSchedules(items);
          markReady();
        }
      );

    const unsubEvents =
      subscribeCalendarEvents(
        monthRange,
        (items) => {
          setCalendarEvents(items);
          markReady();
        }
      );

    return () => {
      setConnected(false);
      unsubTimeOff();
      unsubVacation();
      unsubSchedules();
      unsubEvents();
    };
  }, [
    userData,
    monthRange.startDate,
    monthRange.endDate,
  ]);

  const schedulesByDate = useMemo(
    () =>
      schedules.reduce((acc, schedule) => {
        acc[schedule.date] = schedule;
        return acc;
      }, {}),
    [schedules]
  );

  const events = useMemo(
    () =>
      aggregateCalendarEvents({
        timeOffRequests,
        vacationRequests,
        schedules,
        calendarEvents,
      }).filter((event) =>
        eventOverlapsRange(
          event,
          monthRange.startDate,
          monthRange.endDate
        )
      ),
    [
      timeOffRequests,
      vacationRequests,
      schedules,
      calendarEvents,
      monthRange.startDate,
      monthRange.endDate,
    ]
  );

  const eventsByDate = useMemo(
    () => groupEventsByDate(events),
    [events]
  );

  const monthGrid = useMemo(
    () => buildMonthGrid(year, monthIndex),
    [year, monthIndex]
  );

  const insights = useMemo(
    () =>
      buildCalendarInsights({
        events,
        timeOffRequests,
        vacationRequests,
        monthStart: monthRange.startDate,
        monthEnd: monthRange.endDate,
      }),
    [
      events,
      timeOffRequests,
      vacationRequests,
      monthRange.startDate,
      monthRange.endDate,
    ]
  );

  function goToPreviousMonth() {
    const next = shiftMonth(
      year,
      monthIndex,
      -1
    );

    setYear(next.year);
    setMonthIndex(next.monthIndex);
    setLoading(true);
  }

  function goToNextMonth() {
    const next = shiftMonth(
      year,
      monthIndex,
      1
    );

    setYear(next.year);
    setMonthIndex(next.monthIndex);
    setLoading(true);
  }

  function goToToday() {
    const today = new Date();

    setYear(today.getFullYear());
    setMonthIndex(today.getMonth());
    setLoading(true);
  }

  return {
    year,
    monthIndex,
    monthTitle: formatMonthTitle(
      year,
      monthIndex
    ),
    monthRange,
    monthGrid,
    events,
    eventsByDate,
    schedulesByDate,
    getDayEvents: (dateKey) =>
      getEventsForDate(events, dateKey),
    insights,
    calendarEvents,
    loading,
    connected,
    isLeadership,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
  };
}
