import {
  useEffect,
  useState,
  useMemo,
} from "react";

import { useAuth }
from "../context/AuthContext";

import { usePermissions }
from "./usePermissions";

import {
  subscribeTimeOffRequests,
} from "../services/timeOffRequestService";

import {
  subscribeVacationRequests,
} from "../services/vacationRequestService";

import {
  REQUEST_STATUS,
} from "../constants/timeOff";

import {
  findOverlappingAbsences,
  getManagerUpcomingAbsences,
} from "../domain/schedule/timeOffDates";

export function useOperationalRequests() {
  const { userData } = useAuth();
  const { isLeadership, managerId } =
    usePermissions();

  const [timeOffRequests, setTimeOffRequests] =
    useState([]);

  const [vacationRequests, setVacationRequests] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    if (!userData) {
      setTimeOffRequests([]);
      setVacationRequests([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    const unsubTimeOff =
      subscribeTimeOffRequests(
        userData,
        (items) => {
          setTimeOffRequests(items);
          setLoading(false);
        }
      );

    const unsubVacation =
      subscribeVacationRequests(
        userData,
        (items) => {
          setVacationRequests(items);
        }
      );

    return () => {
      unsubTimeOff();
      unsubVacation();
    };
  }, [userData]);

  const summary = useMemo(() => {
    const pendingTimeOff =
      timeOffRequests.filter(
        (item) =>
          item.status ===
          REQUEST_STATUS.PENDING
      );

    const pendingVacations =
      vacationRequests.filter(
        (item) =>
          item.status ===
          REQUEST_STATUS.PENDING
      );

    const approvedVacations =
      vacationRequests.filter(
        (item) =>
          item.status ===
          REQUEST_STATUS.APPROVED
      );

    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    const upcomingVacations =
      approvedVacations.filter(
        (item) => item.endDate >= today
      );

    const upcomingAbsences =
      getManagerUpcomingAbsences({
        timeOffRequests,
        vacationRequests,
        managerId,
      });

    const upcomingOffDays =
      upcomingAbsences.dayOffs.map(
        (item) => item.date
      );

    const overlappingAbsences =
      findOverlappingAbsences({
        timeOffRequests,
        vacationRequests,
      });

    const activeVacation =
      approvedVacations.find((item) => {
        const today =
          new Date()
            .toISOString()
            .split("T")[0];

        return (
          item.startDate <= today &&
          item.endDate >= today
        );
      }) || null;

    return {
      pendingTimeOff,
      pendingVacations,
      pendingTotal:
        pendingTimeOff.length +
        pendingVacations.length,
      approvedVacations:
        upcomingVacations,
      upcomingOffDays,
      upcomingAbsences,
      nextVacation:
        upcomingAbsences.nextVacation,
      overlappingAbsences,
      activeVacation,
    };
  }, [
    timeOffRequests,
    vacationRequests,
    managerId,
  ]);

  return {
    timeOffRequests,
    vacationRequests,
    summary,
    loading,
    isLeadership,
  };
}
