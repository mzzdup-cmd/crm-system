import {
  isTopupDealType,
} from "../../constants/dealTypes.js";

export function paymentHasTtRowMetadata(payment) {
  return Boolean(
    payment?.ttRowNumber ||
      payment?.ttUpdatedRange ||
      payment?.sheetsUpdatedRange
  );
}

function topupNeedsOwnTtAppend(payment) {
  if (!isTopupDealType(payment.dealType)) {
    return false;
  }

  if (!paymentHasTtRowMetadata(payment)) {
    return payment?.syncedToSheets === true;
  }

  return !payment.ttSpreadsheetId;
}

export function paymentNeedsTtAppend(payment) {
  if (payment?.deletedAt) {
    return false;
  }

  if (payment?.syncedToSheets !== true) {
    return true;
  }

  if (!paymentHasTtRowMetadata(payment)) {
    return true;
  }

  if (topupNeedsOwnTtAppend(payment)) {
    return true;
  }

  return false;
}

function paymentHasQueuedTtResync(payment) {
  if (payment?.ttRowResyncPending !== true) {
    return false;
  }

  if (!paymentHasTtRowMetadata(payment)) {
    return false;
  }

  if (topupNeedsOwnTtAppend(payment)) {
    return false;
  }

  return true;
}

const SKIP_REASON_LABELS = {
  manager_unresolved:
    "Менеджер не определён — строка не выгружена",
  manager_tt_not_configured:
    "Нет ТТ-таблицы для менеджера",
  missing_tt_row:
    "Строка в ТТ не найдена — нужна повторная выгрузка",
};

export function getPaymentTtSyncStatusLabel(
  payment
) {
  if (paymentNeedsTtAppend(payment)) {
    if (payment?.lastTtSyncSkipReason) {
      return (
        SKIP_REASON_LABELS[
          payment.lastTtSyncSkipReason
        ] ||
        `Ожидает выгрузки (${payment.lastTtSyncSkipReason})`
      );
    }

    if (
      payment?.syncedToSheets === true &&
      !paymentHasTtRowMetadata(payment)
    ) {
      return "Ошибка синхронизации — повторная выгрузка";
    }

    if (
      payment?.syncedToSheets === true &&
      topupNeedsOwnTtAppend(payment)
    ) {
      return "Ошибка синхронизации — повторная выгрузка";
    }

    return "Ожидает выгрузки в ТТ";
  }

  if (paymentHasQueuedTtResync(payment)) {
    return "Обновление строки в ТТ";
  }

  return "В ТТ";
}

export function isPaymentTtSynced(payment) {
  return !paymentNeedsTtAppend(payment);
}
