import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveClientStreamStartDate,
} from "../../src/domain/client/clientDates.js";

import {
  inheritsClientStream,
} from "../../src/constants/dealTypes.js";

test("resolveClientStreamStartDate prefers client card", () => {
  assert.equal(
    resolveClientStreamStartDate(
      { startDate: "2026-05-04" },
      [
        {
          startDate: "2026-07-20",
          paymentDate: "2026-07-21",
        },
      ]
    ),
    "2026-05-04"
  );
});

test("resolveClientStreamStartDate falls back to earliest payment", () => {
  assert.equal(
    resolveClientStreamStartDate(
      {},
      [
        {
          startDate: "2026-07-20",
          paymentDate: "2026-08-01",
        },
        {
          startDate: "2026-05-04",
          paymentDate: "2026-05-10",
        },
      ]
    ),
    "2026-05-04"
  );
});

test("inheritsClientStream covers topups rejects refunds", () => {
  assert.equal(
    inheritsClientStream("Доплата Новая"),
    true
  );
  assert.equal(
    inheritsClientStream("Отказ Новая"),
    true
  );
  assert.equal(
    inheritsClientStream("Возврат"),
    true
  );
  assert.equal(
    inheritsClientStream("Новая"),
    false
  );
  assert.equal(
    inheritsClientStream("Апсэйл"),
    false
  );
});
