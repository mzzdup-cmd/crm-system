import {
  useState,
} from "react";

import { Link } from "react-router-dom";

import { useKnowledgeBase }
from "../hooks/useKnowledgeBase";

import KnowledgeCard
from "../components/knowledge/KnowledgeCard";

import PageHeader
from "../components/ui/PageHeader";

import LoadingState
from "../components/LoadingState";

const inputClass =
  "w-full bg-slate-800 p-3.5 rounded-xl";

const TABS = [
  { id: "faq", label: "FAQ" },
  {
    id: "notes",
    label: "Полезная информация",
  },
  {
    id: "scripts",
    label: "Полезные обработки",
  },
];

export default function KnowledgeBasePage() {
  const {
    loading,
    isAdmin,
    search,
    setSearch,
    selectedTags,
    toggleTag,
    scriptTags,
    filteredFaq,
    filteredNotes,
    filteredScripts,
    recentUpdates,
    saveFaq,
    removeFaq,
    saveNote,
    removeNote,
    saveScript,
    removeScript,
    canEdit,
  } = useKnowledgeBase();

  const [tab, setTab] =
    useState("faq");

  const [editor, setEditor] =
    useState(null);

  if (loading) {
    return (
      <LoadingState message="Загрузка базы знаний..." />
    );
  }

  const items =
    tab === "faq"
      ? filteredFaq
      : tab === "notes"
        ? filteredNotes
        : filteredScripts;

  const pinned = items.filter(
    (item) => item.pinned
  );

  const regular = items.filter(
    (item) => !item.pinned
  );

  function openCreate() {
    setEditor({
      mode: "create",
      section: tab,
      data: {
        title: "",
        content: "",
        category: "",
        links: [],
        tags: [],
        pinned: false,
      },
    });
  }

  function openEdit(item) {
    setEditor({
      mode: "edit",
      section: tab,
      existing: item,
      data: {
        title: item.title || "",
        content: item.content || "",
        category: item.category || "",
        links: item.links || [],
        tags: item.tags || [],
        pinned: Boolean(item.pinned),
      },
    });
  }

  async function handleSave() {
    if (!editor) {
      return;
    }

    const { section, data, existing } =
      editor;

    if (section === "faq") {
      await saveFaq(data, existing);
    } else if (section === "notes") {
      await saveNote(data, existing);
    } else {
      await saveScript(data, existing);
    }

    setEditor(null);
  }

  async function handleDelete(item) {
    if (tab === "faq") {
      await removeFaq(item);
    } else if (tab === "notes") {
      await removeNote(item);
    } else {
      await removeScript(item);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="База знаний"
        subtitle="FAQ, инструкции и обработки команды"
        actions={
          (isAdmin ||
            tab === "scripts") && (
            <button
              type="button"
              onClick={openCreate}
              className="px-4 py-2.5 rounded-xl font-bold text-sm bg-cyan-500 hover:bg-cyan-400"
            >
              + Добавить
            </button>
          )
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Поиск..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          className={`${inputClass} sm:max-w-md`}
        />

        <div className="flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                setTab(item.id)
              }
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === item.id
                  ? "bg-cyan-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {recentUpdates.length > 0 && (
        <section className="bg-slate-900/60 rounded-2xl p-4 md:p-5 space-y-3">
          <h2 className="font-bold text-slate-300">
            Недавние обновления
          </h2>
          <div className="flex flex-wrap gap-2">
            {recentUpdates.map((item) => (
              <button
                key={`${item.section}-${item.id}`}
                type="button"
                onClick={() => {
                  setTab(
                    item.section === "note"
                      ? "notes"
                      : item.section
                  );
                  openEdit(item);
                }}
                className="text-sm px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700"
              >
                {item.title}
              </button>
            ))}
          </div>
        </section>
      )}

      {tab === "scripts" && (
        <div className="flex flex-wrap gap-2">
          {scriptTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() =>
                toggleTag(tag)
              }
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                selectedTags.includes(tag)
                  ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {pinned.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-amber-300 uppercase tracking-wide">
            Закреплённые
          </h2>
          {pinned.map((item) => (
            <KnowledgeCard
              key={item.id}
              item={item}
              showAuthor={
                tab === "scripts"
              }
              editable={canEdit(item)}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </section>
      )}

      <section className="space-y-3">
        {regular.length === 0 ? (
          <div className="bg-slate-900 rounded-2xl p-8 text-center text-slate-500">
            Ничего не найдено
          </div>
        ) : (
          regular.map((item) => (
            <KnowledgeCard
              key={item.id}
              item={item}
              showAuthor={
                tab === "scripts"
              }
              editable={canEdit(item)}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </section>

      {editor && (
        <EditorModal
          editor={editor}
          scriptTags={scriptTags}
          onChange={(data) =>
            setEditor((current) => ({
              ...current,
              data,
            }))
          }
          onClose={() =>
            setEditor(null)
          }
          onSave={handleSave}
        />
      )}

      <Link
        to="/"
        className="text-sm text-cyan-400 hover:underline"
      >
        ← Dashboard
      </Link>
    </div>
  );
}

function EditorModal({
  editor,
  scriptTags,
  onChange,
  onClose,
  onSave,
}) {
  const { section, data, mode } = editor;

  function update(field, value) {
    onChange({
      ...data,
      [field]: value,
    });
  }

  function toggleEditorTag(tag) {
    const tags = data.tags || [];
    update(
      "tags",
      tags.includes(tag)
        ? tags.filter(
            (item) => item !== tag
          )
        : [...tags, tag]
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 space-y-4">
        <h2 className="text-xl font-bold">
          {mode === "create"
            ? "Новая запись"
            : "Редактирование"}
        </h2>

        <input
          placeholder="Заголовок *"
          value={data.title}
          onChange={(e) =>
            update("title", e.target.value)
          }
          className={inputClass}
        />

        {section === "notes" && (
          <input
            placeholder="Категория"
            value={data.category}
            onChange={(e) =>
              update(
                "category",
                e.target.value
              )
            }
            className={inputClass}
          />
        )}

        <textarea
          placeholder="Markdown: **жирный**, - списки, [ссылка](url)"
          value={data.content}
          onChange={(e) =>
            update(
              "content",
              e.target.value
            )
          }
          rows={10}
          className={`${inputClass} resize-y min-h-[180px]`}
        />

        {section === "scripts" && (
          <div className="flex flex-wrap gap-2">
            {scriptTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  toggleEditorTag(tag)
                }
                className={`text-sm px-3 py-1.5 rounded-full border ${
                  (data.tags || []).includes(
                    tag
                  )
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                    : "bg-slate-800 border-slate-700"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {section === "notes" && (
          <input
            placeholder="Ссылки через запятую"
            value={(data.links || []).join(", ")}
            onChange={(e) =>
              update(
                "links",
                e.target.value
                  .split(",")
                  .map((item) =>
                    item.trim()
                  )
                  .filter(Boolean)
              )
            }
            className={inputClass}
          />
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(data.pinned)}
            onChange={(e) =>
              update(
                "pinned",
                e.target.checked
              )
            }
          />
          Закрепить
        </label>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onSave}
            className="flex-1 bg-green-500 hover:bg-green-400 p-3 rounded-xl font-bold"
          >
            Сохранить
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
