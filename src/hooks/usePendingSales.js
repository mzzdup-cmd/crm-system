import {
  useEffect,
  useState,
  useMemo,
} from "react";

import { useAuth } from "../context/AuthContext";
import { usePermissions } from "./usePermissions";

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
  const { managerId, isAdmin } = usePermissions();

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

    const unsubscribe =
      subscribePendingSalesForUser(
        userData,
        (items) => {
          setPendingSales(items);
          setInitialLoading(false);
        }
      );

    return () => {
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
    if (isAdmin) {
      return pendingSales.filter(
        (sale) => sale.status === "pending"
      );
    }

    return filterPendingIncoming(
      pendingSales,
      managerId
    );
  }, [pendingSales, managerId, isAdmin]);

  const created = useMemo(() => {
    if (!managerId) {
      return [];
    }

    return filterPendingCreated(
      pendingSales,
      managerId
    );
  }, [pendingSales, managerId]);

  const pendingCount = useMemo(() => {
    if (isAdmin) {
      return incoming.length;
    }

    return countPendingForOwner(
      pendingSales,
      managerId
    );
  }, [pendingSales, managerId, isAdmin, incoming]);

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
    isAdmin || coveringTargets.length > 0;

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
