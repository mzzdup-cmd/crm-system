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
    ttSpreadsheetId: "sheet-1",
    dealType: "Новая",
  };

  assert.equal(paymentNeedsTtAppend(payment), false);
  assert.equal(
    getPaymentTtSyncStatusLabel(payment),
    "В ТТ"
  );
});

test("top-up stuck on parent row shows re-export instead of resync badge", () => {
  const payment = {
    syncedToSheets: true,
    dealType: "Доплата Новая",
    ttRowNumber: 55,
    ttRowResyncPending: true,
    invoiceNumber: "46228595",
  };

  assert.equal(isPaymentTtSynced(payment), false);
  assert.equal(
    getPaymentTtSyncStatusLabel(payment),
    "Ошибка синхронизации — повторная выгрузка"
  );
});

test("top-up with own exported row shows resync badge", () => {
  const payment = {
    syncedToSheets: true,
    dealType: "Доплата Новая",
    ttRowNumber: 88,
    ttSpreadsheetId: "sheet-1",
    ttRowResyncPending: true,
  };

  assert.equal(
    getPaymentTtSyncStatusLabel(payment),
    "Обновление строки в ТТ"
  );
});

test("resync badge is hidden without row metadata", () => {
  assert.equal(
    getPaymentTtSyncStatusLabel({
      syncedToSheets: false,
      ttRowResyncPending: true,
    }),
    "Ожидает выгрузки в ТТ"
  );
});
