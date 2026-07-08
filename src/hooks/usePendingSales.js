import {
  useEffect,
  useState,
  useMemo,
} from "react";

import { useAuth } from "../context/AuthContext";
import { usePermissions } from "./usePermissions";

import {
  getEffectiveOwnerManagerId,
} from "../domain/auth/roleHelpers";

import {
  subscribePendingSalesForUser,
  countPendingForOwner,
  filterPendingIncoming,
  filterPendingCreated,
} from "../services/pendingSalesService";

import {
  getCoveringTargets,
} from "../domain/pendingSales/pendingSalesLogic";

import {
  subscribeScheduleByDate,
} from "../services/realtimeService";

import {
  getTodayDateString,
  resolveEffectiveSchedule,
} from "../domain/schedule/scheduleLogic";

export function usePendingSales() {
  const { userData } = useAuth();
  const { managerId, isManager, isLeadership } =
    usePermissions();

  const effectiveOwnerManagerId =
    getEffectiveOwnerManagerId(userData) ||
    managerId;

  const today = getTodayDateString();

  const [pendingSales, setPendingSales] =
    useState([]);

  const [schedule, setSchedule] =
    useState(null);

  const effectiveSchedule = useMemo(() => {
    return resolveEffectiveSchedule(
      schedule,
      today
    );
  }, [schedule, today]);

  const [connected, setConnected] =
    useState(false);

  const [initialLoading, setInitialLoading] =
    useState(true);

  useEffect(() => {
    if (!userData) {
      return undefined;
    }

    setConnected(true);
    let cancelled = false;

    const timeoutId = window.setTimeout(
      () => {
        if (!cancelled) {
          setInitialLoading(false);
        }
      },
      10000
    );

    const unsubscribe =
      subscribePendingSalesForUser(
        userData,
        (items) => {
          setPendingSales(items);
          if (!cancelled) {
            window.clearTimeout(timeoutId);
            setInitialLoading(false);
          }
        }
      );

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      setConnected(false);
      unsubscribe();
    };
  }, [userData]);

  useEffect(() => {
    const unsubscribe =
      subscribeScheduleByDate(
        today,
        setSchedule
      );

    return unsubscribe;
  }, [today]);

  const incoming = useMemo(() => {
    if (isLeadership) {
      return pendingSales.filter(
        (sale) => sale.status === "pending"
      );
    }

    return filterPendingIncoming(
      pendingSales,
      effectiveOwnerManagerId
    );
  }, [pendingSales, effectiveOwnerManagerId, isLeadership]);

  const created = useMemo(() => {
    if (!effectiveOwnerManagerId) {
      return [];
    }

    return filterPendingCreated(
      pendingSales,
      effectiveOwnerManagerId
    );
  }, [pendingSales, effectiveOwnerManagerId]);

  const pendingCount = useMemo(() => {
    if (isLeadership) {
      return incoming.length;
    }

    return countPendingForOwner(
      pendingSales,
      effectiveOwnerManagerId
    );
  }, [pendingSales, effectiveOwnerManagerId, isLeadership, incoming]);

  const coveringTargets = useMemo(() => {
    if (!managerId) {
      return [];
    }

    return getCoveringTargets(
      effectiveSchedule,
      managerId
    );
  }, [effectiveSchedule, managerId]);

  const canQuickSale =
    isLeadership || isManager;

  return {
    pendingSales,
    incoming,
    created,
    pendingCount,
    coveringTargets,
    canQuickSale,
    schedule: effectiveSchedule,
    connected,
    initialLoading,
  };
}
