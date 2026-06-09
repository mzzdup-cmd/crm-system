import { useState } from "react";

import SimpleMarkdown
from "./SimpleMarkdown";

import { useToast }
from "../../context/ToastContext";

export default function KnowledgeCard({
  item,
  editable = false,
  onEdit,
  onDelete,
  showAuthor = false,
}) {
  const toast = useToast();
  const [expanded, setExpanded] =
    useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(
        item.content || ""
      );
      toast.success("Скопировано");
    } catch {
      toast.error(
        "Не удалось скопировать"
      );
    }
  }

  return (
    <article
      className="
        bg-slate-900 rounded-2xl p-4 md:p-5
        border border-slate-800
        hover:border-slate-700 transition-colors
      "
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {item.pinned && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                📌 Закреплено
              </span>
            )}

            {item.category && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                {item.category}
              </span>
            )}

            {(item.tags || []).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
              >
                {tag}
              </span>
            ))}
          </div>

          <h3 className="text-lg font-bold mt-2 break-words">
            {item.title}
          </h3>

          {showAuthor && item.manager && (
            <p className="text-xs text-slate-500 mt-1">
              {item.manager}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg text-sm bg-slate-800 hover:bg-slate-700"
          >
            Копировать
          </button>

          <button
            type="button"
            onClick={() =>
              setExpanded((value) => !value)
            }
            className="px-3 py-1.5 rounded-lg text-sm bg-slate-800 hover:bg-slate-700"
          >
            {expanded
              ? "Свернуть"
              : "Открыть"}
          </button>

          {editable && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="px-3 py-1.5 rounded-lg text-sm bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
            >
              Изменить
            </button>
          )}

          {editable && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="px-3 py-1.5 rounded-lg text-sm bg-red-500/15 text-red-300 hover:bg-red-500/25"
            >
              Удалить
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <SimpleMarkdown
            content={item.content}
          />

          {item.links?.length > 0 && (
            <div className="mt-4 space-y-1">
              <div className="text-xs text-slate-500 uppercase tracking-wide">
                Ссылки
              </div>
              {item.links.map((link) => (
                <a
                  key={link}
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-sm text-cyan-400 hover:underline break-all"
                >
                  {link}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
