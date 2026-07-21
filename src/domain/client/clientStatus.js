import {
  getClientPayments,
  resolveBbBookingOverdueState,
} from "./bbBookingLogic.js";

import {
  resolveNextInstallmentDue,
} from "../payment/paymentInstallmentPlan.js";

export const CLIENT_STATUSES = {
  PAID: "paid",
  SUBSCRIPTION: "subscription",
  OVERDUE: "overdue",
};

export function getRemain(client) {
  return (
    Number(client?.budget || 0) -
    Number(client?.amount || 0)
  );
}

export function hasDebt(client) {
  return getRemain(client) > 0;
}

/** One overdue installment (not total remain), capped by debt left. */
export function resolveOverdueInstallmentAmount(
  client,
  paymentsOrMap = null
) {
  const remain = getRemain(client);

  if (remain <= 0) {
    return 0;
  }

  const clientPayments =
    resolveClientPayments(
      client,
      paymentsOrMap
    ) || [];

  return resolveNextInstallmentDue(
    client,
    clientPayments
  );
}

export function indexPaymentsByClientId(
  payments = []
) {
  const map = new Map();

  payments.forEach((payment) => {
    if (
      payment.deletedAt ||
      !payment.clientId
    ) {
      return;
    }

    if (!map.has(payment.clientId)) {
      map.set(payment.clientId, []);
    }

    map.get(payment.clientId).push(
      payment
    );
  });

  return map;
}

function resolveClientPayments(
  client,
  paymentsOrMap = null
) {
  if (!paymentsOrMap) {
    return null;
  }

  if (paymentsOrMap instanceof Map) {
    return (
      paymentsOrMap.get(client.id) ||
      null
    );
  }

  if (Array.isArray(paymentsOrMap)) {
    return getClientPayments(
      client.id,
      paymentsOrMap
    );
  }

  return null;
}

export function resolveOverdueDeadline(
  client,
  today = new Date(),
  paymentsOrMap = null
) {
  if (!hasDebt(client)) {
    return null;
  }

  const clientPayments =
    resolveClientPayments(
      client,
      paymentsOrMap
    );
  const bbState =
    resolveBbBookingOverdueState(
      client,
      clientPayments || [],
      today
    );

  if (bbState?.kind === "waiting") {
    return null;
  }

  if (bbState?.deadline) {
    return bbState.deadline;
  }

  return client?.nextPaymentDate || null;
}

export function isOverdue(
  client,
  today = new Date(),
  paymentsOrMap = null
) {
  const deadline = resolveOverdueDeadline(
    client,
    today,
    paymentsOrMap
  );

  if (!deadline) {
    return false;
  }

  return today > new Date(deadline);
}

export function getClientStatus(
  client,
  today = new Date(),
  paymentsOrMap = null
) {
  if (
    isOverdue(
      client,
      today,
      paymentsOrMap
    )
  ) {
    return CLIENT_STATUSES.OVERDUE;
  }

  if (hasDebt(client)) {
    return CLIENT_STATUSES.SUBSCRIPTION;
  }

  return CLIENT_STATUSES.PAID;
}

export function getDaysUntilPayment(
  dateString,
  today = new Date()
) {
  if (!dateString) {
    return null;
  }

  const paymentDate = new Date(dateString);
  const diff = paymentDate - today;

  return Math.ceil(
    diff / (1000 * 60 * 60 * 24)
  );
}

export function matchesStatusFilter(
  client,
  statusFilter,
  today = new Date(),
  paymentsOrMap = null
) {
  if (!statusFilter) {
    return true;
  }

  return (
    getClientStatus(
      client,
      today,
      paymentsOrMap
    ) === statusFilter
  );
}
