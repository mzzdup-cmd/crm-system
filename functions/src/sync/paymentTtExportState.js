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

  if (!paymentHasTtRowMetadata(payment)) {
    return payment?.syncedToSheets === true;
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

  if (!paymentHasTtRowMetadata(payment)) {
    return true;
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
  paymentCanProcessTtResync,
  shouldRecoverMisroutedTopup,
};
