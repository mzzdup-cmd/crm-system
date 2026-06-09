import {
  mapPaymentToSyncRow,
} from "../sheets/syncRowMapper";

import {
  parsePaymentDate,
} from "../analytics/periodFilters";

import { SHEETS_SYNC_COLUMNS } from "../../constants/schedule";

export function indexClientsById(clients) {
  return Object.fromEntries(
    clients.map((client) => [
      client.id,
      client,
    ])
  );
}

export function buildPaymentCycleMap(payments) {
  const byClient = {};

  payments.forEach((payment) => {
    if (!payment.clientId) {
      return;
    }

    if (!byClient[payment.clientId]) {
      byClient[payment.clientId] = [];
    }

    byClient[payment.clientId].push(payment);
  });

  const cycleMap = {};

  Object.entries(byClient).forEach(
    ([, clientPayments]) => {
      const sorted = [...clientPayments].sort(
        (a, b) =>
          (a.createdAt || 0) -
          (b.createdAt || 0)
      );

      sorted.forEach((payment, index) => {
        cycleMap[payment.id] = index + 1;
      });
    }
  );

  return cycleMap;
}

export function buildSyncExportRows(
  payments,
  clientsById
) {
  const cycleMap =
    buildPaymentCycleMap(payments);

  const sorted = [...payments].sort(
    (a, b) => {
      const dateA =
        parsePaymentDate(a)?.getTime() || 0;
      const dateB =
        parsePaymentDate(b)?.getTime() || 0;

      return dateA - dateB;
    }
  );

  return sorted.map((payment) => {
    const client =
      clientsById[payment.clientId] || {};

    const cycle =
      cycleMap[payment.id] || 1;

    return mapPaymentToSyncRow({
      payment,
      client,
      cycle,
    });
  });
}

export function buildSyncExportTable(
  payments,
  clientsById
) {
  return {
    headers: [...SHEETS_SYNC_COLUMNS],
    rows: buildSyncExportRows(
      payments,
      clientsById
    ),
  };
}
