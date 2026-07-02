import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import app from "./firebase";

import {
  normalizeKnownVkLink,
  needsVkLinkResolution,
  parseVkLinkInput,
} from "../domain/vk/vkLinkUtils";

const functions = getFunctions(
  app,
  "europe-west1"
);

export async function resolveVkLinkRemote(
  raw
) {
  const parsed = parseVkLinkInput(raw);

  if (parsed.kind === "id") {
    return {
      normalized: parsed.normalized,
      resolved: true,
      source: "parsed_id",
    };
  }

  if (parsed.kind !== "screen_name") {
    throw new Error(
      "Некорректная ссылка VK"
    );
  }

  const callable = httpsCallable(
    functions,
    "resolveVkLink"
  );

  const response = await callable({
    url: raw,
  });

  return response.data;
}

export async function normalizeVkLinkForStorage(
  raw
) {
  const trimmed = String(raw || "").trim();

  if (!trimmed) {
    return "";
  }

  const known = normalizeKnownVkLink(trimmed);

  if (
    !needsVkLinkResolution(trimmed)
  ) {
    return known || trimmed;
  }

  try {
    const result =
      await resolveVkLinkRemote(trimmed);

    return (
      result?.normalized ||
      known ||
      trimmed
    );
  } catch (error) {
    console.warn(
      "VK normalize fallback:",
      error
    );
    return trimmed;
  }
}
