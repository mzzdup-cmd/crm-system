import { test } from "node:test";
import assert from "node:assert/strict";

import {
  computeReplacements,
  splitShiftIntoSlots,
  getPendingManualAssignments,
  getPairPartner,
} from "../../src/domain/calendar/replacementLogic.js";

test("pair partner resolves both directions", () => {
  assert.equal(
    getPairPartner("katya_bakaeva"),
    "violeta_petrova"
  );
  assert.equal(
    getPairPartner("violeta_petrova"),
    "katya_bakaeva"
  );
});

test("single pair off assigns partner as coverer", () => {
  const result = computeReplacements({
    offDays: ["katya_bakaeva"],
  });

  assert.equal(
    result.shifts.violeta_petrova.coveringFor,
    "katya_bakaeva"
  );
  assert.equal(
    result.shifts.katya_bakaeva.active,
    false
  );
});

test("both pair members off requires manual assignment", () => {
  const result = computeReplacements({
    offDays: [
      "katya_bakaeva",
      "violeta_petrova",
    ],
  });

  assert.equal(
    result.pendingManualAssignments.length,
    2
  );
  assert.equal(
    result.substitutions.length,
    0
  );
});

test("manual assignment applies when both pair off", () => {
  const result = computeReplacements({
    offDays: [
      "katya_bakaeva",
      "violeta_petrova",
    ],
    manualAssignments: {
      katya_bakaeva: "andrey_volkov",
      violeta_petrova: "polina_penkova",
    },
  });

  assert.equal(
    result.shifts.andrey_volkov.coveringFor,
    "katya_bakaeva"
  );
  assert.equal(
    result.shifts.polina_penkova.coveringFor,
    "violeta_petrova"
  );
});

test("quintet single off splits shift among four workers", () => {
  const result = computeReplacements({
    offDays: ["denis_manuilov"],
  });

  const coverers = result.substitutions.filter(
    (item) => item.type === "quintet_split"
  );

  assert.equal(coverers.length, 4);
  assert.ok(
    result.shifts.ruslan_romanyuk.splitCover
  );
});

test("splitShiftIntoSlots divides 11:00-21:00 evenly", () => {
  const slots = splitShiftIntoSlots(4);

  assert.equal(slots.length, 4);
  assert.equal(slots[0].start, "11:00");
  assert.equal(slots[3].end, "21:00");
});

test("getPendingManualAssignments detects missing coverers", () => {
  const pending = getPendingManualAssignments(
    ["katya_bakaeva", "violeta_petrova"],
    { katya_bakaeva: "andrey_volkov" }
  );

  assert.equal(pending.length, 1);
  assert.equal(
    pending[0].offManagerId,
    "violeta_petrova"
  );
});
