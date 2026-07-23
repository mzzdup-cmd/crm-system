const DIALOG_LINK_HOST_ALIASES = [
  "bluesales.ru",
  "bizasales.ru",
  "business.vk.com",
];

export function extractDialogId(link) {
  const match = String(link || "").match(
    /dialogId=(\d+)/i
  );

  return match?.[1] || "";
}

export function normalizeDialogLink(link) {
  if (!link) {
    return "";
  }

  const trimmed = String(link).trim();

  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);
    const path =
      url.pathname.replace(/\/+$/, "") ||
      "";

    return `${url.protocol}//${url.host.toLowerCase()}${path}`.toLowerCase();
  } catch {
    return trimmed
      .replace(/\/+$/, "")
      .toLowerCase();
  }
}

export function dialogLinksMatch(
  left,
  right
) {
  if (!left || !right) {
    return false;
  }

  if (left.trim() === right.trim()) {
    return true;
  }

  const leftId = extractDialogId(left);
  const rightId = extractDialogId(right);

  if (leftId && rightId) {
    return leftId === rightId;
  }

  if (leftId || rightId) {
    return false;
  }

  return (
    normalizeDialogLink(left) ===
    normalizeDialogLink(right)
  );
}

export function getDialogLinkLookupVariants(
  link
) {
  const variants = new Set();
  const trimmed = String(link || "").trim();

  if (!trimmed) {
    return [];
  }

  variants.add(trimmed);
  variants.add(
    trimmed.replace(/\/+$/, "")
  );
  variants.add(
    `${trimmed.replace(/\/+$/, "")}/`
  );

  const dialogId = extractDialogId(trimmed);

  if (dialogId) {
    for (const host of DIALOG_LINK_HOST_ALIASES) {
      variants.add(
        `https://${host}/app/Messenger?dialogId=${dialogId}`
      );
      variants.add(
        `https://${host}/app/Messenger/?dialogId=${dialogId}`
      );
      variants.add(
        `http://${host}/app/Messenger?dialogId=${dialogId}`
      );
      variants.add(
        `http://${host}/app/Messenger/?dialogId=${dialogId}`
      );
    }
  }

  try {
    const url = new URL(trimmed);

    if (url.protocol === "https:") {
      variants.add(
        trimmed.replace(
          /^https:/i,
          "http:"
        )
      );
    } else if (
      url.protocol === "http:"
    ) {
      variants.add(
        trimmed.replace(
          /^http:/i,
          "https:"
        )
      );
    }
  } catch {
    // not a URL — keep trimmed variants only
  }

  return [...variants];
}

/** Bluesales dialog id from URL or plain digits (not BS client id). */
export function resolveDialogLookupId(raw) {
  const trimmed = String(raw || "").trim();

  if (!trimmed) {
    return "";
  }

  const fromUrl = extractDialogId(trimmed);

  if (fromUrl) {
    return fromUrl;
  }

  if (/^\d{5,}$/.test(trimmed)) {
    return trimmed;
  }

  return "";
}
