export function normalizeTrafficSearchText(
  value
) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ");
}

export function expandTrafficSearchQueries(
  queryText
) {
  const normalized =
    normalizeTrafficSearchText(queryText);

  if (!normalized) {
    return [];
  }

  const queries = [normalized];

  const tarWithSpace =
    normalized.match(/^тар\s+(\d+)$/);

  if (tarWithSpace) {
    queries.push(
      `таргет ${tarWithSpace[1]}`
    );
  }

  const tarCompact =
    normalized.match(/^тар(\d+)$/);

  if (tarCompact) {
    queries.push(
      `таргет ${tarCompact[1]}`
    );
  }

  const targetCompact =
    normalized.match(/^таргет(\d+)$/);

  if (targetCompact) {
    queries.push(
      `таргет ${targetCompact[1]}`
    );
  }

  return [...new Set(queries)];
}

function matchesExpandedQueries(
  sourceName,
  queries
) {
  const name =
    normalizeTrafficSearchText(sourceName);

  return queries.some((query) => {
    if (name === query) {
      return true;
    }

    if (name.includes(query)) {
      return true;
    }

    return name
      .split(/[\s\-_/]+/)
      .some(
        (token) =>
          token.startsWith(query) ||
          token.includes(query)
      );
  });
}

function matchesNumericQuery(
  sourceName,
  queryText
) {
  const numeric =
    normalizeTrafficSearchText(
      queryText
    ).match(/^(\d+)$/);

  if (!numeric) {
    return false;
  }

  const name =
    normalizeTrafficSearchText(sourceName);
  const n = numeric[1];

  return (
    name === n ||
    name === `таргет ${n}`
  );
}

export function trafficSourceMatchesQuery(
  sourceName,
  queryText
) {
  const query =
    normalizeTrafficSearchText(queryText);

  if (!query) {
    return true;
  }

  if (/^\d+$/.test(query)) {
    return matchesNumericQuery(
      sourceName,
      queryText
    );
  }

  const expanded =
    expandTrafficSearchQueries(queryText);

  return matchesExpandedQueries(
    sourceName,
    expanded
  );
}

export function findExactTrafficSource(
  sources,
  queryText
) {
  const query =
    normalizeTrafficSearchText(queryText);

  if (!query) {
    return null;
  }

  const expanded =
    expandTrafficSearchQueries(queryText);

  for (const candidate of expanded) {
    const exact = sources.find(
      (source) =>
        normalizeTrafficSearchText(
          source.name
        ) === candidate
    );

    if (exact) {
      return exact;
    }
  }

  const numeric =
    query.match(/^(\d+)$/);

  if (numeric) {
    const n = numeric[1];

    const numberSource = sources.find(
      (source) =>
        normalizeTrafficSearchText(
          source.name
        ) === n
    );

    if (numberSource) {
      return numberSource;
    }

    const targetSource = sources.find(
      (source) =>
        normalizeTrafficSearchText(
          source.name
        ) === `таргет ${n}`
    );

    if (targetSource) {
      return targetSource;
    }
  }

  return null;
}

export function filterTrafficSourcesByQuery(
  sources,
  queryText
) {
  const query =
    normalizeTrafficSearchText(queryText);

  if (!query) {
    return sources;
  }

  return sources.filter((source) =>
    trafficSourceMatchesQuery(
      source.name,
      queryText
    )
  );
}
