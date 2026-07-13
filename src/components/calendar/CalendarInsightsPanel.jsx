export default function CalendarInsightsPanel({
  insights = [],
}) {
  if (!insights.length) {
    return (
      <section className="bg-surface/70 border border-neutral-800 rounded-2xl p-5">
        <h2 className="text-lg font-bold mb-2">
          Пересечения и planning
        </h2>
        <p className="text-neutral-500 text-sm">
          На этот месяц пересечений и рисков не найдено.
        </p>
      </section>
    );
  }

  const toneClass = {
    danger: "border-red-500/30 bg-red-500/10 text-red-200",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-100",
    info: "border-brand/30 bg-brand/10 text-brand",
    neutral: "border-neutral-700 bg-surface-raised/60 text-neutral-200",
  };

  return (
    <section className="bg-surface/70 border border-neutral-800 rounded-2xl p-5">
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
