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
  const isRejectDeal = String(
    payment.dealType || ""
  ).startsWith("Отказ");

  if (
    isMinimalLegacy ||
    isRejectDeal ||
    isTopupDeal(payment.dealType)
  ) {
    return "";
  }

  if (isLegacyClient) {
    return formatTtBudgetCell(
      payment.dealType,
      payment.budget ?? 0
    );
  }

  if (isUpsellDeal(payment.dealType)) {
    const paymentBudget =
      payment.budget != null
        ? Number(payment.budget || 0)
        : null;

    if (
      paymentBudget != null &&
      paymentBudget > 0
    ) {
      return paymentBudget;
    }

    return formatTtBudgetCell(
      payment.dealType,
      client.budget || 0
    );
  }

  return formatTtBudgetCell(
    payment.dealType,
    client.budget || 0
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
  isTopupDeal,
  isUpsellDeal,
  resolveTtBudgetAmount,
  canResyncStartDateInTt,
  parseTtRowNumber,
};
