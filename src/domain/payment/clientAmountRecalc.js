import {
  resolveNextPaymentDate,
} from "../client/clientDates";

import {
  buildSubscriptionOutcomeUpdate,
} from "../client/subscriptionOutcome";

import {
  isPaymentDeleted,
} from "./paymentPermissions";

import {
  isLegacyPayment,
} from "./legacyPayment";

export function sumActivePaymentAmounts(
  payments
) {
  return payments
    .filter(
      (payment) =>
        !isPaymentDeleted(payment) &&
        !isLegacyPayment(payment)
    )
    .reduce(
      (sum, payment) =>
        sum +
        Number(payment.amount || 0),
      0
    );
}

export function getLatestActivePayment(
  payments
) {
  const active = payments.filter(
    (payment) =>
      !isPaymentDeleted(payment) &&
      !isLegacyPayment(payment)
  );

  if (!active.length) {
    return null;
  }

  return [...active].sort(
    (a, b) => {
      const dateA =
        new Date(
          a.paymentDate || a.createdAt || 0
        ).getTime();
      const dateB =
        new Date(
          b.paymentDate || b.createdAt || 0
        ).getTime();

      return dateB - dateA;
    }
  )[0];
}

export function buildClientAmountUpdate(
  client,
  payments
) {
  const totalAmount =
    sumActivePaymentAmounts(payments);

  const latestPayment =
    getLatestActivePayment(payments);

  const nextPaymentDate =
    resolveNextPaymentDate({
      amount: totalAmount,
      budget: client.budget,
      paymentDate:
        latestPayment?.paymentDate ||
        latestPayment?.createdAt,
    });

  return {
    amount: totalAmount,
    nextPaymentDate,
    ...buildSubscriptionOutcomeUpdate(
      client,
      totalAmount
    ),
  };
}
