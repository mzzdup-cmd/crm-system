import {
  useEffect,
  useState,
  useMemo,
  useRef,
} from "react";

import { useAuth } from "../context/AuthContext";
import { usePermissions } from "./usePermissions";

import {
  subscribeClientsForUser,
  subscribeOperationalPayments,
  subscribeScheduleByDate,
  subscribeTrafficByDate,
  subscribeFailedSyncLogs,
  subscribeRecentSyncLogs,
} from "../services/realtimeService";

import {
  hasDebt,
  isOverdue,
  getRemain,
} from "../domain/client/clientStatus";

import {
  getTodayDateString,
  getManagerShiftInfo,
  getActiveManagers,
  resolveEffectiveSchedule,
} from "../domain/schedule/scheduleLogic";

import {
  getManagerTrafficLoad,
  summarizeTeamLoad,
} from "../domain/schedule/trafficLogic";

import {
  buildTodayTasks,
  buildActiveSubscriptions,
} from "../domain/notifications/reminderLogic";

import {
  syncClientReminders,
  syncManagerShiftNotifications,
  notifyAdminsSyncFailures,
} from "../services/reminderSyncService";

import {
  buildOperationalSummary,
} from "../domain/kpi/operationalKpi";

const OPERATIONAL_PAYMENTS_LIMIT = 3000;

export function useDashboardRealtime() {
  const { userData } = useAuth();
  const { isAdmin, isManager, managerId, displayName } =
    usePermissions();

  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [traffic, setTraffic] = useState(null);
  const [failedSyncLogs, setFailedSyncLogs] =
    useState([]);

  const [initialLoading, setInitialLoading] =
    useState(true);

  const [connected, setConnected] =
    useState(false);

  const syncNotifiedRef = useRef(false);
  const today = getTodayDateString();

  useEffect(() => {
    if (!userData) {
      return undefined;
    }

    setConnected(true);
    let pending = isAdmin ? 4 : 3;
    let cancelled = false;

    function markReady() {
      pending -= 1;

      if (pending <= 0 && !cancelled) {
        setInitialLoading(false);
      }
    }

    const unsubClients =
      subscribeClientsForUser(
        userData,
        (items) => {
          setClients(items);
          markReady();
        }
      );

    const unsubPayments =
      subscribeOperationalPayments(
        userData,
        OPERATIONAL_PAYMENTS_LIMIT,
        (items) => {
          setPayments(items);
          markReady();
        }
      );

    const unsubSchedule =
      subscribeScheduleByDate(
        today,
        (item) => {
          setSchedule(item);
          markReady();
        }
      );

    const unsubTraffic =
      subscribeTrafficByDate(
        today,
        (item) => {
          setTraffic(item);
          markReady();
        }
      );

    let unsubSync = () => {};

    if (isAdmin) {
      unsubSync = subscribeFailedSyncLogs(
        10,
        (items) => {
          setFailedSyncLogs(items);
          markReady();

          if (
            items.length &&
            !syncNotifiedRef.current
          ) {
            syncNotifiedRef.current = true;
            notifyAdminsSyncFailures(items);
          }
        }
      );
    }

    return () => {
      cancelled = true;
      setConnected(false);
      unsubClients();
      unsubPayments();
      unsubSchedule();
      unsubTraffic();
      unsubSync();
    };
  }, [userData, isAdmin, today]);

  useEffect(() => {
    if (!userData || !clients.length) {
      return;
    }

    syncClientReminders(userData, clients);

    if (isManager && schedule) {
      syncManagerShiftNotifications({
        userData,
        schedule: resolveEffectiveSchedule(
          schedule,
          today
        ),
      });
    }
  }, [userData, clients, schedule, isManager, today]);

  const summary = useMemo(() => {
    const effectiveSchedule =
      resolveEffectiveSchedule(
        schedule,
        today
      );

    const operational =
      buildOperationalSummary({
        payments,
        clients,
        managerId,
        managerName: displayName,
      });

    const overdueClients = clients.filter(
      (client) => isOverdue(client)
    );

    const tasks = buildTodayTasks(clients);
    const activeSubscriptions =
      buildActiveSubscriptions(clients);

    const shiftInfo = managerId
      ? getManagerShiftInfo(
          effectiveSchedule,
          managerId
        )
      : null;

    const trafficLoad = managerId && traffic
      ? getManagerTrafficLoad(
          traffic,
          managerId
        )
      : null;

    const teamLoad = traffic
      ? summarizeTeamLoad(traffic)
      : [];

    const activeManagers = effectiveSchedule
      ? getActiveManagers(effectiveSchedule)
      : [];

    return {
      ...operational,
      overdueClients,
      tasks,
      activeSubscriptions,
      shiftInfo,
      trafficLoad,
      teamLoad,
      activeManagers,
      failedSyncCount: failedSyncLogs.length,
    };
  }, [
    clients,
    payments,
    schedule,
    traffic,
    failedSyncLogs,
    managerId,
    displayName,
  ]);

  return {
    clients,
    payments,
    schedule,
    traffic,
    failedSyncLogs,
    summary,
    initialLoading,
    connected,
    today,
  };
}

export function useSubscriptionsRealtime() {
  const { userData } = useAuth();

  const [clients, setClients] = useState([]);
  const [initialLoading, setInitialLoading] =
    useState(true);

  const [connected, setConnected] =
    useState(false);

  useEffect(() => {
    if (!userData) {
      return undefined;
    }

    setConnected(true);

    const unsubscribe =
      subscribeClientsForUser(
        userData,
        (items) => {
          setClients(items);
          setInitialLoading(false);
          syncClientReminders(
            userData,
            items
          );
        }
      );

    return () => {
      setConnected(false);
      unsubscribe();
    };
  }, [userData]);

  const subscriptions = useMemo(
    () =>
      clients
        .filter((client) => hasDebt(client))
        .map((client) => ({
          ...client,
          remain: getRemain(client),
          overdue: isOverdue(client),
        })),
    [clients]
  );

  return {
    subscriptions,
    initialLoading,
    connected,
  };
}

export function useManagementRealtime(date) {
  const [schedule, setSchedule] = useState(null);
  const [traffic, setTraffic] = useState(null);
  const [failedSyncLogs, setFailedSyncLogs] =
    useState([]);
  const [recentSyncLogs, setRecentSyncLogs] =
    useState([]);

  const [initialLoading, setInitialLoading] =
    useState(true);

  const [connected, setConnected] =
    useState(false);

  const syncNotifiedRef = useRef("");

  useEffect(() => {
    if (!date) {
      return undefined;
    }

    setConnected(true);
    let pending = 4;
    let cancelled = false;

    function markReady() {
      pending -= 1;

      if (pending <= 0 && !cancelled) {
        setInitialLoading(false);
      }
    }

    const unsubSchedule =
      subscribeScheduleByDate(
        date,
        (item) => {
          setSchedule(item);
          markReady();
        }
      );

    const unsubTraffic =
      subscribeTrafficByDate(
        date,
        (item) => {
          setTraffic(item);
          markReady();
        }
      );

    const unsubFailed = subscribeFailedSyncLogs(
      10,
      (items) => {
        setFailedSyncLogs(items);
        markReady();

        const key = items
          .map((log) => log.id)
          .join(",");

        if (
          key &&
          key !== syncNotifiedRef.current
        ) {
          syncNotifiedRef.current = key;
          notifyAdminsSyncFailures(items);
        }
      }
    );

    const unsubRecent = subscribeRecentSyncLogs(
      10,
      (items) => {
        setRecentSyncLogs(items);
        markReady();
      }
    );

    return () => {
      cancelled = true;
      setConnected(false);
      unsubSchedule();
      unsubTraffic();
      unsubFailed();
      unsubRecent();
    };
  }, [date]);

  const teamLoad = useMemo(
    () =>
      traffic
        ? summarizeTeamLoad(traffic)
        : [],
    [traffic]
  );

  return {
    schedule,
    traffic,
    failedSyncLogs,
    recentSyncLogs,
    teamLoad,
    initialLoading,
    connected,
  };
}

export function useAdminAnalyticsSummary() {
  const { userData } = useAuth();

  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [connected, setConnected] =
    useState(false);

  useEffect(() => {
    if (!userData) {
      return undefined;
    }

    setConnected(true);

    const unsubClients =
      subscribeClientsForUser(
        userData,
        setClients
      );

    const unsubPayments =
      subscribeOperationalPayments(
        userData,
        500,
        setPayments
      );

    return () => {
      setConnected(false);
      unsubClients();
      unsubPayments();
    };
  }, [userData]);

  const summary = useMemo(() => {
    const operational =
      buildOperationalSummary({
        payments,
        clients,
      });

    const overdue = clients.filter(
      (client) => isOverdue(client)
    ).length;

    return {
      revenue: operational.totalRevenue,
      deals: operational.totalDeals,
      overdue,
      recentPayments: payments.length,
      recentRevenue: operational.totalRevenue,
    };
  }, [clients, payments]);

  return {
    summary,
    connected,
  };
}
