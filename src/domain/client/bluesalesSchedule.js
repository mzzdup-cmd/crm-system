import {
  SUBSCRIPTION_CYCLE_DAYS,
} from "./clientDates.js";

const MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const KNOWN_BUDGET_PLANS = {
  6000: {
    tariffLabel: "1тар",
    installments: 3,
    amount: 2000,
  },
  12000: {
    tariffLabel: "1тар",
    installments: 3,
    amount: 4000,
  },
  22000: {
    tariffLabel: "2тар",
    installments: 4,
    amount: 5500,
  },
  28000: {
    tariffLabel: "2тар",
    installments: 4,
    amount: 7000,
  },
};

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

function addDays(date, days) {
  const copy = new Date(date);

  copy.setDate(copy.getDate() + days);

  return copy;
}

function formatRussianDate(date) {
  return `${date.getDate()} ${MONTHS_GENITIVE[date.getMonth()]}`;
}

export function resolveSchedulePlan(budget) {
  const known = KNOWN_BUDGET_PLANS[budget];

  if (known) {
    return known;
  }

  const installments =
    budget <= 12000 ? 3 : 4;

  return {
    tariffLabel:
      installments === 3 ? "1тар" : "2тар",
    installments,
    amount: Math.round(
      budget / installments
    ),
  };
}

export function countCompletedInstallments(
  amountPaid,
  installmentAmount
) {
  if (
    !installmentAmount
    || amountPaid <= 0
  ) {
    return 0;
  }

  return Math.min(
    Math.floor(
      amountPaid / installmentAmount
    ),
    99
  );
}

export function resolveFirstPaymentDate(
  client,
  completedCount
) {
  const fromClient = parseLocalDate(
    client.paymentDate
  );

  if (fromClient) {
    return fromClient;
  }

  const nextDate = parseLocalDate(
    client.nextPaymentDate
  );

  if (!nextDate) {
    return null;
  }

  const steps = Math.max(
    completedCount,
    1
  );

  return addDays(
    nextDate,
    -SUBSCRIPTION_CYCLE_DAYS * steps
  );
}

export function buildBluesalesSchedule(client) {
  const budget = Number(client?.budget || 0);

  if (!budget) {
    return null;
  }

  const plan = resolveSchedulePlan(budget);
  const installmentAmount = plan.amount;
  const completedCount =
    countCompletedInstallments(
      Number(client?.amount || 0),
      installmentAmount
    );

  const firstPaymentDate =
    resolveFirstPaymentDate(
      client,
      completedCount
    );

  if (!firstPaymentDate) {
    return {
      text: "",
      error:
        "Укажите дату первой оплаты в карточке клиента",
    };
  }

  const lines = [
    `${plan.tariffLabel} - ${budget}`,
    "",
  ];

  for (
    let index = 0;
    index < plan.installments;
    index += 1
  ) {
    const paymentDate = addDays(
      firstPaymentDate,
      index * SUBSCRIPTION_CYCLE_DAYS
    );

    const paidMark =
      index < completedCount ? " +" : "";

    lines.push(
      `${index + 1} - ${formatRussianDate(paymentDate)} - ${installmentAmount}${paidMark}`
    );
  }

  return {
    text: lines.join("\n"),
    error: null,
    plan,
    completedCount,
  };
}
