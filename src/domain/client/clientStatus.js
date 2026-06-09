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

export function isOverdue(client, today = new Date()) {
  if (!client?.nextPaymentDate || !hasDebt(client)) {
    return false;
  }

  return today > new Date(client.nextPaymentDate);
}

export function getClientStatus(client, today = new Date()) {
  if (isOverdue(client, today)) {
    return CLIENT_STATUSES.OVERDUE;
  }

  if (hasDebt(client)) {
    return CLIENT_STATUSES.SUBSCRIPTION;
  }

  return CLIENT_STATUSES.PAID;
}

export function getDaysUntilPayment(dateString, today = new Date()) {
  if (!dateString) {
    return null;
  }

  const paymentDate = new Date(dateString);
  const diff = paymentDate - today;

  return Math.ceil(
    diff / (1000 * 60 * 60 * 24)
  );
}

export function matchesStatusFilter(client, statusFilter, today = new Date()) {
  if (!statusFilter) {
    return true;
  }

  return getClientStatus(client, today) === statusFilter;
}
