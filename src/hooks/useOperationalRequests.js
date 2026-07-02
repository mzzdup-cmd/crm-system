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
  formatVacationRangeLabel,
} from "../domain/schedule/timeOffDates";

import {
  managerRequestMatchesUser,
} from "../domain/auth/managerMigration";

export function useOperationalRequests() {
  const { userData } = useAuth();
  const { isLeadership, managerId, displayName } =
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

    let pending = 2;
    let cancelled = false;

    const timeoutId = window.setTimeout(
      () => {
        if (!cancelled) {
          setLoading(false);
        }
      },
      10000
    );

    function markReady() {
      pending -= 1;

      if (pending <= 0 && !cancelled) {
        window.clearTimeout(timeoutId);
        setLoading(false);
      }
    }

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

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      unsubTimeOff();
      unsubVacation();
    };
  }, [userData]);

  const summary = useMemo(() => {
    const managerName =
      displayName || userData?.name || "";

    const isOwnRequest = (item) =>
      isLeadership ||
      managerRequestMatchesUser(item, {
        managerId,
        managerName,
      });

    const scopedTimeOffRequests =
      isLeadership
        ? timeOffRequests
        : timeOffRequests.filter(isOwnRequest);

    const scopedVacationRequests =
      isLeadership
        ? vacationRequests
        : vacationRequests.filter(isOwnRequest);

    const pendingTimeOff =
      scopedTimeOffRequests.filter(
        (item) =>
          item.status ===
          REQUEST_STATUS.PENDING
      );

    const pendingVacations =
      scopedVacationRequests.filter(
        (item) =>
          item.status ===
          REQUEST_STATUS.PENDING
      );

    const approvedVacations =
      scopedVacationRequests.filter(
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
        timeOffRequests:
          scopedTimeOffRequests,
        vacationRequests:
          scopedVacationRequests,
        managerId,
        managerName,
      });

    const upcomingOffDays =
      upcomingAbsences.dayOffs.map(
        (item) => item.date
      );

    const overlappingAbsences =
      findOverlappingAbsences({
        timeOffRequests:
          scopedTimeOffRequests,
        vacationRequests:
          scopedVacationRequests,
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

    const nextVacationFromList =
      upcomingVacations[0] || null;

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
        upcomingAbsences.nextVacation ||
        (nextVacationFromList
          ? {
              startDate:
                nextVacationFromList.startDate,
              endDate:
                nextVacationFromList.endDate,
              title: formatVacationRangeLabel(
                nextVacationFromList.startDate,
                nextVacationFromList.endDate
              ),
              subtitle: "отпуск",
            }
          : null),
      overlappingAbsences,
      activeVacation,
    };
  }, [
    timeOffRequests,
    vacationRequests,
    managerId,
    displayName,
    userData?.name,
    isLeadership,
  ]);

  return {
    timeOffRequests,
    vacationRequests,
    summary,
    loading,
    isLeadership,
  };
}
