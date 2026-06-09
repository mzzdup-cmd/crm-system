export function normalizeSearchText(value) {
  return String(value || "")
    .trim()
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

  const haystack = [
    item.title,
    item.content,
    item.category,
    ...(item.tags || []),
    ...(item.links || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
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
