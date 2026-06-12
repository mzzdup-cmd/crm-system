export default function CalendarInsightsPanel({
  insights = [],
}) {
  if (!insights.length) {
    return (
      <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-lg font-bold mb-2">
          Пересечения и planning
        </h2>
        <p className="text-slate-500 text-sm">
          На этот месяц пересечений и рисков не найдено.
        </p>
      </section>
    );
  }

  const toneClass = {
    danger: "border-red-500/30 bg-red-500/10 text-red-200",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-100",
    info: "border-cyan-500/30 bg-cyan-500/10 text-cyan-100",
    neutral: "border-slate-700 bg-slate-800/60 text-slate-200",
  };

  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
      <h2 className="text-lg font-bold mb-4">
        Пересечения и planning
      </h2>

      <div className="space-y-3">
        {insights.map((item) => (
          <div
            key={item.id}
            className={`
              rounded-xl border px-4 py-3 text-sm
              ${toneClass[item.tone] || toneClass.neutral}
            `}
          >
            {item.message}
          </div>
        ))}
      </div>
    </section>
  );
}
