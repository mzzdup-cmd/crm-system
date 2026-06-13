export default function PageTabs({
  tabs = [],
  activeTab,
  onChange,
}) {
  return (
    <div
      className="
        flex flex-wrap gap-2
        border-b border-slate-800 pb-3
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
                  ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/40"
                  : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
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
