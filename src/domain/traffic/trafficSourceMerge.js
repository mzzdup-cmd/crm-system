import {
  INITIAL_TRAFFIC_SOURCE_NAMES,
} from "../../constants/trafficSourcesSeed";

import {
  normalizeTrafficSearchText,
} from "./trafficSourceSearch";

function sortByName(sources) {
  return [...sources].sort((a, b) =>
    a.name.localeCompare(b.name, "ru")
  );
}

export function mergeTrafficSourcesWithFallback(
  firestoreSources = []
) {
  const byNormalizedName = new Map();

  firestoreSources.forEach((source) => {
    const key = normalizeTrafficSearchText(
      source.name
    );

    if (key) {
      byNormalizedName.set(key, {
        ...source,
        isFallback: false,
      });
    }
  });

  INITIAL_TRAFFIC_SOURCE_NAMES.forEach(
    (name, index) => {
      const key =
        normalizeTrafficSearchText(name);

      if (!key || byNormalizedName.has(key)) {
        return;
      }

      byNormalizedName.set(key, {
        id: `fallback_${index}`,
        name,
        isFallback: true,
      });
    }
  );

  return sortByName(
    [...byNormalizedName.values()]
  );
}

export function resolveTrafficSourceSelection(
  source
) {
  if (!source) {
    return {
      sourceId: null,
      sourceName: "",
    };
  }

  return {
    sourceId: source.id || null,
    sourceName: source.name,
  };
}
