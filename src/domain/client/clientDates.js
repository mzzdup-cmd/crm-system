import {
  isBbDealType,
  isOptionalStartDateDealType,
} from "../../constants/dealTypes.js";

const SUBSCRIPTION_CYCLE_DAYS = 14;

/**
 * Returns Monday of the payment week (stream start).
 * Example: payment 06.06.2026 (Sat) → 01.06.2026 (Mon)
 */
export function getStartDate(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + diff);

  return date.toISOString().split("T")[0];
}

/**
 * Next subscription payment date (+14 days from payment date).
 */
export function getNextPaymentDate(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);

  date.setDate(
    date.getDate() + SUBSCRIPTION_CYCLE_DAYS
  );

  return date.toISOString().split("T")[0];
}

export function resolveNextPaymentDate({
  amount,
  budget,
  paymentDate,
}) {
  const paid = Number(amount || 0);
  const total = Number(budget || 0);

  if (paid >= total || !paymentDate) {
    return null;
  }

  return getNextPaymentDate(paymentDate);
}

/**
 * Weekly stream options (Mondays) around the payment week.
 */
export function generateStreamOptions(
  paymentDate,
  weeksBefore = 4,
  weeksAfter = 8
) {
  if (!paymentDate) {
    return [];
  }

  const anchor =
    getStartDate(paymentDate);

  if (!anchor) {
    return [];
  }

  const base = new Date(anchor);
  const options = [];

  for (
    let offset = -weeksBefore;
    offset <= weeksAfter;
    offset += 1
  ) {
    const date = new Date(base);
    date.setDate(
      date.getDate() + offset * 7
    );

    options.push(
      date.toISOString().split("T")[0]
    );
  }

  return options;
}

export function getDefaultStream(
  paymentDate
) {
  return getStartDate(paymentDate);
}

/** Older cohorts (table clients, return after refusal) may start months before payment. */
export function resolveStreamOptionWeeks({
  dealTypeId,
  isLegacyClientMode = false,
} = {}) {
  if (
    isLegacyClientMode ||
    dealTypeId === "topup_po"
  ) {
    return {
      weeksBefore: 16,
      weeksAfter: 8,
    };
  }

  return {
    weeksBefore: 4,
    weeksAfter: 8,
  };
}

/**
 * Resolves client/payment startDate (stream Monday).
 * BB: manual date. Others: selected stream Monday.
 */
export function resolvePaymentStartDate({
  dealTypeId,
  paymentDate,
  selectedStream,
  manualStartDate,
}) {
  if (isBbDealType(dealTypeId)) {
    return manualStartDate || "";
  }

  if (
    isOptionalStartDateDealType(
      dealTypeId
    )
  ) {
    return selectedStream || "";
  }

  return (
    selectedStream ||
    getDefaultStream(paymentDate) ||
    ""
  );
}

/** Поток клиента: карточка → первая оплата с startDate. */
export function resolveClientStreamStartDate(
  client,
  payments = []
) {
  const fromClient =
    client?.startDate?.trim();

  if (fromClient) {
    return fromClient;
  }

  const withStream = payments
    .filter(
      (payment) =>
        !payment?.deletedAt &&
        payment?.startDate?.trim()
    )
    .sort((left, right) =>
      String(
        left.paymentDate || ""
      ).localeCompare(
        String(right.paymentDate || "")
      )
    );

  return (
    withStream[0]?.startDate?.trim() ||
    ""
  );
}

export { SUBSCRIPTION_CYCLE_DAYS };
