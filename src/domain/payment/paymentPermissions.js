import {
  canAccessPayment,
} from "../auth/permissionHelpers";

import {
  isLeadership,
} from "../auth/roleHelpers";

import {
  canChangePaymentStreamDealType,
  isOptionalStartDateDealType,
  showCuratorStartDateField,
} from "../../constants/dealTypes";

export const MANAGER_PAYMENT_EDIT_WINDOW_MS =
  30 * 60 * 1000;

/** Менеджер может править эти поля без ограничения 30 мин. */
export const MANAGER_UNLIMITED_PAYMENT_UPDATE_KEYS =
  new Set([
    "paymentDate",
    "amount",
    "startDate",
    "invoiceNumber",
    "paymentSystem",
    "tariff",
    "budget",
  ]);

export const MANAGER_UNLIMITED_CLIENT_UPDATE_KEYS =
  new Set(["budget", "tariff", "vkLink"]);

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

/** Only startDate changes for ББ / Апсэйл / Рассылка (no client amount recalc). */
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

  if (isLeadership(userData)) {
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

/** Ключевые поля оплаты — без окна 30 мин для своих оплат. */
export function canEditPaymentCoreFields(
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

  if (isLeadership(userData)) {
    return true;
  }

  if (userData.role !== "manager") {
    return false;
  }

  return canAccessPayment(
    userData,
    payment
  );
}

const PAYMENT_UPDATE_AUDIT_KEYS =
  new Set([
    "updatedAt",
    "updatedByUid",
    "ttRowResyncPending",
    "ttStartDateResyncPending",
    "ttVkResyncPending",
    "ttResyncedAt",
    "ttVkResyncedAt",
  ]);

export function isCoreFieldsOnlyPaymentUpdates(
  updates = {}
) {
  return Object.keys(updates).every(
    (key) =>
      MANAGER_UNLIMITED_PAYMENT_UPDATE_KEYS.has(
        key
      ) || PAYMENT_UPDATE_AUDIT_KEYS.has(key)
  );
}

export function isClientCoreProfileUpdates(
  clientUpdates = {}
) {
  return Object.keys(clientUpdates).every(
    (key) =>
      MANAGER_UNLIMITED_CLIENT_UPDATE_KEYS.has(
        key
      )
  );
}

export function canApplyPaymentUpdates(
  payment,
  userData,
  updates = {}
) {
  if (
    canEditPayment(payment, userData)
  ) {
    return true;
  }

  if (
    canEditPaymentCoreFields(
      payment,
      userData
    ) &&
    isCoreFieldsOnlyPaymentUpdates(updates)
  ) {
    return true;
  }

  if (
    canEditPaymentStartDate(
      payment,
      userData
    ) &&
    updates.startDate !== undefined &&
    Object.keys(updates).every(
      (key) =>
        key === "startDate" ||
        PAYMENT_UPDATE_AUDIT_KEYS.has(key)
    )
  ) {
    return true;
  }

  if (
    canEditCuratorStartDate(
      payment,
      userData
    ) &&
    updates.curatorStartDate !==
      undefined &&
    Object.keys(updates).every(
      (key) =>
        key === "curatorStartDate" ||
        PAYMENT_UPDATE_AUDIT_KEYS.has(key)
    )
  ) {
    return true;
  }

  return false;
}

/** ББ, Апсэйл, Рассылка — дату старта можно менять без ограничения 30 мин. */
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

  if (isLeadership(userData)) {
    return (
      canChangePaymentStreamDealType(
        payment.dealType
      ) ||
      canChangePaymentStreamDealType(
        payment.dealTypeId
      )
    );
  }

  if (
    !canChangePaymentStreamDealType(
      payment.dealType
    ) &&
    !canChangePaymentStreamDealType(
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

/** Бюджет, курс, тариф — для ББ / Апсэйл / Рассылка без окна 30 мин. */
export function canEditDeferredPaymentProfile(
  payment,
  userData
) {
  return (
    canEditPaymentCoreFields(
      payment,
      userData
    ) ||
    canEditPaymentStartDate(
      payment,
      userData
    )
  );
}

export function isDeferredProfileOnlyUpdates(
  paymentUpdates = {},
  clientUpdates = {}
) {
  if (
    Object.keys(paymentUpdates).length > 0
  ) {
    return false;
  }

  const allowedClientKeys = new Set([
    "budget",
    "course",
    "tariff",
    "vkLink",
    "sourceId",
    "sourceName",
  ]);

  return Object.keys(clientUpdates).every(
    (key) => allowedClientKeys.has(key)
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

  if (isLeadership(userData)) {
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

  return isLeadership(userData);
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
