import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveOverdueInstallmentAmount,
} from "../../src/domain/client/clientStatus.js";

test("overdue amount is one installment not total remain", () => {
  const client = {
    id: "c1",
    budget: 22000,
    amount: 5500,
    nextPaymentDate: "2026-07-01",
  };

  assert.equal(
    resolveOverdueInstallmentAmount(client),
    5500
  );
});

test("overdue amount caps at remaining debt", () => {
  const client = {
    id: "c2",
    budget: 22000,
    amount: 20000,
    nextPaymentDate: "2026-07-01",
  };

  assert.equal(
    resolveOverdueInstallmentAmount(client),
    2000
  );
});
