import {
  useEffect,
  useState,
  useMemo,
} from "react";

import { useAuth } from "../context/AuthContext";
import { usePermissions } from "./usePermissions";

import {
  subscribeClientsForUser,
  subscribeOperationalPayments,
  subscribeRecentPaymentsForUser,
  subscribeScheduleByDate,
  subscribeTrafficByDate,
} from "../services/realtimeService";

import {
  categorizeSubscriptions,
} from "../domain/client/subscriptionOutcome";

import {
  buildBbBookingItems,
} from "../domain/client/bbBookingLogic";

import {
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
} from "../services/reminderSyncService";


import {
  syncCuratorStartRemindersForUser,
} from "../services/curatorStartReminderService";

import {
  buildOperationalSummary,
} from "../domain/kpi/operationalKpi";

const OPERATIONAL_PAYMENTS_LIMIT = 3000;

export function useDashboardRealtime() {
  const { userData } = useAuth();
  const { isLeadership, isManager, managerId, displayName } =
    usePermissions();

  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [traffic, setTraffic] = useState(null);

  const [initialLoading, setInitialLoading] =
    useState(true);

  const [connected, setConnected] =
    useState(false);

  const today = getTodayDateString();

  useEffect(() => {
    if (!userData) {
      setInitialLoading(false);
      setConnected(false);
      return undefined;
    }

    setInitialLoading(true);
    setConnected(true);
    let pending = 4;
    let cancelled = false;

    const timeoutId = window.setTimeout(
      () => {
        if (!cancelled) {
          setInitialLoading(false);
        }
      },
      10000
    );

    function markReady() {
      pending -= 1;

      if (pending <= 0 && !cancelled) {
        window.clearTimeout(timeoutId);
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

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      setConnected(false);
      unsubClients();
      unsubPayments();
      unsubSchedule();
      unsubTraffic();
    };
  }, [userData, today]);

  useEffect(() => {
    if (!userData || !clients.length) {
      return;
    }

    syncClientReminders(userData, clients);

    // Missing VK reminder sync disabled.

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

  useEffect(() => {
    if (
      !userData?.uid ||
      !payments.length
    ) {
      return;
    }

    syncCuratorStartRemindersForUser(
      userData,
      payments,
      clients
    ).catch((error) => {
      console.error(
        "Curator start reminder sync failed:",
        error
      );
    });
  }, [userData, payments, clients]);

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

    const unsyncedTtCount = isLeadership
      ? payments.filter(
          (payment) =>
            !payment.deletedAt &&
            payment.syncedToSheets !== true
        ).length
      : 0;

    return {
      ...operational,
      overdueClients,
      tasks,
      activeSubscriptions,
      shiftInfo,
      trafficLoad,
      teamLoad,
      activeManagers,
      unsyncedTtCount,
      failedSyncCount: 0,
    };
  }, [
    clients,
    payments,
    schedule,
    traffic,
    isLeadership,
    managerId,
    displayName,
  ]);

  return {
    clients,
    payments,
    schedule,
    traffic,
    summary,
    initialLoading,
    connected,
    today,
  };
}

export function useSubscriptionsRealtime() {
  const { userData } = useAuth();

  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [initialLoading, setInitialLoading] =
    useState(true);

  const [connected, setConnected] =
    useState(false);

  useEffect(() => {
    if (!userData) {
      return undefined;
    }

    setConnected(true);
    let pending = 2;

    function markReady() {
      pending -= 1;

      if (pending <= 0) {
        setInitialLoading(false);
      }
    }

    const unsubClients =
      subscribeClientsForUser(
        userData,
        (items) => {
          setClients(items);
          markReady();
          syncClientReminders(
            userData,
            items
          );
        }
      );

    const unsubPayments =
      subscribeRecentPaymentsForUser(
        userData,
        OPERATIONAL_PAYMENTS_LIMIT,
        (items) => {
          setPayments(items);
          markReady();
        }
      );

    return () => {
      setConnected(false);
      unsubClients();
      unsubPayments();
    };
  }, [userData]);

  const subscriptionGroups = useMemo(() => {
    const groups = categorizeSubscriptions(
      clients,
      payments
    );

    const enrich = (items) =>
      items.map((client) => ({
        ...client,
        remain: getRemain(client),
        overdue: isOverdue(client),
      }));

    return {
      active: enrich(groups.active),
      completed: enrich(groups.completed),
      churned: enrich(groups.churned),
    };
  }, [clients, payments]);

  return {
    subscriptions: subscriptionGroups.active,
    activeSubscriptions:
      subscriptionGroups.active,
    completedSubscriptions:
      subscriptionGroups.completed,
    churnedSubscriptions:
      subscriptionGroups.churned,
    subscriptionCounts: {
      active:
        subscriptionGroups.active.length,
      completed:
        subscriptionGroups.completed.length,
      churned:
        subscriptionGroups.churned.length,
    },
    initialLoading,
    connected,
  };
}

export function useBookingsRealtime() {
  const { userData } = useAuth();

  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [initialLoading, setInitialLoading] =
    useState(true);

  const [connected, setConnected] =
    useState(false);

  useEffect(() => {
    if (!userData) {
      return undefined;
    }

    setConnected(true);
    let pending = 2;

    function markReady() {
      pending -= 1;

      if (pending <= 0) {
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
      subscribeRecentPaymentsForUser(
        userData,
        OPERATIONAL_PAYMENTS_LIMIT,
        (items) => {
          setPayments(items);
          markReady();
        }
      );

    return () => {
      setConnected(false);
      unsubClients();
      unsubPayments();
    };
  }, [userData]);

  const bookings = useMemo(
    () =>
      buildBbBookingItems(
        clients,
        payments
      ),
    [clients, payments]
  );

  return {
    bookings,
    initialLoading,
    connected,
  };
}

export function useManagementRealtime(date) {
  const [schedule, setSchedule] = useState(null);
  const [traffic, setTraffic] = useState(null);

  const [initialLoading, setInitialLoading] =
    useState(true);

  const [connected, setConnected] =
    useState(false);

  useEffect(() => {
    if (!date) {
      return undefined;
    }

    setConnected(true);
    let pending = 2;
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

    return () => {
      cancelled = true;
      setConnected(false);
      unsubSchedule();
      unsubTraffic();
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
