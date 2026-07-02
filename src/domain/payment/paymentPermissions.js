import {
  canAccessPayment,
} from "../auth/permissionHelpers";

import {
  isOptionalStartDateDealType,
  showCuratorStartDateField,
} from "../../constants/dealTypes";

export const MANAGER_PAYMENT_EDIT_WINDOW_MS =
  30 * 60 * 1000;

/** Schedule fields on payment do not affect client.amount — skip client recalc. */
export function shouldSkipClientRecalcForPaymentUpdates(
  updates = {}
) {
  if (updates.amount !== undefined) {
    return false;
  }

  return (
    updates.startDate !== undefined ||
    updates.curatorStartDate !== undefined
  );
}

/** Only startDate changes for ББ / Рассылка (no client amount recalc). */
export function isStartDateOnlyPaymentUpdates(
  updates,
  payment
) {
  if (
    !shouldSkipClientRecalcForPaymentUpdates(
      updates
    )
  ) {
    return false;
  }

  const optionalStartDate =
    isOptionalStartDateDealType(
      payment?.dealType
    ) ||
    isOptionalStartDateDealType(
      payment?.dealTypeId
    );

  if (!optionalStartDate) {
    return false;
  }

  return (
    updates.paymentDate === undefined &&
    updates.dealType === undefined &&
    updates.paymentSystem === undefined &&
    updates.invoiceNumber === undefined &&
    updates.course === undefined &&
    updates.tariff === undefined &&
    updates.comment === undefined &&
    updates.curatorStartDate === undefined
  );
}

/** Only curatorStartDate changes (no client amount recalc). */
export function isCuratorStartDateOnlyPaymentUpdates(
  updates
) {
  return (
    updates.curatorStartDate !== undefined &&
    updates.amount === undefined &&
    updates.startDate === undefined &&
    updates.paymentDate === undefined &&
    updates.dealType === undefined &&
    updates.paymentSystem === undefined &&
    updates.invoiceNumber === undefined &&
    updates.course === undefined &&
    updates.tariff === undefined &&
    updates.comment === undefined
  );
}

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

  if (
    !canAccessPayment(
      userData,
      payment
    )
  ) {
    return false;
  }

  return isWithinManagerEditWindow(
    payment,
    now
  );
}

/** ББ / Рассылка — дату старта можно менять без ограничения 30 мин. */
export function canEditPaymentStartDate(
  payment,
  userData
) {
  if (
    !payment ||
    !userData ||
    isPaymentDeleted(payment)
  ) {
    return false;
  }

  if (userData.role === "admin") {
    return true;
  }

  if (
    !isOptionalStartDateDealType(
      payment.dealType
    ) &&
    !isOptionalStartDateDealType(
      payment.dealTypeId
    )
  ) {
    return false;
  }

  return canAccessPayment(
    userData,
    payment
  );
}

/** Фактический старт куратора — без ограничения 30 мин для своих оплат. */
export function canEditCuratorStartDate(
  payment,
  userData
) {
  if (
    !payment ||
    !userData ||
    isPaymentDeleted(payment)
  ) {
    return false;
  }

  if (userData.role === "admin") {
    return true;
  }

  const dealType =
    payment.dealTypeId ||
    payment.dealType;

  if (!showCuratorStartDateField(dealType)) {
    return false;
  }

  return canAccessPayment(
    userData,
    payment
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
