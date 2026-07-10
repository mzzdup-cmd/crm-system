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
