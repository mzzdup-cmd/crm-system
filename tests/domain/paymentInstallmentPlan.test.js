import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveNextInstallmentDue,
  inferInstallmentAmount,
} from "../../src/domain/payment/paymentInstallmentPlan.js";

import {
  resolveOverdueInstallmentAmount,
} from "../../src/domain/client/clientStatus.js";

test("custom weekly 2750 on 22000 budget shows 2750 overdue not 5500", () => {
  const client = {
    id: "c1",
    budget: 22000,
    amount: 2750,
    nextPaymentDate: "2026-07-20",
  };

  const payments = [
    {
      clientId: "c1",
      dealType: "Новая",
      amount: 2750,
    },
  ];

  assert.equal(
    inferInstallmentAmount(
      payments,
      5500
    ),
    2750
  );

  assert.equal(
    resolveNextInstallmentDue(
      client,
      payments
    ),
    2750
  );

  assert.equal(
    resolveOverdueInstallmentAmount(
      client,
      payments
    ),
    2750
  );
});

test("BB 2000 on 22000 budget suggests 3500 first topup", () => {
  const client = {
    id: "c2",
    budget: 22000,
    amount: 2000,
    subscriptionStage: "bb_booking",
  };

  const payments = [
    {
      clientId: "c2",
      dealType: "ББ",
      dealTypeId: "bb",
      amount: 2000,
    },
  ];

  assert.equal(
    resolveNextInstallmentDue(
      client,
      payments
    ),
    3500
  );
});
