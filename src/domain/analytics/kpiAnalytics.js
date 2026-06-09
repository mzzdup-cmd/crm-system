import {
  getDealCategory,
  DEAL_CATEGORIES,
} from "./dealAnalytics";

import {
  calculateAverageCheck,
} from "./revenueAnalytics";

import {
  getManagerNameById,
} from "../../constants/managers";

export function buildManagerKpiStats(
  payments,
  clientsById = {}
) {
  const stats = {};

  payments.forEach((payment) => {
    const key =
      payment.managerId ||
      payment.manager ||
      "unknown";

    if (!stats[key]) {
      stats[key] = {
        managerKey: key,
        name:
          payment.manager ||
          getManagerNameById(key) ||
          key,
        revenue: 0,
        deals: 0,
        newDeals: 0,
        topups: 0,
        upsells: 0,
        vipRevenue: 0,
        baseRevenue: 0,
      };
    }

    const entry = stats[key];
    const amount = Number(
      payment.amount || 0
    );

    entry.revenue += amount;
    entry.deals += 1;

    const category = getDealCategory(
      payment.dealType
    );

    if (
      category === DEAL_CATEGORIES.NEW
    ) {
      entry.newDeals += 1;
    }

    if (
      category === DEAL_CATEGORIES.TOPUP
    ) {
      entry.topups += 1;
    }

    if (
      category === DEAL_CATEGORIES.UPSELL
    ) {
      entry.upsells += 1;
    }

    const client =
      clientsById[payment.clientId];

    const tariff =
      payment.tariff ||
      client?.tariff;

    if (tariff === "VIP") {
      entry.vipRevenue += amount;
    } else if (tariff === "Базовый") {
      entry.baseRevenue += amount;
    }
  });

  return Object.values(stats)
    .map((item) => ({
      ...item,
      averageCheck: calculateAverageCheck(
        item.revenue,
        item.deals
      ),
    }))
    .sort(
      (a, b) => b.revenue - a.revenue
    );
}

export function buildManagerRanking(
  managerKpiStats
) {
  return managerKpiStats.map(
    (item, index) => ({
      rank: index + 1,
      ...item,
    })
  );
}

export function getTopManager(
  managerKpiStats
) {
  return managerKpiStats[0] || null;
}

export function buildKpiChartData(
  managerKpiStats
) {
  return managerKpiStats
    .slice(0, 8)
    .map((item) => ({
      name: item.name.split(" ")[0],
      revenue: item.revenue,
      newDeals: item.newDeals,
      topups: item.topups,
      upsells: item.upsells,
    }));
}
