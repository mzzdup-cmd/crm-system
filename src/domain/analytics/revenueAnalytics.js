import {
  getManagerNameById,
} from "../../constants/managers";

import {
  resolveCanonicalManagerKey,
} from "../auth/managerMigration";

export function aggregateRevenue(
  payments
) {
  return payments.reduce(
    (sum, payment) =>
      sum +
      Number(payment.amount || 0),
    0
  );
}

export function aggregateByManager(
  payments
) {
  const stats = {};

  payments.forEach((payment) => {
    const key =
      resolveCanonicalManagerKey(
        payment.managerId ||
          payment.manager
      ) || "unknown";

    if (!stats[key]) {
      stats[key] = {
        managerKey: key,
        name:
          getManagerNameById(key) ||
          payment.manager ||
          key,
        revenue: 0,
        deals: 0,
      };
    }

    stats[key].revenue += Number(
      payment.amount || 0
    );

    stats[key].deals += 1;
  });

  return Object.values(stats).sort(
    (a, b) => b.revenue - a.revenue
  );
}

export function aggregateByCourse(
  payments
) {
  const stats = {};

  payments.forEach((payment) => {
    const course =
      payment.course || "Без курса";

    if (!stats[course]) {
      stats[course] = {
        course,
        revenue: 0,
        deals: 0,
      };
    }

    stats[course].revenue += Number(
      payment.amount || 0
    );

    stats[course].deals += 1;
  });

  return Object.values(stats).sort(
    (a, b) => b.revenue - a.revenue
  );
}

export function aggregateByTariff(
  payments,
  clientsById = {}
) {
  const stats = {
    VIP: { revenue: 0, count: 0 },
    Базовый: { revenue: 0, count: 0 },
    Other: { revenue: 0, count: 0 },
  };

  payments.forEach((payment) => {
    const client =
      clientsById[payment.clientId];

    const tariff =
      payment.tariff ||
      client?.tariff ||
      "Other";

    const bucket =
      stats[tariff] || stats.Other;

    bucket.revenue += Number(
      payment.amount || 0
    );

    bucket.count += 1;
  });

  return stats;
}

export function calculateAverageCheck(
  revenue,
  deals
) {
  if (!deals) {
    return 0;
  }

  return Math.round(revenue / deals);
}

export function buildRevenueLineData(
  dailyBuckets
) {
  return dailyBuckets.map((item) => ({
    date: item.date.slice(5),
    revenue: item.value,
  }));
}

export function buildManagerBarData(
  managerStats
) {
  return managerStats.map((item) => ({
    name: item.name.split(" ")[0],
    fullName: item.name,
    revenue: item.revenue,
    deals: item.deals,
  }));
}
