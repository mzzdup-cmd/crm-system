const test = require("node:test");
const assert = require("node:assert/strict");

const {
  mapPaymentToTtRow,
} = require("./ttRowMapper");

const basePayment = {
  paymentDate: "2026-07-01",
  amount: 5500,
  invoiceNumber: "12345678",
  paymentSystem: "Робокасса",
};

const clientWithBudget = {
  budget: 22000,
  course: "Экстерн Монтаж",
  tariff: "Базовый",
};

test("topup rows omit budget column in TT export", () => {
  const row = mapPaymentToTtRow({
    payment: {
      ...basePayment,
      dealType: "Доплата Новая",
    },
    client: clientWithBudget,
    cycle: 2,
  });

  assert.equal(row[4], 5500);
  assert.equal(row[5], "");
});

test("new deal rows keep client budget in TT export", () => {
  const row = mapPaymentToTtRow({
    payment: {
      ...basePayment,
      dealType: "Новая",
      amount: 6000,
    },
    client: clientWithBudget,
    cycle: 1,
  });

  assert.equal(row[4], 6000);
  assert.equal(row[5], 22000);
});
