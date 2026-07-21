import {
  dialogLinksMatch,
  extractDialogId,
  resolveDialogLookupId,
} from "./dialogLinkUtils.js";

export function recordMatchesDialogSearch(
  record,
  query
) {
  const trimmed = String(query || "").trim();

  if (!trimmed) {
    return false;
  }

  const dialogId =
    resolveDialogLookupId(trimmed);

  if (dialogId) {
    if (record?.dialogId === dialogId) {
      return true;
    }

    if (
      extractDialogId(
        record?.dialogLink
      ) === dialogId
    ) {
      return true;
    }
  }

  if (/^\d+$/.test(trimmed)) {
    const bsIdFields = [
      record?.clientNote,
      record?.legacyClientBsId,
    ]
      .filter(Boolean)
      .map((value) => String(value).trim());

    if (bsIdFields.includes(trimmed)) {
      return true;
    }
  }

  if (
    record?.dialogLink &&
    dialogLinksMatch(
      record.dialogLink,
      trimmed
    )
  ) {
    return true;
  }

  return false;
}

export function clientMatchesSearch(
  client,
  query
) {
  const trimmed = String(query || "").trim();

  if (!trimmed) {
    return true;
  }

  if (
    recordMatchesDialogSearch(
      client,
      trimmed
    )
  ) {
    return true;
  }

  const normalized =
    trimmed.toLowerCase();

  const haystack = [
    client?.name,
    client?.manager,
    client?.course,
    client?.tariff,
    client?.clientNote,
    client?.vkLink,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}
