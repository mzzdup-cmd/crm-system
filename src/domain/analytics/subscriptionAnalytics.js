import {
  hasDebt,
  isOverdue,
  getRemain,
} from "../client/clientStatus";

import {
  getManagerNameById,
} from "../../constants/managers";

import {
  resolveCanonicalManagerKey,
} from "../auth/managerMigration";

export function analyzeSubscriptions(
  clients
) {
  const subscriptions = clients.filter(
    (client) => hasDebt(client)
  );

  const overdue = clients.filter(
    (client) => isOverdue(client)
  );

  const overdueAmount = overdue.reduce(
    (sum, client) =>
      sum + getRemain(client),
    0
  );

  return {
    subscriptionsCount:
      subscriptions.length,
    overdueCount: overdue.length,
    overdueAmount,
    subscriptions,
    overdue,
  };
}

export function aggregateOverdueByManager(
  clients
) {
  const stats = {};

  clients
    .filter((client) =>
      isOverdue(client)
    )
    .forEach((client) => {
      const key =
        resolveCanonicalManagerKey(
          client.managerId ||
            client.manager
        ) || "unknown";

      if (!stats[key]) {
        stats[key] = {
          managerKey: key,
          name:
            client.manager ||
            getManagerNameById(key) ||
            key,
          count: 0,
          amount: 0,
        };
      }

      stats[key].count += 1;
      stats[key].amount += getRemain(
        client
      );
    });

  return Object.values(stats).sort(
    (a, b) => b.amount - a.amount
  );
}

export function buildSubscriptionChartData(
  subscriptionStats
) {
  return [
    {
      name: "Подписки",
      value:
        subscriptionStats.subscriptionsCount,
    },
    {
      name: "Просрочки",
      value: subscriptionStats.overdueCount,
    },
    {
      name: "Оплачено",
      value: Math.max(
        0,
        subscriptionStats.totalClients -
          subscriptionStats.subscriptionsCount
      ),
    },
  ];
}

export function enrichSubscriptionStats(
  clients
) {
  const base = analyzeSubscriptions(
    clients
  );

  return {
    ...base,
    totalClients: clients.length,
    byManager:
      aggregateOverdueByManager(clients),
  };
}
