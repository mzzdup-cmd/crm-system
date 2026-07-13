export default function PageTabs({
  tabs = [],
  activeTab,
  onChange,
}) {
  return (
    <div
      className="
        flex flex-wrap gap-2
        border-b border-neutral-800 pb-3
      "
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive =
          activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() =>
              onChange(tab.id)
            }
            className={`
              px-4 py-2.5 rounded-xl text-sm font-medium
              transition-colors
              ${
                isActive
                  ? "bg-brand/15 text-brand border border-brand/40"
                  : "bg-surface-raised/60 text-neutral-400 hover:bg-surface-raised hover:text-neutral-200"
              }
            `}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
