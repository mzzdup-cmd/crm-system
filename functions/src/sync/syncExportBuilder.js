const {
  mapPaymentToSyncRow,
} = require("./syncRowMapper");

const {
  SHEETS_SYNC_COLUMNS,
} = require("./syncConstants");

function parsePaymentDate(payment) {
  const raw =
    payment.paymentDate ||
    payment.createdAt;

  if (!raw) {
    return null;
  }

  if (typeof raw === "number") {
    return new Date(raw);
  }

  return new Date(raw);
}

function indexClientsById(clients) {
  return Object.fromEntries(
    clients.map((client) => [
      client.id,
      client,
    ])
  );
}

function buildPaymentCycleMap(payments) {
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

  Object.values(byClient).forEach(
    (clientPayments) => {
      const sorted = [...clientPayments].sort(
        (a, b) =>
          Number(a.createdAt || 0) -
          Number(b.createdAt || 0)
      );

      sorted.forEach((payment, index) => {
        cycleMap[payment.id] = index + 1;
      });
    }
  );

  return cycleMap;
}

function buildSyncExportRows(
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

function buildSyncExportTable(
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

module.exports = {
  indexClientsById,
  buildPaymentCycleMap,
  buildSyncExportRows,
  buildSyncExportTable,
  parsePaymentDate,
};
