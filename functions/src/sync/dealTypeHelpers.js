const DEFERRED_PROFILE_DEAL_LABELS =
  new Set([
    "ББ",
    "Рассылка",
    "Апсэйл",
    "Апсейл",
    "upsell",
  ]);

function isDeferredProfileDeal(dealType) {
  return DEFERRED_PROFILE_DEAL_LABELS.has(
    String(dealType || "").trim()
  );
}

function isOptionalStartDateDeal(dealType) {
  return isDeferredProfileDeal(dealType);
}

function isRejectDeal(dealType) {
  return String(dealType || "").startsWith(
    "Отказ"
  );
}

function isRefundDeal(dealType) {
  const value = String(dealType || "").trim();

  return (
    value === "Возврат" || value === "refund"
  );
}

/** Колонка E (Сумма) — пустая только для отказов. */
function shouldExportTtAmount(dealType) {
  return !isRejectDeal(dealType);
}

/** Колонка F (Бюджет) — пустая для отказов, доплат и возвратов. */
function shouldExportTtBudget(dealType) {
  return (
    !isRejectDeal(dealType) &&
    !isTopupDeal(dealType) &&
    !isRefundDeal(dealType)
  );
}

function formatTtBudgetCell(dealType, value) {
  const amount = Number(value || 0);

  if (
    isDeferredProfileDeal(dealType) &&
    amount <= 0
  ) {
    return "";
  }

  return amount > 0 ? amount : Number(value || 0);
}

function resolveTtAmount(payment) {
  if (!shouldExportTtAmount(payment?.dealType)) {
    return "";
  }

  const amount = Number(payment?.amount || 0);

  return amount > 0 ? amount : amount;
}

/** Доплаты в ТТ — без суммы бюджета в колонке F. */
function isTopupDeal(dealType) {
  const value = String(dealType || "").trim();

  if (!value) {
    return false;
  }

  if (value.startsWith("Доплата")) {
    return true;
  }

  if (value.startsWith("topup_")) {
    return true;
  }

  return value === "legacy_topup";
}

function canResyncStartDateInTt(dealType) {
  return isOptionalStartDateDeal(dealType);
}

const UPSELL_DEAL_LABELS = new Set([
  "Апсэйл",
  "Апсейл",
  "upsell",
]);

/** Апсэйл (не доплата) — бюджет хранится на payment.budget. */
function isUpsellDeal(dealType) {
  const value = String(dealType || "").trim();

  if (!value || isTopupDeal(value)) {
    return false;
  }

  return UPSELL_DEAL_LABELS.has(value);
}

function resolveTtBudgetAmount({
  payment,
  client = {},
}) {
  const isLegacyClient =
    payment.isLegacyClient === true;
  const isMinimalLegacy =
    payment.isLegacy === true &&
    !isLegacyClient;

  if (
    isMinimalLegacy ||
    !shouldExportTtBudget(payment.dealType)
  ) {
    return "";
  }

  if (isLegacyClient) {
    return formatTtBudgetCell(
      payment.dealType,
      payment.budget ?? 0
    );
  }

  const paymentBudget = Number(
    payment.budget || 0
  );
  const clientBudget = Number(
    client.budget || 0
  );

  // Prefer payment budget for upsell; otherwise take whichever is set
  // so TT does not stay empty when CRM filled only one side.
  let resolvedBudget = 0;

  if (isUpsellDeal(payment.dealType)) {
    resolvedBudget =
      paymentBudget > 0
        ? paymentBudget
        : clientBudget;
  } else {
    resolvedBudget =
      clientBudget > 0
        ? clientBudget
        : paymentBudget;
  }

  return formatTtBudgetCell(
    payment.dealType,
    resolvedBudget
  );
}

function parseTtRowNumber(payment) {
  if (payment?.ttRowNumber) {
    return Number(payment.ttRowNumber);
  }

  const range = String(
    payment?.ttUpdatedRange ||
      payment?.sheetsUpdatedRange ||
      ""
  );

  const match = range.match(
    /!A(\d+)(?::P\d+)?$/i
  );

  if (!match) {
    return null;
  }

  return Number(match[1]);
}

module.exports = {
  isDeferredProfileDeal,
  isOptionalStartDateDeal,
  isRejectDeal,
  isRefundDeal,
  isTopupDeal,
  isUpsellDeal,
  shouldExportTtAmount,
  shouldExportTtBudget,
  resolveTtAmount,
  resolveTtBudgetAmount,
  canResyncStartDateInTt,
  parseTtRowNumber,
};
