import test from "node:test";
import assert from "node:assert/strict";

import {
  canonicalManagerId,
  resolveCanonicalManagerKey,
} from "../../src/domain/auth/managerMigration.js";

import {
  getManagerNameById,
} from "../../src/constants/managers.js";

const VIOLETTA_ID = "violeta_petrova";
const VIOLETTA_NAME = "Виолетта Петрова";

test("canonicalManagerId maps vilu aliases to violeta_petrova", () => {
  for (const alias of [
    "vilu_petrova",
    "vilu",
    "violeta",
    "violeta_petrova",
  ]) {
    assert.equal(
      canonicalManagerId(alias),
      VIOLETTA_ID
    );
  }
});

test("resolveCanonicalManagerKey resolves legacy payment ids", () => {
  assert.equal(
    resolveCanonicalManagerKey(
      "vilu_petrova"
    ),
    VIOLETTA_ID
  );
  assert.equal(
    resolveCanonicalManagerKey(
      VIOLETTA_NAME
    ),
    VIOLETTA_ID
  );
});

test("getManagerNameById resolves vilu_petrova alias", () => {
  assert.equal(
    getManagerNameById("vilu_petrova"),
    VIOLETTA_NAME
  );
});

test("leaderboard-style aggregation merges vilu_petrova into violeta_petrova", () => {
  const payments = [
    {
      managerId: "vilu_petrova",
      amount: 15000,
    },
    {
      managerId: VIOLETTA_ID,
      amount: 5000,
    },
  ];

  const stats = {};

  payments.forEach((payment) => {
    const key =
      resolveCanonicalManagerKey(
        payment.managerId
      );

    stats[key] =
      (stats[key] || 0) +
      payment.amount;
  });

  assert.equal(
    stats[VIOLETTA_ID],
    20000
  );
  assert.equal(
    stats.vilu_petrova,
    undefined
  );
});

test("salary-style aggregation uses display name for vilu_petrova", () => {
  const managerKey =
    resolveCanonicalManagerKey(
      "vilu_petrova"
    );

  assert.equal(managerKey, VIOLETTA_ID);
  assert.equal(
    getManagerNameById(managerKey),
    VIOLETTA_NAME
  );
});
