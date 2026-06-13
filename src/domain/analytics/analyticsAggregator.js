import {
  ANALYTICS_PERIODS,
  getDateRange,
  parsePaymentDate,
  filterItemsByRange,
  groupByDay,
} from "./periodFilters";

import {
  aggregateDealCategories,
  getDealPieData,
} from "./dealAnalytics";

import {
  aggregateRevenue,
  aggregateByManager,
  aggregateByCourse,
  aggregateByTariff,
  calculateAverageCheck,
  buildRevenueLineData,
  buildManagerBarData,
} from "./revenueAnalytics";

import {
  buildManagerKpiStats,
  buildManagerRanking,
  getTopManager,
  buildKpiChartData,
} from "./kpiAnalytics";

import {
  enrichSubscriptionStats,
} from "./subscriptionAnalytics";

import {
  buildTrafficChartData,
  buildManagementOverview,
  buildSyncOverview,
} from "./trafficAnalytics";

import {
  buildSalaryReport,
} from "../salary/salaryCalculator";

import {
  filterSalaryDataByRange,
} from "../salary/salaryPeriod";

import { MANAGERS } from "../../constants/managers";

function indexClientsById(clients) {
  return Object.fromEntries(
    clients.map((client) => [
      client.id,
      client,
    ])
  );
}

function buildTopManagers(allPayments) {
  const periods = [
    {
      key: "day",
      label: "Топ дня",
      period: ANALYTICS_PERIODS.TODAY,
    },
    {
      key: "week",
      label: "Топ недели",
      period: ANALYTICS_PERIODS.WEEK,
    },
    {
      key: "month",
      label: "Топ месяца",
      period: ANALYTICS_PERIODS.MONTH,
    },
  ];

  return periods.map((item) => {
    const range = getDateRange(
      item.period
    );

    const filtered =
      filterItemsByRange(
        allPayments,
        range,
        parsePaymentDate
      );

    const managerStats =
      aggregateByManager(filtered);

    return {
      ...item,
      manager: getTopManager(
        buildManagerKpiStats(filtered)
      ),
      revenue: aggregateRevenue(
        filtered
      ),
      leader: managerStats[0] || null,
    };
  });
}

export function buildAnalyticsReport({
  payments = [],
  clients = [],
  nightShifts = [],
  manualBonuses = [],
  schedule = null,
  traffic = null,
  syncLogs = [],
  period = ANALYTICS_PERIODS.MONTH,
  customRange = {},
}) {
  const range = getDateRange(
    period,
    customRange
  );

  const clientsById =
    indexClientsById(clients);

  const periodPayments =
    filterItemsByRange(
      payments,
      range,
      parsePaymentDate
    );

  const {
    nightShifts: periodNightShifts,
    manualBonuses: periodManualBonuses,
  } = filterSalaryDataByRange({
    payments,
    nightShifts,
    manualBonuses,
    range,
  });

  const totalRevenue =
    aggregateRevenue(periodPayments);

  const totalDeals =
    periodPayments.length;

  const managerStats =
    aggregateByManager(periodPayments);

  const courseStats =
    aggregateByCourse(periodPayments);

  const dealTotals =
    aggregateDealCategories(
      periodPayments
    );

  const tariffStats =
    aggregateByTariff(
      periodPayments,
      clientsById
    );

  const subscriptionStats =
    enrichSubscriptionStats(clients);

  const managerKpiStats =
    buildManagerKpiStats(
      periodPayments,
      clientsById
    );

  const dailyRevenue = groupByDay(
    periodPayments,
    range,
    parsePaymentDate,
    (payment) =>
      Number(payment.amount || 0)
  );

  const managerNames =
    Object.fromEntries(
      MANAGERS.map((manager) => [
        manager.id,
        manager.name,
      ])
    );

  MANAGERS.forEach((manager) => {
    managerNames[manager.name] =
      manager.name;
  });

  const salaryReport = buildSalaryReport({
    payments: periodPayments,
    nightShifts: periodNightShifts,
    manualBonuses: periodManualBonuses,
    managerNames,
  });

  return {
    period,
    range,
    summary: {
      totalRevenue,
      totalDeals,
      averageCheck: calculateAverageCheck(
        totalRevenue,
        totalDeals
      ),
      newDeals: dealTotals.new.count,
      newRevenue: dealTotals.new.revenue,
      topups: dealTotals.topup.count,
      topupRevenue: dealTotals.topup.revenue,
      upsells: dealTotals.upsell.count,
      upsellRevenue:
        dealTotals.upsell.revenue,
      subscriptions:
        subscriptionStats.subscriptionsCount,
      overdueCount:
        subscriptionStats.overdueCount,
      overdueAmount:
        subscriptionStats.overdueAmount,
      vipRevenue: tariffStats.VIP.revenue,
      baseRevenue:
        tariffStats.Базовый.revenue,
    },
    charts: {
      revenueLine:
        buildRevenueLineData(
          dailyRevenue
        ),
      managerBars:
        buildManagerBarData(
          managerStats
        ),
      dealPie: getDealPieData(
        dealTotals
      ),
      trafficLoad:
        buildTrafficChartData(traffic),
      subscriptionSplit: [
        {
          name: "Подписки",
          value:
            subscriptionStats.subscriptionsCount,
        },
        {
          name: "Просрочки",
          value:
            subscriptionStats.overdueCount,
        },
      ],
      managerKpi:
        buildKpiChartData(
          managerKpiStats
        ),
    },
    managerRanking:
      buildManagerRanking(
        managerKpiStats
      ),
    topManagers: buildTopManagers(
      payments
    ),
    courseStats,
    managerStats,
    subscriptionStats,
    salaryReport,
    management:
      buildManagementOverview({
        schedule,
        traffic,
      }),
    syncOverview:
      buildSyncOverview(syncLogs),
    dealTotals,
  };
}
