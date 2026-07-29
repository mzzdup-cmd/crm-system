const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseRuDateToIso,
  parseMoneyCell,
  cellsToTtSale,
} = require("./ttRowParser");

test("parseRuDateToIso accepts DD.MM.YYYY", () => {
  assert.equal(
    parseRuDateToIso("24.07.2026"),
    "2026-07-24"
  );
});

test("parseMoneyCell strips currency and spaces", () => {
  assert.equal(
    parseMoneyCell("22 000 ₽"),
    22000
  );
});

test("cellsToTtSale maps TT columns", () => {
  const sale = cellsToTtSale({
    cells: [
      "24.07.2026",
      "Новая",
      "https://bluesales.ru/app/Messenger/?dialogId=123",
      "https://vk.com/id1",
      "5500",
      "22000",
      "21.07.2026",
      "01.07.2026",
      "47014519",
      "Шапка 4",
      "1",
      "Монтаж",
      "Продамус",
      "",
      "Базовый",
      "note",
    ],
    rowNumber: 42,
    managerId: "sergey_grebenshchikov",
    spreadsheetId: "sheet-1",
    sheetName: "TT",
    importedAt: 100,
  });

  assert.equal(
    sale.id,
    "sergey_grebenshchikov_42"
  );
  assert.equal(sale.paymentDate, "2026-07-24");
  assert.equal(sale.dealType, "Новая");
  assert.equal(sale.dialogId, "123");
  assert.equal(sale.amount, 5500);
  assert.equal(sale.budget, 22000);
  assert.equal(sale.invoiceNumber, "47014519");
});

test("cellsToTtSale skips empty rows", () => {
  assert.equal(
    cellsToTtSale({
      cells: [],
      rowNumber: 2,
      managerId: "katya_bakaeva",
      spreadsheetId: "sheet-1",
      sheetName: "TT",
      importedAt: 100,
    }),
    null
  );
});
