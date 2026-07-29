const {
  TT_SHEET_COLUMNS,
} = require("./ttConstants");

function parseRuDateToIso(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const match = text.match(
    /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/
  );

  if (!match) {
    return "";
  }

  const day = String(match[1]).padStart(2, "0");
  const month = String(match[2]).padStart(2, "0");
  const year = match[3];

  return `${year}-${month}-${day}`;
}

function parseMoneyCell(value) {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const cleaned = String(value)
    .replace(/\s/g, "")
    .replace(/₽/g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.-]/g, "");

  if (!cleaned) {
    return 0;
  }

  const amount = Number(cleaned);

  return Number.isFinite(amount) ? amount : 0;
}

function extractDialogId(link) {
  const match = String(link || "").match(
    /dialogId=(\d+)/i
  );

  return match?.[1] || "";
}

function cellsToTtSale({
  cells,
  rowNumber,
  managerId,
  spreadsheetId,
  sheetName,
  importedAt,
}) {
  const padded = Array.from(
    { length: 16 },
    (_, index) => cells?.[index] ?? ""
  );

  const paymentDateRaw = padded[0];
  const dealType = String(padded[1] || "").trim();
  const dialogLink = String(padded[2] || "").trim();
  const vkLink = String(padded[3] || "").trim();
  const amount = parseMoneyCell(padded[4]);
  const budget = parseMoneyCell(padded[5]);
  const startDateRaw = padded[6];
  const firstContactRaw = padded[7];
  const invoiceNumber = String(
    padded[8] || ""
  ).trim();
  const sourceName = String(padded[9] || "").trim();
  const cycle = Number(padded[10] || 1) || 1;
  const course = String(padded[11] || "").trim();
  const paymentSystem = String(
    padded[12] || ""
  ).trim();
  const email = String(padded[13] || "").trim();
  const tariff = String(padded[14] || "").trim();
  const notes = String(padded[15] || "").trim();

  const paymentDate =
    parseRuDateToIso(paymentDateRaw);
  const startDate =
    parseRuDateToIso(startDateRaw);
  const firstContact =
    parseRuDateToIso(firstContactRaw);

  const emptyRow =
    !paymentDate &&
    !dealType &&
    !dialogLink &&
    !vkLink &&
    amount === 0 &&
    !invoiceNumber;

  if (emptyRow) {
    return null;
  }

  return {
    id: `${managerId}_${rowNumber}`,
    managerId,
    spreadsheetId,
    sheetName,
    sourceRow: rowNumber,
    paymentDate,
    paymentDateRaw: String(
      paymentDateRaw || ""
    ).trim(),
    dealType,
    dialogLink,
    dialogId: extractDialogId(dialogLink),
    vkLink,
    amount,
    budget,
    startDate,
    firstContact,
    invoiceNumber,
    sourceName,
    cycle,
    course,
    paymentSystem,
    email,
    tariff,
    notes,
    importedAt,
    columns: TT_SHEET_COLUMNS,
  };
}

function mskYmdParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Europe/Moscow",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(date);

  const get = (type) =>
    parts.find((part) => part.type === type)
      ?.value;

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
  };
}

function getCurrentMonthRangeIsoMsk(
  now = new Date()
) {
  const { year, month } = mskYmdParts(now);
  const start =
    `${year}-${String(month).padStart(2, "0")}-01`;
  const next = new Date(year, month, 1);
  const endExclusive =
    `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;

  return {
    start,
    endExclusive,
  };
}

function isPaymentDateInCurrentMonth(
  paymentDate,
  now = new Date()
) {
  if (!paymentDate) {
    return false;
  }

  const { start, endExclusive } =
    getCurrentMonthRangeIsoMsk(now);

  return (
    paymentDate >= start &&
    paymentDate < endExclusive
  );
}

module.exports = {
  parseRuDateToIso,
  parseMoneyCell,
  extractDialogId,
  cellsToTtSale,
  getCurrentMonthRangeIsoMsk,
  isPaymentDateInCurrentMonth,
};
