import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveBbBookingOverdueState,
  BB_BOOKING_STAGE,
} from "../../src/domain/client/bbBookingLogic.js";

import {
  isOverdue,
  resolveOverdueDeadline,
  indexPaymentsByClientId,
} from "../../src/domain/client/clientStatus.js";

const clientBase = {
  id: "client-1",
  name: "Test BB",
  budget: 40000,
  amount: 20000,
  subscriptionStage: BB_BOOKING_STAGE,
};

const bbPayment = {
  id: "pay-1",
  clientId: "client-1",
  dealType: "bb",
  amount: 20000,
  budget: 40000,
  paymentDate: "2026-06-01",
  startDate: "2026-08-01",
  createdAt: 1,
};

test("BB booking with future start is not overdue", () => {
  const today = new Date("2026-07-19T12:00:00");
  const payments = [bbPayment];
  const client = {
    ...clientBase,
    startDate: "2026-08-01",
    nextPaymentDate: "2026-06-15",
  };
  const map = indexPaymentsByClientId(payments);

  assert.equal(
    resolveBbBookingOverdueState(
      client,
      payments,
      today
    )?.kind,
    "waiting"
  );
  assert.equal(
    isOverdue(client, today, map),
    false
  );
  assert.equal(
    resolveOverdueDeadline(
      client,
      today,
      map
    ),
    null
  );
});

test("BB booking becomes overdue after start + 14 days", () => {
  const today = new Date("2026-08-20T12:00:00");
  const payments = [bbPayment];
  const client = {
    ...clientBase,
    startDate: "2026-08-01",
    nextPaymentDate: "2026-06-15",
  };
  const map = indexPaymentsByClientId(payments);

  assert.equal(
    isOverdue(client, today, map),
    true
  );
  assert.equal(
    resolveOverdueDeadline(
      client,
      today,
      map
    ),
    "2026-08-15"
  );
});

test("BB booking is not overdue between start and deadline", () => {
  const today = new Date("2026-08-10T12:00:00");
  const payments = [bbPayment];
  const client = {
    ...clientBase,
    startDate: "2026-08-01",
    nextPaymentDate: "2026-06-15",
  };
  const map = indexPaymentsByClientId(payments);

  assert.equal(
    isOverdue(client, today, map),
    false
  );
});

test("BB booking uses payment start when client start is stale", () => {
  const today = new Date("2026-07-19T12:00:00");
  const payments = [
    {
      ...bbPayment,
      startDate: "2026-09-01",
    },
  ];
  const client = {
    ...clientBase,
    startDate: "",
    nextPaymentDate: "2026-06-15",
  };
  const map = indexPaymentsByClientId(payments);

  assert.equal(
    isOverdue(client, today, map),
    false
  );
});
