const VK_RESERVED_PATHS = new Set([
  "id",
  "club",
  "public",
  "event",
  "topic",
  "wall",
  "video",
  "audio",
  "photo",
  "market",
  "away",
  "feed",
  "write",
  "im",
  "mail",
  "settings",
  "login",
  "join",
]);

export function formatVkIdLink(id) {
  const numericId = String(id || "").replace(/\D/g, "");

  if (!numericId) {
    return "";
  }

  return `https://vk.com/id${numericId}`;
}

export function parseVkLinkInput(raw) {
  const trimmed = String(raw || "").trim();

  if (!trimmed) {
    return { kind: "empty" };
  }

  const regvkMatch = trimmed.match(
    /regvk\.com\/id\/(?:@)?([^/?#]+)/i
  );

  if (regvkMatch) {
    const screenName = regvkMatch[1];

    if (/^\d+$/.test(screenName)) {
      return {
        kind: "id",
        id: screenName,
        normalized: formatVkIdLink(screenName),
      };
    }

    return {
      kind: "screen_name",
      screenName,
    };
  }

  const vk220Match = trimmed.match(
    /220vk\.com\/(?:id)?(\d{5,})/i
  );

  if (vk220Match) {
    return {
      kind: "id",
      id: vk220Match[1],
      normalized: formatVkIdLink(vk220Match[1]),
    };
  }

  const vk220ScreenMatch = trimmed.match(
    /220vk\.com\/([a-zA-Z0-9_.]+)/i
  );

  if (vk220ScreenMatch) {
    return {
      kind: "screen_name",
      screenName: vk220ScreenMatch[1],
    };
  }

  const idMatch = trimmed.match(
    /(?:https?:\/\/)?(?:m\.)?vk\.com\/id(\d+)/i
  );

  if (idMatch) {
    return {
      kind: "id",
      id: idMatch[1],
      normalized: formatVkIdLink(idMatch[1]),
    };
  }

  const screenMatch = trimmed.match(
    /(?:https?:\/\/)?(?:m\.)?vk\.com\/([a-zA-Z0-9_.]+)/i
  );

  if (screenMatch) {
    const segment = screenMatch[1];

    if (/^id\d+$/i.test(segment)) {
      const id = segment.replace(/^id/i, "");

      return {
        kind: "id",
        id,
        normalized: formatVkIdLink(id),
      };
    }

    if (
      VK_RESERVED_PATHS.has(
        segment.toLowerCase()
      )
    ) {
      return {
        kind: "unknown",
        raw: trimmed,
      };
    }

    return {
      kind: "screen_name",
      screenName: segment,
    };
  }

  if (
    /^@?[a-zA-Z0-9_.]+$/.test(trimmed) &&
    !/^\d+$/.test(trimmed)
  ) {
    return {
      kind: "screen_name",
      screenName: trimmed.replace(/^@/, ""),
    };
  }

  return {
    kind: "unknown",
    raw: trimmed,
  };
}

export function needsVkLinkResolution(raw) {
  return (
    parseVkLinkInput(raw).kind ===
    "screen_name"
  );
}

export function normalizeKnownVkLink(raw) {
  const parsed = parseVkLinkInput(raw);

  if (parsed.kind === "empty") {
    return "";
  }

  if (parsed.kind === "id") {
    return parsed.normalized;
  }

  return String(raw || "").trim();
}
