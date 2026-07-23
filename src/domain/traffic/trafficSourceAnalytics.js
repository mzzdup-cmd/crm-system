import {
  isPaymentDeleted,
} from "../payment/paymentPermissions";

import {
  resolveManagerDisplayName,
} from "../../services/clientService";

import {
  countsAsKpiSale,
  getPaymentRevenueContribution,
} from "../payment/paymentRevenue";

function resolvePaymentSource(
  payment,
  client
) {
  const sourceId =
    payment.sourceId ||
    client?.sourceId ||
    null;

  const sourceName =
    payment.sourceName ||
    client?.sourceName ||
    client?.source ||
    "Без источника";

  return {
    sourceId,
    sourceName,
    key: sourceId || `name:${sourceName}`,
  };
}

function matchesFirstContactFilter(
  firstContact,
  from,
  to
) {
  if (!from && !to) {
    return true;
  }

  if (!firstContact) {
    return false;
  }

  if (from && firstContact < from) {
    return false;
  }

  if (to && firstContact > to) {
    return false;
  }

  return true;
}

export function buildTrafficSourceAnalytics({
  payments = [],
  clientsById = {},
  filters = {},
}) {
  const {
    sourceId: filterSourceId,
    firstContactFrom,
    firstContactTo,
  } = filters;

  const statsMap = new Map();

  payments.forEach((payment) => {
    if (isPaymentDeleted(payment)) {
      return;
    }

    const client = payment.clientId
      ? clientsById[payment.clientId]
      : null;

    const firstContact =
      client?.firstContact || "";

    if (
      !matchesFirstContactFilter(
        firstContact,
        firstContactFrom,
        firstContactTo
      )
    ) {
      return;
    }

    const source = resolvePaymentSource(
      payment,
      client
    );

    if (
      filterSourceId &&
      source.sourceId !== filterSourceId
    ) {
      return;
    }

    if (!statsMap.has(source.key)) {
      statsMap.set(source.key, {
        sourceId: source.sourceId,
        sourceName: source.sourceName,
        salesCount: 0,
        revenue: 0,
        managerKeys: new Set(),
      });
    }

    const row = statsMap.get(source.key);

    if (countsAsKpiSale(payment)) {
      row.salesCount += 1;
    }

    row.revenue +=
      getPaymentRevenueContribution(
        payment
      );

    const managerKey =
      payment.managerId ||
      payment.manager;

    if (managerKey) {
      row.managerKeys.add(managerKey);
    }
  });

  return [...statsMap.values()]
    .map((row) => ({
      sourceId: row.sourceId,
      sourceName: row.sourceName,
      salesCount: row.salesCount,
      revenue: row.revenue,
      averageCheck: row.salesCount
        ? Math.round(
            row.revenue / row.salesCount
          )
        : 0,
      managers: [...row.managerKeys]
        .map((key) =>
          resolveManagerDisplayName(key)
        )
        .filter(Boolean)
        .sort((a, b) =>
          a.localeCompare(b, "ru")
        ),
    }))
    .sort(
      (a, b) => b.revenue - a.revenue
    );
}
