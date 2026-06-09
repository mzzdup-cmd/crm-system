export const MANAGER_PAYMENT_EDIT_WINDOW_MS =
  30 * 60 * 1000;

export function isPaymentDeleted(payment) {
  return Boolean(payment?.deletedAt);
}

export function isWithinManagerEditWindow(
  payment,
  now = Date.now()
) {
  const createdAt =
    Number(payment?.createdAt) || 0;

  if (!createdAt) {
    return false;
  }

  return (
    now - createdAt <=
    MANAGER_PAYMENT_EDIT_WINDOW_MS
  );
}

export function canEditPayment(
  payment,
  userData,
  now = Date.now()
) {
  if (!payment || !userData || isPaymentDeleted(payment)) {
    return false;
  }

  if (userData.role === "admin") {
    return true;
  }

  if (userData.role !== "manager") {
    return false;
  }

  const managerId = userData.managerId;

  if (
    !managerId ||
    payment.managerId !== managerId
  ) {
    return false;
  }

  return isWithinManagerEditWindow(
    payment,
    now
  );
}

export function canDeletePayment(
  payment,
  userData
) {
  if (!payment || !userData || isPaymentDeleted(payment)) {
    return false;
  }

  return userData.role === "admin";
}

export function getPaymentEditTimeLeft(
  payment,
  now = Date.now()
) {
  const createdAt =
    Number(payment?.createdAt) || 0;

  if (!createdAt) {
    return 0;
  }

  const elapsed = now - createdAt;

  return Math.max(
    0,
    MANAGER_PAYMENT_EDIT_WINDOW_MS - elapsed
  );
}
