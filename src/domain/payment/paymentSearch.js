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

function extractDialogId(value) {
  const match = String(value || "").match(
    /dialogId=(\d+)/i
  );

  return match?.[1] || "";
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
    payment?.manager,
    payment?.dealType,
    payment?.course,
    payment?.paymentSystem,
    payment?.dialogLink,
    payment?.comment,
    payment?.amount,
    payment?.paymentDate,
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
