function paymentHasTtRowMetadata(payment) {
  return Boolean(
    payment?.ttRowNumber ||
      payment?.ttUpdatedRange ||
      payment?.sheetsUpdatedRange
  );
}

function paymentNeedsTtAppend(payment) {
  if (payment?.deletedAt) {
    return false;
  }

  if (payment?.syncedToSheets !== true) {
    return true;
  }

  return !paymentHasTtRowMetadata(payment);
}

module.exports = {
  paymentHasTtRowMetadata,
  paymentNeedsTtAppend,
};
