import test from "node:test";
import assert from "node:assert/strict";

import {
  getPaymentRevenueContribution,
  countsAsKpiSale,
} from "../../src/domain/payment/paymentRevenue.js";

test("refund does not affect revenue kpi", () => {
  assert.equal(
    getPaymentRevenueContribution({
      dealType: "Возврат",
      amount: 22000,
    }),
    0
  );
});

test("reject deals do not affect revenue", () => {
  assert.equal(
    getPaymentRevenueContribution({
      dealType: "Отказ Новая",
      amount: 0,
    }),
    0
  );
});

test("regular sale counts toward revenue", () => {
  assert.equal(
    getPaymentRevenueContribution({
      dealType: "Новая",
      amount: 15000,
    }),
    15000
  );
});

test("refunds are excluded from kpi sale count", () => {
  assert.equal(
    countsAsKpiSale({
      dealType: "Возврат",
      amount: 22000,
    }),
    false
  );
});