import test from "node:test";
import assert from "node:assert/strict";

import {
  getPaymentTtSyncStatusLabel,
  isPaymentTtSynced,
  paymentNeedsTtAppend,
} from "../../src/domain/payment/paymentTtExportState.js";

test("orphaned synced payment shows re-export label", () => {
  const payment = {
    syncedToSheets: true,
    invoiceNumber: "46228595",
  };

  assert.equal(isPaymentTtSynced(payment), false);
  assert.equal(
    getPaymentTtSyncStatusLabel(payment),
    "Ошибка синхронизации — повторная выгрузка"
  );
});

test("skip reason label is shown for pending payment", () => {
  assert.equal(
    getPaymentTtSyncStatusLabel({
      syncedToSheets: false,
      lastTtSyncSkipReason: "manager_unresolved",
    }),
    "Менеджер не определён — строка не выгружена"
  );
});

test("synced payment with row metadata is synced", () => {
  const payment = {
    syncedToSheets: true,
    ttRowNumber: 88,
  };

  assert.equal(paymentNeedsTtAppend(payment), false);
  assert.equal(
    getPaymentTtSyncStatusLabel(payment),
    "В ТТ"
  );
});
