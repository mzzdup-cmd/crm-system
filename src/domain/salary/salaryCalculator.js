import {
  BASE_SALARY,
  SALES_PERCENT,
  REVENUE_BONUSES,
  NIGHT_SHIFT_BONUS,
} from "../../constants/salary";

export function calculateRevenueBonus(revenue) {
  for (const bonus of REVENUE_BONUSES) {
    if (revenue >= bonus.threshold) {
      return bonus.amount;
    }
  }

  return 0;
}

export function calculateSalary({
  revenue = 0,
  nightShifts = 0,
  manualBonus = 0,
}) {
  const percentBonus = Math.round(
    revenue * SALES_PERCENT
  );

  const revenueBonus = calculateRevenueBonus(revenue);
  const nightBonus = nightShifts * NIGHT_SHIFT_BONUS;

  const totalSalary =
    BASE_SALARY +
    percentBonus +
    revenueBonus +
    nightBonus +
    manualBonus;

  return {
    baseSalary: BASE_SALARY,
    percentBonus,
    revenueBonus,
    nightBonus,
    manualBonus,
    totalSalary,
    revenue,
    nightShifts,
  };
}

export function buildManagerSalaryStats({
  payments = [],
  nightShifts = [],
  manualBonuses = [],
}) {
  const statsByManager = {};

  function ensureManagerStats(managerKey) {
    if (!statsByManager[managerKey]) {
      statsByManager[managerKey] = {
        managerKey,
        revenue: 0,
        deals: 0,
        nightShifts: 0,
        manualBonus: 0,
      };
    }

    return statsByManager[managerKey];
  }

  payments.forEach((payment) => {
    if (payment.deletedAt) {
      return;
    }

    const managerKey =
      payment.managerId || payment.manager;

    if (!managerKey) {
      return;
    }

    const stats = ensureManagerStats(managerKey);

    stats.revenue += Number(payment.amount || 0);
    stats.deals += 1;
  });

  nightShifts.forEach((shift) => {
    if (shift.deletedAt) {
      return;
    }

    const managerKey =
      shift.managerId || shift.manager;

    if (!managerKey) {
      return;
    }

    const stats = ensureManagerStats(managerKey);

    stats.nightShifts += 1;
  });

  manualBonuses.forEach((bonus) => {
    if (bonus.deletedAt) {
      return;
    }

    const managerKey =
      bonus.managerId || bonus.manager;

    if (!managerKey) {
      return;
    }

    const stats = ensureManagerStats(managerKey);

    stats.manualBonus += Number(bonus.amount || 0);
  });

  return statsByManager;
}

export function buildSalaryReport({
  payments = [],
  nightShifts = [],
  manualBonuses = [],
  managerNames = {},
  allManagerKeys = [],
}) {
  const statsByManager = buildManagerSalaryStats({
    payments,
    nightShifts,
    manualBonuses,
  });

  allManagerKeys.forEach((managerKey) => {
    if (!statsByManager[managerKey]) {
      statsByManager[managerKey] = {
        managerKey,
        revenue: 0,
        deals: 0,
        nightShifts: 0,
        manualBonus: 0,
      };
    }
  });

  return Object.values(statsByManager)
    .map((stats) => {
    const salary = calculateSalary({
      revenue: stats.revenue,
      nightShifts: stats.nightShifts,
      manualBonus: stats.manualBonus,
    });

    const displayName =
      managerNames[stats.managerKey] ||
      stats.managerKey;

    return {
      managerKey: stats.managerKey,
      name: displayName,
      deals: stats.deals,
      ...salary,
    };
  })
    .sort((a, b) => {
      if (!allManagerKeys.length) {
        return a.name.localeCompare(
          b.name,
          "ru"
        );
      }

      const indexA =
        allManagerKeys.indexOf(
          a.managerKey
        );
      const indexB =
        allManagerKeys.indexOf(
          b.managerKey
        );

      return indexA - indexB;
    });
}
