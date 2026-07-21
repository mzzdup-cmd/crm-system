import {
  dialogLinksMatch,
  extractDialogId,
} from "./dialogLinkUtils.js";

import {
  recordMatchesDialogSearch,
} from "./recordDialogSearch.js";

export function getClientDialogId(client) {
  return String(
    client?.dialogId ||
      extractDialogId(client?.dialogLink) ||
      ""
  ).trim();
}

export function getPaymentDialogId(payment) {
  return String(
    payment?.dialogId ||
      extractDialogId(payment?.dialogLink) ||
      ""
  ).trim();
}

/**
 * Client card dialog is source of truth.
 * Payment may only confirm a client with no dialog on the card.
 */
export function clientCanonicalDialogMatches(
  client,
  dialogLink,
  dialogId,
  payment = null
) {
  if (!client) {
    return false;
  }

  const clientDialogId =
    getClientDialogId(client);

  if (dialogId && clientDialogId) {
    return clientDialogId === dialogId;
  }

  if (
    dialogLink &&
    client.dialogLink?.trim()
  ) {
    return dialogLinksMatch(
      client.dialogLink,
      dialogLink
    );
  }

  if (
    !clientDialogId &&
    !client.dialogLink?.trim()
  ) {
    return false;
  }

  return recordMatchesDialogSearch(
    client,
    dialogLink
  );
}

export function clientMatchesDialogLookup(
  client,
  dialogLink
) {
  return recordMatchesDialogSearch(
    client,
    dialogLink
  );
}
