import {
  resolveDealTypeId,
} from "../../constants/dealTypes";

import {
  resolveSchedulePlan,
} from "./bluesalesSchedule";

const MONTHS_NOMINATIVE = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
];

export const BB_BOOKING_STAGE = "bb_booking";

function parseLocalDate(raw) {
  if (!raw) {
    return null;
  }

  if (
    typeof raw === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(raw)
  ) {
    const [year, month, day] =
      raw.split("-").map(Number);

    return new Date(year, month - 1, day);
  }

  const date = new Date(raw);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

export function formatBookingDate(
  dateStr
) {
  const date = parseLocalDate(dateStr);

  if (!date) {
    return dateStr || "—";
  }

  const day = String(date.getDate()).padStart(
    2,
    "0"
  );
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
}

export function getMonthLabelFromDateStr(
  dateStr
) {
  const date = parseLocalDate(dateStr);

  if (!date) {
    return "";
  }

  return MONTHS_NOMINATIVE[date.getMonth()];
}

export function isBbDealPayment(payment) {
  return (
    resolveDealTypeId(payment?.dealType) ===
    "bb"
  );
}

export function isTopupBbPayment(payment) {
  return (
    resolveDealTypeId(payment?.dealType) ===
    "topup_bb"
  );
}

export function getClientPayments(
  clientId,
  payments = []
) {
  if (!clientId) {
    return [];
  }

  return payments.filter(
    (payment) =>
      !payment.deletedAt &&
      payment.clientId === clientId
  );
}

export function getBbPaymentsForClient(
  clientId,
  payments = []
) {
  return getClientPayments(
    clientId,
    payments
  ).filter(isBbDealPayment);
}

export function sumBbBookingAmount(
  clientId,
  payments = []
) {
  return getBbPaymentsForClient(
    clientId,
    payments
  ).reduce(
    (sum, payment) =>
      sum + Number(payment.amount || 0),
    0
  );
}

export function clientHasTopupBb(
  clientId,
  payments = []
) {
  return getClientPayments(
    clientId,
    payments
  ).some(isTopupBbPayment);
}

export function isBbBookingClient(
  client,
  payments = []
) {
  if (!client?.id) {
    return false;
  }

  if (
    client.subscriptionStage ===
    BB_BOOKING_STAGE
  ) {
    return true;
  }

  if (
    client.subscriptionStage === "active" ||
    client.subscriptionStage === "converted"
  ) {
    return false;
  }

  if (
    clientHasTopupBb(
      client.id,
      payments
    )
  ) {
    return false;
  }

  return (
    getBbPaymentsForClient(
      client.id,
      payments
    ).length > 0
  );
}

export function resolvePlannedStartDate(
  payment,
  client = null
) {
  return (
    payment?.curatorStartDate?.trim() ||
    payment?.startDate?.trim() ||
    client?.startDate?.trim() ||
    ""
  );
}

export function resolveBbTopupRemainder(
  budget,
  bookingAmount
) {
  return Math.max(
    0,
    Number(budget || 0) -
      Number(bookingAmount || 0)
  );
}

export function resolveFirstInstallmentRemainder(
  budget,
  bookingAmount
) {
  const plan = resolveSchedulePlan(
    Number(budget || 0)
  );
  const firstInstallment = plan.amount;
  const paid = Number(bookingAmount || 0);

  return Math.max(
    0,
    firstInstallment - paid
  );
}

export function buildBbBookingCopyText({
  paymentDate,
  bookingAmount,
  plannedStartDate,
  budget,
}) {
  const remainder =
    resolveFirstInstallmentRemainder(
      budget,
      bookingAmount
    );

  return [
    `ББ - ${formatBookingDate(paymentDate)} - ${Number(bookingAmount || 0).toLocaleString("ru-RU")} ₽`,
    `планируемый старт - ${formatBookingDate(plannedStartDate)}`,
    `остаток по первой части ББ - ${remainder.toLocaleString("ru-RU")} ₽`,
  ].join("\n");
}

function pickLatestPayment(
  payments = []
) {
  return [...payments].sort(
    (left, right) =>
      Number(right.createdAt || 0) -
      Number(left.createdAt || 0)
  )[0];
}

export function buildBbBookingItemFromClient(
  client,
  payments = []
) {
  const bbPayments = getBbPaymentsForClient(
    client.id,
    payments
  );

  if (!bbPayments.length) {
    return null;
  }

  const latestBb = pickLatestPayment(
    bbPayments
  );
  const bookingAmount = sumBbBookingAmount(
    client.id,
    payments
  );

  return {
    id: client.id,
    clientId: client.id,
    clientName:
      client.name ||
      latestBb.clientName ||
      "Клиент",
    course:
      client.course ||
      latestBb.course ||
      "",
    manager:
      client.manager ||
      latestBb.manager ||
      "",
    budget: Number(
      client.budget ||
        latestBb.budget ||
        0
    ),
    bookingAmount,
    paymentDate:
      latestBb.paymentDate || "",
    plannedStartDate:
      resolvePlannedStartDate(
        latestBb,
        client
      ),
    dialogLink:
      client.dialogLink ||
      latestBb.dialogLink ||
      "",
    vkLink:
      client.vkLink ||
      latestBb.vkLink ||
      "",
    copyText: buildBbBookingCopyText({
      paymentDate:
        latestBb.paymentDate,
      bookingAmount,
      plannedStartDate:
        resolvePlannedStartDate(
          latestBb,
          client
        ),
      budget: Number(
        client.budget ||
          latestBb.budget ||
          0
      ),
    }),
  };
}

export function buildBbBookingItemFromPayment(
  payment
) {
  if (
    !payment?.id ||
    payment.deletedAt ||
    !isBbDealPayment(payment)
  ) {
    return null;
  }

  const budget = Number(
    payment.budget || 0
  );
  const bookingAmount = Number(
    payment.amount || 0
  );

  return {
    id: payment.id,
    clientId: null,
    clientName:
      payment.clientName ||
      payment.legacyClientName ||
      "Клиент",
    course: payment.course || "",
    manager: payment.manager || "",
    budget,
    bookingAmount,
    paymentDate:
      payment.paymentDate || "",
    plannedStartDate:
      resolvePlannedStartDate(payment),
    dialogLink:
      payment.dialogLink || "",
    vkLink: payment.vkLink || "",
    copyText: buildBbBookingCopyText({
      paymentDate:
        payment.paymentDate,
      bookingAmount,
      plannedStartDate:
        resolvePlannedStartDate(
          payment
        ),
      budget,
    }),
  };
}

export function buildBbBookingItems(
  clients = [],
  payments = []
) {
  const items = [];

  clients.forEach((client) => {
    if (
      !isBbBookingClient(
        client,
        payments
      )
    ) {
      return;
    }

    const item =
      buildBbBookingItemFromClient(
        client,
        payments
      );

    if (item) {
      items.push(item);
    }
  });

  payments.forEach((payment) => {
    if (
      payment.clientId ||
      payment.deletedAt ||
      !isBbDealPayment(payment)
    ) {
      return;
    }

    const item =
      buildBbBookingItemFromPayment(
        payment
      );

    if (item) {
      items.push(item);
    }
  });

  return items.sort((left, right) => {
    const leftDate =
      left.plannedStartDate ||
      left.paymentDate ||
      "";
    const rightDate =
      right.plannedStartDate ||
      right.paymentDate ||
      "";

    return rightDate.localeCompare(
      leftDate
    );
  });
}
