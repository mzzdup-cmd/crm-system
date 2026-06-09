export function parseMoneyInput(
  value
) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/\s/g, "")
    .replace(/[^\d.-]/g, "");
}

export function parseMoneyNumber(value) {
  const parsed =
    parseMoneyInput(value);

  if (!parsed) {
    return 0;
  }

  const number = Number(parsed);

  return Number.isFinite(number)
    ? number
    : 0;
}

export function formatMoney(
  amount,
  { withCurrency = true } = {}
) {
  const formatted = Number(
    amount || 0
  ).toLocaleString("ru-RU");

  return withCurrency
    ? `${formatted} ₽`
    : formatted;
}

export function formatMoneyInputDisplay(
  value
) {
  const parsed =
    parseMoneyInput(value);

  if (!parsed) {
    return "";
  }

  const number = Number(parsed);

  if (!Number.isFinite(number)) {
    return parsed;
  }

  return number.toLocaleString("ru-RU");
}
