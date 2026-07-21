import {
  extractDialogId,
} from "../client/dialogLinkUtils.js";

import {
  recordMatchesDialogSearch,
} from "../client/recordDialogSearch.js";

export function enrichPaymentForSearch(
  payment,
  client = null
) {
  if (!payment) {
    return payment;
  }

  const dialogLink =
    payment.dialogLink ||
    client?.dialogLink ||
    "";
  const dialogId =
    payment.dialogId ||
    extractDialogId(dialogLink) ||
    client?.dialogId ||
    extractDialogId(
      client?.dialogLink || ""
    ) ||
    "";

  return {
    ...payment,
    dialogLink,
    dialogId,
    clientName:
      payment.clientName ||
      client?.name ||
      "",
  };
}

function normalizeSearchText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeInvoiceQuery(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function normalizeInvoiceDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function resolveInvoiceValues(payment) {
  return [
    payment?.invoiceNumber,
    payment?.invoice,
    payment?.account,
    payment?.accountNumber,
  ].filter(Boolean);
}

function invoiceMatchesQuery(
  payment,
  invoiceQuery,
  digitQuery
) {
  const invoiceValues =
    resolveInvoiceValues(payment);

  if (!invoiceValues.length) {
    return false;
  }

  return invoiceValues.some((value) => {
    const normalized =
      normalizeInvoiceQuery(value);

    if (
      invoiceQuery &&
      normalized.includes(invoiceQuery)
    ) {
      return true;
    }

    if (
      digitQuery.length >= 4 &&
      normalizeInvoiceDigits(value).includes(
        digitQuery
      )
    ) {
      return true;
    }

    return false;
  });
}

export function paymentMatchesSearch(
  payment,
  query
) {
  const normalizedQuery =
    normalizeSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  if (
    recordMatchesDialogSearch(
      payment,
      query
    )
  ) {
    return true;
  }

  const invoiceQuery =
    normalizeInvoiceQuery(query);
  const digitQuery =
    normalizeInvoiceDigits(query);

  if (
    invoiceMatchesQuery(
      payment,
      invoiceQuery,
      digitQuery
    )
  ) {
    return true;
  }

  const haystack = [
    payment?.clientName,
    payment?.legacyClientName,
    payment?.clientNote,
    payment?.legacyClientBsId,
    payment?.manager,
    payment?.dealType,
    payment?.course,
    payment?.paymentSystem,
    payment?.dialogLink,
    payment?.comment,
    payment?.amount,
    payment?.paymentDate,
    payment?.dialogId,
    ...resolveInvoiceValues(payment),
    extractDialogId(payment?.dialogLink),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (haystack.includes(normalizedQuery)) {
    return true;
  }

  if (
    digitQuery.length >= 4 &&
    normalizeInvoiceDigits(haystack).includes(
      digitQuery
    )
  ) {
    return true;
  }

  return false;
}

export { clientMatchesSearch } from "../client/recordDialogSearch.js";
