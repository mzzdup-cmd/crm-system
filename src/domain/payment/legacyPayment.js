import {
  isLegacyDealType,
} from "../../constants/dealTypes";

import {
  isPaymentDeleted,
} from "./paymentPermissions";

import {
  getPaymentRevenueContribution,
} from "./paymentRevenue";

export function isLegacyClientPayment(
  payment
) {
  return payment?.isLegacyClient === true;
}

export function isLegacyPayment(
  payment
) {
  if (!payment) {
    return false;
  }

  if (payment.isLegacyClient === true) {
    return true;
  }

  if (payment.isLegacy === true) {
    return true;
  }

  return (
    isLegacyDealType(payment.dealType) ||
    isLegacyDealType(payment.dealTypeId)
  );
}

export function isMinimalLegacyPayment(
  payment
) {
  return (
    isLegacyPayment(payment) &&
    !isLegacyClientPayment(payment)
  );
}

export function sumOperationalRevenue(
  payments = []
) {
  return payments
    .filter(
      (payment) =>
        !isPaymentDeleted(payment)
    )
    .reduce(
      (sum, payment) =>
        sum +
        getPaymentRevenueContribution(
          payment
        ),
      0
    );
}
