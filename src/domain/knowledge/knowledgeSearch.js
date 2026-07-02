export function normalizeSearchText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function stripMarkdown(value) {
  return String(value || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, " $1 ")
    .replace(/[#*_~>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSearchHaystack(item) {
  return [
    item.title,
    stripMarkdown(item.content),
    item.category,
    item.manager,
    ...(item.tags || []),
    ...(item.links || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function itemMatchesSearch(
  item,
  queryText
) {
  const query =
    normalizeSearchText(queryText);

  if (!query) {
    return true;
  }

  const haystack =
    buildSearchHaystack(item);

  const tokens = query
    .split(/\s+/)
    .filter(Boolean);

  return tokens.every((token) =>
    haystack.includes(token)
  );
}

export function itemMatchesTags(
  item,
  selectedTags = []
) {
  if (!selectedTags.length) {
    return true;
  }

  const itemTags = item.tags || [];

  return selectedTags.every((tag) =>
    itemTags.includes(tag)
  );
}

export function sortKnowledgeItems(items) {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }

    return (
      Number(b.updatedAt || b.createdAt || 0) -
      Number(a.updatedAt || a.createdAt || 0)
    );
  });
}

export function filterActiveKnowledgeItems(
  items = []
) {
  return items.filter(
    (item) => !item.deletedAt
  );
}
