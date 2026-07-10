const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildPaymentsByClient,
  paymentCanProcessTtResync,
  paymentHasTtRowMetadata,
  paymentNeedsTtAppend,
  shouldRecoverMisroutedTopup,
  topupHasBorrowedTtRow,
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
      ttSpreadsheetId: "sheet-1",
      dealType: "Новая",
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

test("top-up with parent row number needs its own append", () => {
  const payments = [
    {
      id: "parent",
      clientId: "client-1",
      createdAt: 100,
      dealType: "Новая",
      syncedToSheets: true,
      ttRowNumber: 55,
      ttSpreadsheetId: "sheet-1",
    },
    {
      id: "topup",
      clientId: "client-1",
      createdAt: 200,
      dealType: "Доплата Новая",
      syncedToSheets: true,
      ttRowNumber: 55,
      ttRowResyncPending: true,
      invoiceNumber: "46228595",
    },
  ];

  const paymentsByClient =
    buildPaymentsByClient(payments);

  assert.equal(
    topupHasBorrowedTtRow(
      payments[1],
      paymentsByClient
    ),
    true
  );

  assert.equal(
    paymentNeedsTtAppend(
      payments[1],
      paymentsByClient
    ),
    true
  );

  assert.equal(
    paymentCanProcessTtResync(
      payments[1],
      paymentsByClient
    ),
    false
  );

  assert.equal(
    shouldRecoverMisroutedTopup(
      payments[1],
      paymentsByClient
    ),
    true
  );
});

test("top-up with its own exported row can resync", () => {
  const payments = [
    {
      id: "parent",
      clientId: "client-1",
      createdAt: 100,
      dealType: "Новая",
      ttRowNumber: 55,
    },
    {
      id: "topup",
      clientId: "client-1",
      createdAt: 200,
      dealType: "Доплата Новая",
      syncedToSheets: true,
      ttRowNumber: 88,
      ttSpreadsheetId: "sheet-1",
      ttRowResyncPending: true,
    },
  ];

  const paymentsByClient =
    buildPaymentsByClient(payments);

  assert.equal(
    paymentNeedsTtAppend(
      payments[1],
      paymentsByClient
    ),
    false
  );

  assert.equal(
    paymentCanProcessTtResync(
      payments[1],
      paymentsByClient
    ),
    true
  );
});
