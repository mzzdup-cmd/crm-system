import test from "node:test";
import assert from "node:assert/strict";

import {
  mergeOffDays,
  removeOffDays,
} from "../../src/domain/schedule/timeOffDates.js";

test("removeOffDays drops manager but keeps others", () => {
  const result = removeOffDays(
    [
      "katya_bakaeva",
      "ruslan_romanyuk",
    ],
    "katya_bakaeva"
  );

  assert.deepEqual(result, [
    "ruslan_romanyuk",
  ]);
});

test("merge then remove restores original list", () => {
  const original = ["denis_manuilov"];
  const merged = mergeOffDays(
    original,
    "katya_bakaeva"
  );
  const restored = removeOffDays(
    merged,
    "katya_bakaeva"
  );

  assert.deepEqual(restored, original);
});
