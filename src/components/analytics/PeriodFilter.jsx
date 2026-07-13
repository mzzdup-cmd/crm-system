import {
  ANALYTICS_PERIODS,
} from "../../domain/analytics/periodFilters";

export default function PeriodFilter({
  period,
  customRange,
  onPeriodChange,
  onCustomRangeChange,
}) {
  const buttons = [
    {
      id: ANALYTICS_PERIODS.TODAY,
      label: "Сегодня",
    },
    {
      id: ANALYTICS_PERIODS.WEEK,
      label: "Неделя",
    },
    {
      id: ANALYTICS_PERIODS.MONTH,
      label: "Месяц",
    },
    {
      id: ANALYTICS_PERIODS.CUSTOM,
      label: "Период",
    },
  ];

  return (
    <div className="bg-surface p-4 rounded-2xl flex flex-wrap gap-3 items-center">

      {

        buttons.map((button) => (

          <button
            key={button.id}
            onClick={() =>
              onPeriodChange(button.id)
            }
            className={`
              px-4 py-2 rounded-xl font-bold transition-all
              ${
                period === button.id
                  ? "crm-btn-primary"
                  : "bg-surface-raised text-neutral-300 hover:bg-surface-hover"
              }
            `}
          >
            {button.label}
          </button>

        ))

      }

      {

        period === ANALYTICS_PERIODS.CUSTOM && (

          <div className="flex gap-2 ml-auto">

            <input
              type="date"
              value={customRange.start || ""}
              onChange={(e) =>
                onCustomRangeChange({
                  ...customRange,
                  start: e.target.value,
                })
              }
              className="bg-surface-raised p-2 rounded-xl"
            />

            <input
              type="date"
              value={customRange.end || ""}
              onChange={(e) =>
                onCustomRangeChange({
                  ...customRange,
                  end: e.target.value,
                })
              }
              className="bg-surface-raised p-2 rounded-xl"
            />

          </div>

        )

      }

    </div>
  );
}
