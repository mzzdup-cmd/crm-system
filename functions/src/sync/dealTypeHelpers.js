const OPTIONAL_START_DATE_LABELS =
  new Set(["ББ", "Рассылка"]);

function isOptionalStartDateDeal(dealType) {
  return OPTIONAL_START_DATE_LABELS.has(
    String(dealType || "").trim()
  );
}

function canResyncStartDateInTt(dealType) {
  return isOptionalStartDateDeal(dealType);
}

function parseTtRowNumber(payment) {
  if (payment?.ttRowNumber) {
    return Number(payment.ttRowNumber);
  }

  const range = String(
    payment?.ttUpdatedRange || ""
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
  canResyncStartDateInTt,
  parseTtRowNumber,
};
