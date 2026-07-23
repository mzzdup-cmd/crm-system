import {
  MANAGERS,
  getManagerNameById,
} from "../../constants/managers";

import {
  REVENUE_BONUSES,
} from "../../constants/salary";

import {
  ANALYTICS_PERIODS,
  getDateRange,
  filterItemsByRange,
  parsePaymentDate,
} from "../analytics/periodFilters";

import {
  calculateAverageCheck,
} from "../analytics/revenueAnalytics";

import {
  isPaymentDeleted,
} from "../payment/paymentPermissions";

import {
  getPaymentRevenueContribution,
  countsAsKpiSale,
} from "../payment/paymentRevenue";

import {
  resolveCanonicalManagerKey,
  expandManagerIdAliases,
  resolveManagerIdFromLegacy,
} from "../auth/managerMigration";

import {
  hasDebt,
} from "../client/clientStatus";

export function filterActivePayments(
  payments = []
) {
  return payments.filter(
    (payment) =>
      !isPaymentDeleted(payment)
  );
}

export function getCurrentMonthRange() {
  return getDateRange(
    ANALYTICS_PERIODS.MONTH
  );
}

export function filterPaymentsForPeriod(
  payments = [],
  range = getCurrentMonthRange()
) {
  return filterItemsByRange(
    filterActivePayments(payments),
    range,
    parsePaymentDate
  );
}

export function sumPaymentRevenue(
  payments = []
) {
  return filterActivePayments(
    payments
  ).reduce(
    (sum, payment) =>
      sum +
      getPaymentRevenueContribution(
        payment
      ),
    0
  );
}

export function paymentBelongsToManager(
  payment,
  managerId,
  managerName = ""
) {
  if (!managerId && !managerName) {
    return true;
  }

  const paymentManagerId =
    payment.managerId
      ? resolveManagerIdFromLegacy(
          payment.managerId
        ) || payment.managerId
      : resolveManagerIdFromLegacy(
          payment.manager
        );

  if (managerId && paymentManagerId) {
    const ownerAliases =
      expandManagerIdAliases(managerId);
    const paymentAliases =
      expandManagerIdAliases(
        paymentManagerId
      );

    if (
      ownerAliases.some((ownerId) =>
        paymentAliases.includes(ownerId)
      )
    ) {
      return true;
    }
  }

  const paymentKey =
    payment.managerId ||
    payment.manager;

  if (!paymentKey) {
    return false;
  }

  const resolvedName =
    managerName ||
    getManagerNameById(managerId);

  if (
    resolvedName &&
    paymentKey === resolvedName
  ) {
    return true;
  }

  if (
    payment.manager &&
    resolvedName &&
    payment.manager === resolvedName
  ) {
    return true;
  }

  return false;
}

export function buildManagerStatsFromPayments(
  payments = []
) {
  const stats = {};

  filterActivePayments(payments).forEach(
    (payment) => {
      const managerKey =
        resolveCanonicalManagerKey(
          payment.managerId ||
            payment.manager
        );

      if (!managerKey) {
        return;
      }

      if (!stats[managerKey]) {
        stats[managerKey] = {
          managerKey,
          name:
            payment.manager ||
            getManagerNameById(
              managerKey
            ) ||
            managerKey,
          revenue: 0,
          deals: 0,
        };
      }

      stats[managerKey].revenue +=
        getPaymentRevenueContribution(
          payment
        );

      if (countsAsKpiSale(payment)) {
        stats[managerKey].deals += 1;
      }
    }
  );

  return Object.values(stats).sort(
    (a, b) => b.revenue - a.revenue
  );
}

export function getRevenueGoalProgress(
  revenue
) {
  const thresholds = [
    ...REVENUE_BONUSES,
  ]
    .map((item) => item.threshold)
    .sort((a, b) => a - b);

  const nextThreshold =
    thresholds.find(
      (threshold) =>
        revenue < threshold
    );

  if (!nextThreshold) {
    const max =
      thresholds[thresholds.length - 1] ||
      0;

    return {
      threshold: max,
      remaining: 0,
      achieved: true,
    };
  }

  return {
    threshold: nextThreshold,
    remaining:
      nextThreshold - revenue,
    achieved: false,
  };
}

export function buildPersonalMonthKpi({
  payments = [],
  managerId,
  managerName = "",
  range = getCurrentMonthRange(),
}) {
  const personalPayments =
    filterPaymentsForPeriod(
      payments.filter((payment) =>
        paymentBelongsToManager(
          payment,
          managerId,
          managerName
        )
      ),
      range
    );

  const revenue =
    sumPaymentRevenue(
      personalPayments
    );

  const deals =
    personalPayments.filter(
      countsAsKpiSale
    ).length;

  const goal =
    getRevenueGoalProgress(revenue);

  return {
    revenue,
    deals,
    averageCheck:
      calculateAverageCheck(
        revenue,
        deals
      ),
    goalThreshold: goal.threshold,
    remainingToGoal: goal.remaining,
    goalAchieved: goal.achieved,
    range,
  };
}

function normalizeManagerKey(managerKey) {
  return resolveCanonicalManagerKey(
    managerKey
  );
}

export function buildMonthLeaderboard(
  payments = [],
  range = getCurrentMonthRange()
) {
  const monthPayments =
    filterPaymentsForPeriod(
      payments,
      range
    );

  const statsFromPayments =
    buildManagerStatsFromPayments(
      monthPayments
    );

  const stats = Object.fromEntries(
    MANAGERS.map((manager) => [
      manager.id,
      {
        managerKey: manager.id,
        name: manager.name,
        revenue: 0,
        deals: 0,
      },
    ])
  );

  statsFromPayments.forEach((item) => {
    const normalizedKey =
      normalizeManagerKey(
        item.managerKey
      );

    if (
      !normalizedKey ||
      !stats[normalizedKey]
    ) {
      return;
    }

    stats[normalizedKey].revenue +=
      item.revenue;
    stats[normalizedKey].deals +=
      item.deals;
  });

  return Object.values(stats).sort(
    (a, b) => b.revenue - a.revenue
  );
}

function matchesManagerKey(
  managerKey,
  managerId,
  managerName
) {
  if (!managerKey) {
    return false;
  }

  const normalizedKey =
    resolveManagerIdFromLegacy(
      managerKey
    ) || managerKey;

  if (managerId) {
    const ownerAliases =
      expandManagerIdAliases(managerId);
    const keyAliases =
      expandManagerIdAliases(
        normalizedKey
      );

    if (
      ownerAliases.some((ownerId) =>
        keyAliases.includes(ownerId)
      )
    ) {
      return true;
    }
  }

  const resolvedName =
    managerName ||
    getManagerNameById(managerId);

  if (
    resolvedName &&
    (
      managerKey === resolvedName ||
      normalizedKey === resolvedName
    )
  ) {
    return true;
  }

  return false;
}

const TEAM_MOTIVATION_SALE_AMOUNT = 22000;

export function getMonthLeaderInfo({
  payments = [],
  managerId,
  managerName = "",
  range = getCurrentMonthRange(),
}) {
  const leaderboard =
    buildMonthLeaderboard(
      payments,
      range
    );

  if (!leaderboard.length) {
    return {
      leaderboard,
      leader: null,
      current: null,
      isLeader: false,
      difference: 0,
      teamAverageRevenue: 0,
      salesToCloseGap: 0,
      motivationSaleAmount:
        TEAM_MOTIVATION_SALE_AMOUNT,
    };
  }

  const leader = leaderboard[0];

  const current =
    leaderboard.find((item) =>
      matchesManagerKey(
        item.managerKey,
        managerId,
        managerName
      )
    ) || null;

  const isLeader =
    current &&
    leader.revenue > 0 &&
    current.revenue === leader.revenue;

  const difference = isLeader
    ? 0
    : Math.max(
        0,
        leader.revenue -
          (current?.revenue || 0)
      );

  const teamAverageRevenue =
    leaderboard.length
      ? leaderboard.reduce(
          (sum, item) =>
            sum + item.revenue,
          0
        ) / leaderboard.length
      : 0;

  const salesToCloseGap =
    difference > 0
      ? Math.ceil(
          difference /
            TEAM_MOTIVATION_SALE_AMOUNT
        )
      : 0;

  return {
    leaderboard,
    leader,
    current,
    isLeader: Boolean(isLeader),
    difference,
    teamAverageRevenue,
    salesToCloseGap,
    motivationSaleAmount:
      TEAM_MOTIVATION_SALE_AMOUNT,
  };
}

export function buildOperationalSummary({
  payments = [],
  clients = [],
  managerId,
  managerName = "",
}) {
  const monthRange =
    getCurrentMonthRange();

  const monthPayments =
    filterPaymentsForPeriod(
      payments,
      monthRange
    );

  const totalRevenue =
    sumPaymentRevenue(monthPayments);

  const totalDeals =
    monthPayments.filter(
      countsAsKpiSale
    ).length;

  const personalKpi =
    buildPersonalMonthKpi({
      payments,
      managerId,
      managerName,
      range: monthRange,
    });

  const leaderInfo =
    getMonthLeaderInfo({
      payments,
      managerId,
      managerName,
      range: monthRange,
    });

  const monthManagersStats =
    buildManagerStatsFromPayments(
      monthPayments
    );

  const managersStats =
    Object.fromEntries(
      monthManagersStats.map(
        (item) => [
          item.managerKey,
          {
            revenue: item.revenue,
            deals: item.deals,
          },
        ]
      )
    );

  return {
    monthRange,
    totalRevenue,
    totalDeals,
    averageCheck:
      calculateAverageCheck(
        totalRevenue,
        totalDeals
      ),
    personalKpi,
    leaderInfo,
    managersStats,
    subscriptions: clients.filter(
      (client) => hasDebt(client)
    ).length,
  };
}
