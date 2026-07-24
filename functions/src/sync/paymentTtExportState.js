const {
  isTopupDeal,
  parseTtRowNumber,
} = require("./dealTypeHelpers");

function paymentHasTtRowMetadata(payment) {
  return Boolean(
    payment?.ttRowNumber ||
      payment?.ttUpdatedRange ||
      payment?.sheetsUpdatedRange
  );
}

function buildPaymentsByClient(payments = []) {
  const byClient = {};

  payments.forEach((payment) => {
    if (!payment.clientId) {
      return;
    }

    if (!byClient[payment.clientId]) {
      byClient[payment.clientId] = [];
    }

    byClient[payment.clientId].push(payment);
  });

  return byClient;
}

function topupHasBorrowedTtRow(
  payment,
  paymentsByClient = {}
) {
  if (
    !isTopupDeal(payment.dealType) ||
    !payment.clientId
  ) {
    return false;
  }

  if (!paymentHasTtRowMetadata(payment)) {
    return false;
  }

  const rowNumber =
    parseTtRowNumber(payment);

  if (!rowNumber) {
    return false;
  }

  const siblings =
    paymentsByClient[payment.clientId] || [];
  const paymentCreatedAt = Number(
    payment.createdAt || 0
  );

  return siblings.some((other) => {
    if (other.id === payment.id) {
      return false;
    }

    if (
      Number(other.createdAt || 0) >=
      paymentCreatedAt
    ) {
      return false;
    }

    return (
      parseTtRowNumber(other) === rowNumber
    );
  });
}

function topupNeedsOwnTtAppend(
  payment,
  paymentsByClient = {}
) {
  if (!isTopupDeal(payment.dealType)) {
    return false;
  }

  // Missing row coords on an already-synced payment must NOT
  // trigger another append — that duplicates the lead in TT.
  if (!paymentHasTtRowMetadata(payment)) {
    return false;
  }

  if (!payment.ttSpreadsheetId) {
    return true;
  }

  return topupHasBorrowedTtRow(
    payment,
    paymentsByClient
  );
}

function paymentNeedsTtAppend(
  payment,
  paymentsByClient = null
) {
  if (payment?.deletedAt) {
    return false;
  }

  if (payment?.syncedToSheets !== true) {
    return true;
  }

  // Already marked synced but row metadata was cleared:
  // re-append would leave a second row in the sheet.
  if (!paymentHasTtRowMetadata(payment)) {
    return false;
  }

  if (
    topupNeedsOwnTtAppend(
      payment,
      paymentsByClient || {}
    )
  ) {
    return true;
  }

  return false;
}

function paymentHasVkForTt(payment, client = null) {
  const paymentVk = String(
    payment?.vkLink || ""
  ).trim();
  const clientVk = String(
    client?.vkLink || ""
  ).trim();

  return Boolean(paymentVk || clientVk);
}

/** First-time TT append only when payment is complete enough (has VK). */
function paymentReadyForTtAppend(
  payment,
  client = null,
  paymentsByClient = null
) {
  if (
    !paymentNeedsTtAppend(
      payment,
      paymentsByClient
    )
  ) {
    return false;
  }

  return paymentHasVkForTt(payment, client);
}

function paymentCanProcessTtResync(
  payment,
  paymentsByClient = {}
) {
  if (payment?.ttRowResyncPending !== true) {
    return false;
  }

  if (!paymentHasTtRowMetadata(payment)) {
    return false;
  }

  if (!parseTtRowNumber(payment)) {
    return false;
  }

  if (
    topupNeedsOwnTtAppend(
      payment,
      paymentsByClient
    )
  ) {
    return false;
  }

  return true;
}

function shouldRecoverMisroutedTopup(
  payment,
  paymentsByClient = {}
) {
  if (
    payment?.deletedAt ||
    !isTopupDeal(payment.dealType)
  ) {
    return false;
  }

  if (
    topupNeedsOwnTtAppend(
      payment,
      paymentsByClient
    )
  ) {
    return true;
  }

  if (
    payment.ttRowResyncPending === true &&
    !paymentCanProcessTtResync(
      payment,
      paymentsByClient
    )
  ) {
    return true;
  }

  return false;
}

module.exports = {
  paymentHasTtRowMetadata,
  buildPaymentsByClient,
  topupHasBorrowedTtRow,
  topupNeedsOwnTtAppend,
  paymentNeedsTtAppend,
  paymentHasVkForTt,
  paymentReadyForTtAppend,
  paymentCanProcessTtResync,
  shouldRecoverMisroutedTopup,
};
