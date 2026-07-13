import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  filterTrafficSourcesByQuery,
  findExactTrafficSource,
} from "../../domain/traffic/trafficSourceSearch";

import {
  resolveTrafficSourceSelection,
} from "../../domain/traffic/trafficSourceMerge";

const inputClass =
  "w-full bg-surface-raised p-3.5 rounded-xl";

export default function TrafficSourceSelect({
  sources = [],
  sourceId = "",
  sourceName = "",
  onChange,
  allowCreate = false,
  onCreate,
  disabled = false,
  required = false,
  loading = false,
  hasFirestoreSources = true,
  placeholder = "Откуда (traffic)",
}) {
  const [query, setQuery] = useState(
    sourceName || ""
  );

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery(sourceName || "");
    }
  }, [sourceName, open]);

  const filtered = useMemo(() => {
    return filterTrafficSourcesByQuery(
      sources,
      query
    );
  }, [sources, query]);

  const selectedLabel =
    sourceName ||
    sources.find(
      (item) => item.id === sourceId
    )?.name ||
    "";

  const isCommitted =
    Boolean(sourceId && sourceName);

  function commitSelection(source) {
    if (!source) {
      return false;
    }

    const payload =
      resolveTrafficSourceSelection(
        source
      );

    onChange?.(payload);
    setQuery(payload.sourceName);
    return true;
  }

  function handleSelect(source) {
    commitSelection(source);
    setOpen(false);
  }

  function handleInputChange(event) {
    const next = event.target.value;
    setQuery(next);
    setOpen(true);

    if (!next.trim()) {
      onChange?.({
        sourceId: null,
        sourceName: "",
      });
      return;
    }

    onChange?.({
      sourceId: null,
      sourceName: "",
    });
  }

  function trySelectExactMatch() {
    const exact =
      findExactTrafficSource(
        sources,
        query
      );

    if (exact) {
      return commitSelection(exact);
    }

    if (filtered.length === 1) {
      return commitSelection(filtered[0]);
    }

    return false;
  }

  function handleBlur() {
    window.setTimeout(() => {
      trySelectExactMatch();
      setOpen(false);
    }, 150);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();

      if (trySelectExactMatch()) {
        setOpen(false);
      }

      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  async function handleCreateClick() {
    if (!allowCreate || !onCreate) {
      return;
    }

    const name = query.trim();

    if (!name) {
      return;
    }

    try {
      const created =
        await onCreate(name);

      handleSelect(created);
    } catch {
      // parent shows toast
    }
  }

  const showCreateOption =
    allowCreate &&
    query.trim() &&
    !filtered.some(
      (item) =>
        item.name.toLowerCase() ===
        query.trim().toLowerCase()
    );

  const showEmptyState =
    filtered.length === 0 &&
    !showCreateOption;

  const emptyMessage =
    !loading &&
    sources.length === 0
      ? "Traffic sources не загружены"
      : "Ничего не найдено";

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="text"
          value={
            open ? query : selectedLabel
          }
          onChange={handleInputChange}
          onFocus={() => {
            setQuery(selectedLabel);
            setOpen(true);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled || loading}
          required={required}
          placeholder={
            loading
              ? "Загрузка traffic..."
              : placeholder
          }
          autoComplete="off"
          className={inputClass}
        />

        {open && !disabled && !loading && (
          <div
            className="
              absolute z-30 left-0 right-0 mt-1
              max-h-56 overflow-y-auto
              bg-surface border border-neutral-700
              rounded-xl shadow-xl
            "
          >
            {!hasFirestoreSources &&
              sources.length > 0 && (
                <div className="px-3 py-2 text-xs text-amber-400/90 border-b border-neutral-800">
                  Локальный список. Admin seed
                  создаст Firestore записи.
                </div>
              )}

            {showEmptyState && (
              <div className="p-3 text-sm text-neutral-500">
                {emptyMessage}
              </div>
            )}

            {filtered.map((source) => (
              <button
                key={
                  source.id ||
                  source.name
                }
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleSelect(source);
                }}
                className="
                  w-full text-left px-3 py-2.5
                  hover:bg-surface-raised text-sm
                "
              >
                {source.name}
              </button>
            ))}

            {showCreateOption && (
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleCreateClick();
                }}
                className="
                  w-full text-left px-3 py-2.5
                  text-brand hover:bg-surface-raised
                  text-sm border-t border-neutral-800
                "
              >
                + Добавить «{query.trim()}»
              </button>
            )}
          </div>
        )}
      </div>

      {isCommitted && (
        <div
          className="
            inline-flex items-center gap-2
            text-sm text-green-300
            bg-green-500/10 border border-green-500/30
            px-3 py-1.5 rounded-full
          "
        >
          <span aria-hidden>✓</span>
          <span>
            Трафик выбран:{" "}
            <strong>{sourceName}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
