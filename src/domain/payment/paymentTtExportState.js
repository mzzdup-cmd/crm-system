export function paymentHasTtRowMetadata(payment) {
  return Boolean(
    payment?.ttRowNumber ||
      payment?.ttUpdatedRange ||
      payment?.sheetsUpdatedRange
  );
}

export function paymentNeedsTtAppend(payment) {
  if (payment?.deletedAt) {
    return false;
  }

  if (payment?.syncedToSheets !== true) {
    return true;
  }

  return !paymentHasTtRowMetadata(payment);
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

    return "Ожидает выгрузки в ТТ";
  }

  if (payment?.ttRowResyncPending === true) {
    return "Обновление строки в ТТ";
  }

  return "В ТТ";
}

export function isPaymentTtSynced(payment) {
  return !paymentNeedsTtAppend(payment);
}
