import {
  getAllPayments,
} from "./paymentService";

import {
  getAllClients,
} from "./clientService";

import {
  getAllNightShifts,
} from "./shiftService";

import {
  getAllManualBonuses,
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

const CACHE_TTL_MS = 60 * 1000;

async function loadAnalyticsSnapshot() {
  const now = Date.now();

  if (
    cachedSnapshot &&
    now - cacheTimestamp < CACHE_TTL_MS
  ) {
    return cachedSnapshot;
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
    getAllPayments(),
    getAllClients(),
    getAllNightShifts(),
    getAllManualBonuses(),
    getTodayScheduleOrDefault(),
    getTodayTraffic(),
    getSyncLogs(50),
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

  return cachedSnapshot;
}

export function clearAnalyticsCache() {
  cachedSnapshot = null;
  cacheTimestamp = 0;
}

export async function getAdminAnalytics({
  period = ANALYTICS_PERIODS.MONTH,
  customRange = {},
} = {}) {
  const snapshot =
    await loadAnalyticsSnapshot();

  return buildAnalyticsReport({
    ...snapshot,
    period,
    customRange,
  });
}

export {
  ANALYTICS_PERIODS,
};
