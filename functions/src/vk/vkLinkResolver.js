const {
  formatVkIdLink,
  parseVkLinkInput,
  needsVkLinkResolution,
} = require("./vkLinkUtils");

const RESOLVE_TIMEOUT_MS = 12000;
const RESOLVE_CACHE = new Map();

function getVkServiceToken() {
  return (
    process.env.VK_SERVICE_TOKEN ||
    process.env.VK_ACCESS_TOKEN ||
    ""
  ).trim();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; CRMSchoolBot/1.0)",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(
      RESOLVE_TIMEOUT_MS
    ),
  });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}`
    );
  }

  return response.text();
}

function extractVkIdFromHtml(html) {
  const patterns = [
    /vk\.com\/id(\d{5,})/i,
    /"owner_id"\s*:\s*(\d{5,})/,
    /"user_id"\s*:\s*(\d{5,})/,
    /data-id="(\d{5,})"/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

async function resolveViaVkApi(screenName) {
  const token = getVkServiceToken();

  if (!token) {
    return null;
  }

  const url =
    "https://api.vk.com/method/utils.resolveScreenName?" +
    new URLSearchParams({
      screen_name: screenName,
      access_token: token,
      v: "5.199",
    }).toString();

  const response = await fetch(url, {
    signal: AbortSignal.timeout(
      RESOLVE_TIMEOUT_MS
    ),
  });

  const payload = await response.json();
  const objectId =
    payload?.response?.object_id;
  const type = payload?.response?.type;

  if (
    type === "user" &&
    Number(objectId) > 0
  ) {
    return String(objectId);
  }

  return null;
}

async function resolveViaRegvk(screenName) {
  const html = await fetchText(
    `https://regvk.com/id/${encodeURIComponent(screenName)}`
  );

  return extractVkIdFromHtml(html);
}

async function resolveVia220vk(screenName) {
  const html = await fetchText(
    `https://220vk.com/${encodeURIComponent(screenName)}`
  );

  return extractVkIdFromHtml(html);
}

async function resolveScreenNameToId(
  screenName
) {
  const key = screenName.toLowerCase();

  if (RESOLVE_CACHE.has(key)) {
    return RESOLVE_CACHE.get(key);
  }

  const resolvers = [
    resolveViaVkApi,
    resolveViaRegvk,
    resolveVia220vk,
  ];

  for (const resolver of resolvers) {
    try {
      const id = await resolver(screenName);

      if (id) {
        RESOLVE_CACHE.set(key, id);
        return id;
      }
    } catch (error) {
      console.warn(
        "VK resolver failed:",
        resolver.name,
        screenName,
        error.message
      );
    }
  }

  RESOLVE_CACHE.set(key, null);
  return null;
}

async function resolveVkLink(raw) {
  const parsed = parseVkLinkInput(raw);

  if (parsed.kind === "empty") {
    return {
      normalized: "",
      resolved: false,
      source: "empty",
    };
  }

  if (parsed.kind === "id") {
    return {
      normalized: parsed.normalized,
      resolved: true,
      source: "parsed_id",
    };
  }

  if (parsed.kind !== "screen_name") {
    return {
      normalized: String(raw || "").trim(),
      resolved: false,
      source: "unknown",
    };
  }

  const id = await resolveScreenNameToId(
    parsed.screenName
  );

  if (!id) {
    return {
      normalized: String(raw || "").trim(),
      resolved: false,
      source: "unresolved",
      screenName: parsed.screenName,
    };
  }

  return {
    normalized: formatVkIdLink(id),
    resolved: true,
    source: "resolved",
    screenName: parsed.screenName,
    id,
  };
}

module.exports = {
  resolveVkLink,
  needsVkLinkResolution,
  parseVkLinkInput,
  formatVkIdLink,
};
