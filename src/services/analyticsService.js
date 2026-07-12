import {
  getPaymentsForUser,
} from "./paymentService";

import {
  getClientsForUser,
} from "./clientService";

import {
  getNightShiftsForUser,
} from "./shiftService";

import {
  getManualBonusesForUser,
} from "./bonusService";

import {
  getTodayScheduleOrDefault,
} from "./scheduleService";

import {
  getTodayTraffic,
} from "./trafficService";

import {
  getSyncLogs,
} from "./syncLogService";

import {
  buildAnalyticsReport,
} from "../domain/analytics/analyticsAggregator";

import {
  ANALYTICS_PERIODS,
} from "../domain/analytics/periodFilters";

let cachedSnapshot = null;
let cacheTimestamp = 0;
let cacheUserKey = null;

const CACHE_TTL_MS = 60 * 1000;

async function loadSourceSafely(
  label,
  loader,
  fallback = []
) {
  try {
    return await loader();
  } catch (error) {
    console.warn(
      `[analyticsService] ${label} unavailable:`,
      error
    );
    return fallback;
  }
}

async function loadSyncLogsSafely(count = 50) {
  return loadSourceSafely(
    "syncLog",
    () => getSyncLogs(count),
    []
  );
}

async function loadAnalyticsSnapshot(
  userData
) {
  const now = Date.now();
  const userKey =
    userData?.uid || "anonymous";

  if (
    cachedSnapshot &&
    cacheUserKey === userKey &&
    now - cacheTimestamp < CACHE_TTL_MS
  ) {
    return cachedSnapshot;
  }

  if (!userData) {
    return {
      payments: [],
      clients: [],
      nightShifts: [],
      manualBonuses: [],
      schedule: null,
      traffic: null,
      syncLogs: [],
    };
  }

  const [
    payments,
    clients,
    nightShifts,
    manualBonuses,
    schedule,
    traffic,
    syncLogs,
  ] = await Promise.all([
    loadSourceSafely(
      "payments",
      () =>
        getPaymentsForUser(userData)
    ),
    loadSourceSafely(
      "clients",
      () =>
        getClientsForUser(userData)
    ),
    loadSourceSafely(
      "nightShifts",
      () =>
        getNightShiftsForUser(userData)
    ),
    loadSourceSafely(
      "manualBonuses",
      () =>
        getManualBonusesForUser(
          userData
        )
    ),
    loadSourceSafely(
      "schedule",
      () =>
        getTodayScheduleOrDefault(),
      null
    ),
    loadSourceSafely(
      "traffic",
      () => getTodayTraffic(),
      null
    ),
    loadSyncLogsSafely(50),
  ]);

  cachedSnapshot = {
    payments,
    clients,
    nightShifts,
    manualBonuses,
    schedule,
    traffic,
    syncLogs,
  };

  cacheTimestamp = now;
  cacheUserKey = userKey;

  return cachedSnapshot;
}

export function clearAnalyticsCache() {
  cachedSnapshot = null;
  cacheTimestamp = 0;
  cacheUserKey = null;
}

export async function getAdminAnalytics({
  userData = null,
  period = ANALYTICS_PERIODS.MONTH,
  customRange = {},
} = {}) {
  const snapshot =
    await loadAnalyticsSnapshot(userData);

  return buildAnalyticsReport({
    ...snapshot,
    period,
    customRange,
  });
}

export {
  ANALYTICS_PERIODS,
};
