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

  const invoiceNumber =
    normalizeInvoiceQuery(
      payment?.invoiceNumber
    );

  if (
    invoiceQuery &&
    invoiceNumber.includes(invoiceQuery)
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
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(
    normalizedQuery
  );
}
