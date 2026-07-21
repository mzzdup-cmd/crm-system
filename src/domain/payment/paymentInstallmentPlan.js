import {
  resolveDealTypeId,
} from "../../constants/dealTypes.js";

import {
  resolveSchedulePlan,
} from "../client/bluesalesSchedule.js";

import {
  clientHasTopupBb,
  getClientPayments,
  isBbBookingClient,
  isBbDealPayment,
  resolveFirstInstallmentRemainder,
  sumBbBookingAmount,
} from "../client/bbBookingLogic.js";

const EXCLUDED_DEAL_TYPES = new Set([
  "reject",
  "refund",
  "reject_new",
  "mailing",
]);

function getInstallmentPaymentAmounts(
  payments = []
) {
  return payments
    .filter((payment) => !payment.deletedAt)
    .filter((payment) => {
      const dealTypeId = resolveDealTypeId(
        payment.dealType ||
          payment.dealTypeId
      );

      return !EXCLUDED_DEAL_TYPES.has(
        dealTypeId
      );
    })
    .map((payment) =>
      Number(payment.amount || 0)
    )
    .filter((amount) => amount > 0);
}

export function inferInstallmentAmount(
  payments = [],
  standardAmount
) {
  const amounts =
    getInstallmentPaymentAmounts(
      payments
    );

  if (!amounts.length) {
    return standardAmount;
  }

  const unique = [
    ...new Set(amounts),
  ];

  if (unique.length === 1) {
    const only = unique[0];

    if (
      only > 0 &&
      only <= standardAmount
    ) {
      return only;
    }
  }

  const lastAmount =
    amounts[amounts.length - 1];

  if (
    lastAmount > 0 &&
    lastAmount < standardAmount
  ) {
    return lastAmount;
  }

  return standardAmount;
}

export function resolveNextInstallmentDue(
  client,
  payments = []
) {
  const budget = Number(
    client?.budget || 0
  );
  const amountPaid = Number(
    client?.amount || 0
  );
  const remain = budget - amountPaid;

  if (remain <= 0 || !budget) {
    return 0;
  }

  const plan =
    resolveSchedulePlan(budget);
  const standardAmount = plan.amount;
  const clientPayments =
    client?.id
      ? getClientPayments(
          client.id,
          payments
        )
      : payments;

  if (
    isBbBookingClient(
      client,
      clientPayments
    ) &&
    !clientHasTopupBb(
      client.id,
      clientPayments
    )
  ) {
    const bookingAmount =
      sumBbBookingAmount(
        client.id,
        clientPayments
      );
    const firstRemainder =
      resolveFirstInstallmentRemainder(
        budget,
        bookingAmount
      );

    return Math.min(
      firstRemainder || remain,
      remain
    );
  }

  const installmentAmount =
    inferInstallmentAmount(
      clientPayments,
      standardAmount
    );
  const paidTowardCurrent =
    installmentAmount > 0
      ? amountPaid % installmentAmount
      : 0;

  if (paidTowardCurrent > 0) {
    return Math.min(
      installmentAmount -
        paidTowardCurrent,
      remain
    );
  }

  return Math.min(
    installmentAmount,
    remain
  );
}

export function buildInstallmentBreakdown({
  budget,
  bookingAmount = 0,
  customInstallmentAmount = null,
}) {
  const plan =
    resolveSchedulePlan(budget);
  const installmentAmount =
    customInstallmentAmount ||
    plan.amount;
  const firstDue = Math.max(
    0,
    installmentAmount -
      Number(bookingAmount || 0)
  );
  const lines = [];

  if (bookingAmount > 0) {
    lines.push({
      label: "Бронь (ББ)",
      amount: Number(bookingAmount),
    });
  }

  if (firstDue > 0) {
    lines.push({
      label:
        bookingAmount > 0
          ? "Доплата по 1-й части"
          : "1-я часть",
      amount: firstDue,
    });
  }

  let left =
    Number(budget || 0) -
    Number(bookingAmount || 0) -
    firstDue;

  let index = 2;

  while (left > 0) {
    const chunk = Math.min(
      installmentAmount,
      left
    );

    lines.push({
      label: `${index}-я часть`,
      amount: chunk,
    });

    left -= chunk;
    index += 1;
  }

  return {
    plan,
    installmentAmount,
    lines,
  };
}

export function resolveSuggestedTopupDealType(
  client,
  payments = []
) {
  if (
    !client?.id ||
    !isBbBookingClient(
      client,
      payments
    ) ||
    clientHasTopupBb(
      client.id,
      payments
    )
  ) {
    return null;
  }

  const hasBbOnly =
    getClientPayments(
      client.id,
      payments
    ).some(isBbDealPayment);

  return hasBbOnly
    ? "topup_bb"
    : null;
}
