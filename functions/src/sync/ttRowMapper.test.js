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

test("reject rows keep start date but omit amount and budget", () => {
  const row = mapPaymentToTtRow({
    payment: {
      ...basePayment,
      dealType: "Отказ Новая",
      amount: 0,
      startDate: "2026-06-29",
    },
    client: clientWithBudget,
    cycle: 2,
  });

  assert.equal(row[4], "");
  assert.equal(row[5], "");
  assert.equal(row[6], "29.06.2026");
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
