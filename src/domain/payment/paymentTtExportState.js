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

  // Missing row coords must not force a second append.
  if (!paymentHasTtRowMetadata(payment)) {
    return false;
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

  // Synced without row metadata: do not append again (duplicates TT).
  if (!paymentHasTtRowMetadata(payment)) {
    return false;
  }

  if (topupNeedsOwnTtAppend(payment)) {
    return true;
  }

  return false;
}

export function paymentHasVkForTt(
  payment,
  client = null
) {
  const paymentVk = String(
    payment?.vkLink || ""
  ).trim();
  const clientVk = String(
    client?.vkLink || ""
  ).trim();

  return Boolean(paymentVk || clientVk);
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

function paymentHasQueuedVkResync(payment) {
  return (
    payment?.ttVkResyncPending === true &&
    paymentHasTtRowMetadata(payment)
  );
}

const SKIP_REASON_LABELS = {
  manager_unresolved:
    "Менеджер не определён — строка не выгружена",
  manager_tt_not_configured:
    "Нет ТТ-таблицы для менеджера",
  missing_tt_row:
    "Строка в ТТ не найдена — нужна повторная выгрузка",
  missing_vk:
    "Ждёт ссылку VK — потом уйдёт в ТТ",
};

export function getPaymentTtSyncStatusLabel(
  payment,
  client = null
) {
  if (
    payment?.syncedToSheets === true &&
    !paymentHasTtRowMetadata(payment) &&
    !paymentNeedsTtAppend(payment)
  ) {
    return "В ТТ (проверьте дубль вручную)";
  }

  if (paymentNeedsTtAppend(payment)) {
    const hasVk = paymentHasVkForTt(
      payment,
      client
    );
    const skipReason =
      payment?.lastTtSyncSkipReason;

    // Stale missing_vk after VK was filled on client/payment.
    if (
      skipReason &&
      !(
        skipReason === "missing_vk" &&
        hasVk
      )
    ) {
      return (
        SKIP_REASON_LABELS[skipReason] ||
        `Ожидает выгрузки (${skipReason})`
      );
    }

    if (
      payment?.syncedToSheets === true &&
      topupNeedsOwnTtAppend(payment)
    ) {
      return "Ошибка синхронизации — повторная выгрузка";
    }

    if (!hasVk) {
      return SKIP_REASON_LABELS.missing_vk;
    }

    return "Ожидает выгрузки в ТТ";
  }

  if (paymentHasQueuedVkResync(payment)) {
    return "Обновление VK в ТТ";
  }

  if (paymentHasQueuedTtResync(payment)) {
    return "Обновление строки в ТТ";
  }

  if (payment?.ttStartDateResyncPending === true) {
    return "Обновление потока в ТТ";
  }

  return "В ТТ";
}

export function isPaymentTtSynced(payment) {
  return !paymentNeedsTtAppend(payment);
}
