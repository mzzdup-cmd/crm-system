const OPTIONAL_START_DATE_LABELS =
  new Set(["ББ", "Рассылка"]);

function isOptionalStartDateDeal(dealType) {
  return OPTIONAL_START_DATE_LABELS.has(
    String(dealType || "").trim()
  );
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
  isOptionalStartDateDeal,
  isTopupDeal,
  canResyncStartDateInTt,
  parseTtRowNumber,
};
