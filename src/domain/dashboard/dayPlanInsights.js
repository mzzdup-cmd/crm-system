import {
  getRemain,
  hasDebt,
  isOverdue,
  indexPaymentsByClientId,
} from "../client/clientStatus";

import {
  isBbBookingClient,
  getMonthLabelFromDateStr,
  buildBbBookingItems,
  resolveBbTopupRemainder,
} from "../client/bbBookingLogic";

import {
  getTodayDateString,
} from "../schedule/scheduleLogic";

import {
  canAccessPayment,
} from "../auth/permissionHelpers";

import {
  isPaymentDeleted,
} from "../payment/paymentPermissions";

function getMonthKey(dateStr) {
  return dateStr?.slice(0, 7) || "";
}

function buildLatestStreamStartByClientId(
  payments = []
) {
  const map = {};

  payments.forEach((payment) => {
    if (
      payment.deletedAt ||
      !payment.clientId ||
      !payment.startDate?.trim()
    ) {
      return;
    }

    const existing =
      map[payment.clientId];

    if (
      !existing ||
      Number(payment.createdAt || 0) >
        Number(existing.createdAt || 0)
    ) {
      map[payment.clientId] = payment;
    }
  });

  return map;
}

function resolveTopupPlanMonthKey(
  client,
  latestPaymentByClientId,
  todayStr,
  paymentsByClientId = null
) {
  if (!hasDebt(client)) {
    return null;
  }

  const currentMonth =
    getMonthKey(todayStr);

  if (
    isOverdue(
      client,
      new Date(`${todayStr}T12:00:00`),
      paymentsByClientId
    )
  ) {
    return currentMonth;
  }

  const latestPayment =
    latestPaymentByClientId[
      client.id
    ];
  const streamStart =
    latestPayment?.startDate || "";
  const nextPay =
    client.nextPaymentDate || "";

  if (
    streamStart &&
    getMonthKey(streamStart) > currentMonth
  ) {
    return getMonthKey(streamStart);
  }

  if (nextPay) {
    return getMonthKey(nextPay);
  }

  return null;
}

function isSubscriptionDebtClient(
  client,
  payments
) {
  return (
    hasDebt(client) &&
    !isBbBookingClient(
      client,
      payments
    )
  );
}

export function getCuratorStartsTodayItems({
  payments = [],
  clients = [],
  today,
  userData = null,
}) {
  if (!today) {
    return [];
  }

  const clientsById = Object.fromEntries(
    clients.map((client) => [
      client.id,
      client,
    ])
  );

  return payments
    .filter(
      (payment) =>
        !payment.deletedAt &&
        !payment.curatorStartHandoffDoneAt &&
        payment.curatorStartDate === today &&
        (
          !userData ||
          canAccessPayment(
            userData,
            payment
          )
        )
    )
    .map((payment) => {
      const client =
        clientsById[payment.clientId] ||
        null;

      return {
        id: payment.id,
        clientId: payment.clientId,
        clientName:
          payment.clientName ||
          payment.legacyClientName ||
          client?.name ||
          "Клиент",
        dealType: payment.dealType || "",
        course:
          payment.course ||
          client?.course ||
          "",
        curatorStartDate:
          payment.curatorStartDate,
        dialogLink:
          payment.dialogLink ||
          client?.dialogLink ||
          "",
        vkLink:
          payment.vkLink ||
          client?.vkLink ||
          "",
        manager:
          payment.manager ||
          client?.manager ||
          "",
      };
    })
    .sort((left, right) =>
      left.clientName.localeCompare(
        right.clientName,
        "ru"
      )
    );
}

/** @deprecated use getCuratorStartsTodayItems */
export function getStartsTodayItems(
  params
) {
  return getCuratorStartsTodayItems(
    params
  );
}

export function getPlannedTopupsSummary(
  clients = [],
  payments = [],
  todayStr = getTodayDateString()
) {
  const currentMonth =
    getMonthKey(todayStr);
  const latestByClient =
    buildLatestStreamStartByClientId(
      payments
    );
  const paymentsByClientId =
    indexPaymentsByClientId(payments);

  const subscriptionClients =
    clients.filter((client) =>
      isSubscriptionDebtClient(
        client,
        payments
      )
    );

  const monthClients =
    subscriptionClients.filter(
      (client) => {
        const planMonth =
          resolveTopupPlanMonthKey(
            client,
            latestByClient,
            todayStr,
            paymentsByClientId
          );

        return planMonth === currentMonth;
      }
    );

  const monthRemain = monthClients.reduce(
    (sum, client) =>
      sum + getRemain(client),
    0
  );

  const totalRemain =
    subscriptionClients.reduce(
      (sum, client) =>
        sum + getRemain(client),
      0
    );

  const bbItems = buildBbBookingItems(
    clients,
    payments
  );

  const bbTotalRemain = bbItems.reduce(
    (sum, item) =>
      sum +
      resolveBbTopupRemainder(
        item.budget,
        item.bookingAmount
      ),
    0
  );

  const bbMonthRemain = bbItems.reduce(
    (sum, item) => {
      const planMonth = getMonthKey(
        item.plannedStartDate ||
          item.paymentDate ||
          ""
      );

      if (planMonth !== currentMonth) {
        return sum;
      }

      return (
        sum +
        resolveBbTopupRemainder(
          item.budget,
          item.bookingAmount
        )
      );
    },
    0
  );

  return {
    monthKey: currentMonth,
    monthLabel:
      getMonthLabelFromDateStr(todayStr),
    monthClientsCount:
      monthClients.length,
    monthRemain: monthRemain + bbMonthRemain,
    totalClientsCount:
      subscriptionClients.length,
    totalRemain: totalRemain + bbTotalRemain,
    bookingsCount: bbItems.length,
    bbTotalRemain,
    bbMonthRemain,
  };
}

export function countTodayPaymentsForUser({
  payments = [],
  today,
  userData = null,
  isLeadership = false,
  canAccessPayment: canAccessPaymentFn = null,
}) {
  if (!today) {
    return 0;
  }

  const canAccess =
    canAccessPaymentFn ||
    ((payment) =>
      canAccessPayment(
        userData,
        payment
      ));

  return payments.filter(
    (payment) =>
      !isPaymentDeleted(payment) &&
      payment.paymentDate === today &&
      (
        isLeadership ||
        canAccess(payment)
      )
  ).length;
}
