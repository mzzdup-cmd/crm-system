const test = require("node:test");
const assert = require("node:assert/strict");

const {
  paymentHasTtRowMetadata,
  paymentNeedsTtAppend,
} = require("./paymentTtExportState");

test("synced flag alone does not count as exported TT row", () => {
  assert.equal(
    paymentHasTtRowMetadata({
      syncedToSheets: true,
    }),
    false
  );
});

test("row metadata counts as exported TT row", () => {
  assert.equal(
    paymentHasTtRowMetadata({
      ttRowNumber: 42,
    }),
    true
  );
});

test("orphaned synced payment still needs append", () => {
  assert.equal(
    paymentNeedsTtAppend({
      syncedToSheets: true,
      invoiceNumber: "46228595",
    }),
    true
  );
});

test("synced payment with row metadata does not need append", () => {
  assert.equal(
    paymentNeedsTtAppend({
      syncedToSheets: true,
      ttRowNumber: 120,
    }),
    false
  );
});

test("unsynced payment needs append", () => {
  assert.equal(
    paymentNeedsTtAppend({
      syncedToSheets: false,
    }),
    true
  );
});
