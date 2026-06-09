import {
  useState,
} from "react";

import {
  ANALYTICS_PERIODS,
  exportSalesCsv,
  exportSalesXlsx,
  exportMmAnalytics,
  exportSubscriptions,
  exportPendingSales,
} from "../../services/exportService";

import {
  SHEETS_SYNC_COLUMNS,
} from "../../constants/schedule";

const PERIOD_OPTIONS = [
  {
    value: ANALYTICS_PERIODS.TODAY,
    label: "Сегодня",
  },
  {
    value: ANALYTICS_PERIODS.WEEK,
    label: "7 дней",
  },
  {
    value: ANALYTICS_PERIODS.MONTH,
    label: "Месяц",
  },
  {
    value: ANALYTICS_PERIODS.CUSTOM,
    label: "Период",
  },
];

function ExportButton({
  label,
  description,
  icon,
  onClick,
  disabled,
  variant = "default",
}) {
  const variants = {
    default: "bg-slate-800 hover:bg-slate-700 border-slate-700",
    primary: "bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/40 text-cyan-100",
    green: "bg-green-500/20 hover:bg-green-500/30 border-green-500/40 text-green-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        text-left p-4 rounded-xl border
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        hover:scale-[1.01] active:scale-[0.99]
        ${variants[variant]}
      `}
    >
      <div className="flex items-start gap-3">

        <span className="text-2xl">

          {icon}

        </span>

        <div className="min-w-0">

          <div className="font-bold">

            {label}

          </div>

          <div className="text-slate-400 text-sm mt-1">

            {description}

          </div>

        </div>

      </div>

    </button>

  );
}

export default function ExportCenter() {
  const [period, setPeriod] = useState(
    ANALYTICS_PERIODS.MONTH
  );

  const [customStart, setCustomStart] =
    useState("");

  const [customEnd, setCustomEnd] =
    useState("");

  const [loadingKey, setLoadingKey] =
    useState(null);

  const [success, setSuccess] = useState(null);

  const [error, setError] = useState(null);

  const customRange = {
    start: customStart,
    end: customEnd,
  };

  async function runExport(
    key,
    handler
  ) {
    setLoadingKey(key);
    setError(null);
    setSuccess(null);

    try {
      const result = await handler();

      setSuccess({
        key,
        message:
          result.count !== undefined
            ? `Экспортировано: ${result.count} записей`
            : `Экспорт готов · ${result.range || ""}`,
      });
    } catch (exportError) {
      setError(
        exportError.message ||
        "Ошибка экспорта"
      );
    }

    setLoadingKey(null);
  }

  const isLoading = loadingKey !== null;

  return (
    <div className="bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-800">

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">

        <div>

          <h2 className="text-2xl font-bold">

            Export Center

          </h2>

          <p className="text-slate-400 text-sm mt-2 max-w-xl">

            Pilot mode: экспорт CSV / Excel без Cloud Functions и Google Cloud billing.
            Колонки продаж = Sync Table (17 полей).

          </p>

        </div>

        {

          success && (

            <div className="text-sm text-green-400 bg-green-500/10 px-4 py-2 rounded-xl border border-green-500/30">

              ✅ {success.message}

            </div>

          )

        }

      </div>

      {

        error && (

          <div className="mb-4 text-sm text-red-400 bg-red-500/10 px-4 py-3 rounded-xl border border-red-500/30">

            {error}

          </div>

        )

      }

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">

        {

          PERIOD_OPTIONS.map((option) => (

            <button
              key={option.value}
              type="button"
              onClick={() =>
                setPeriod(option.value)
              }
              className={`
                px-4 py-3 rounded-xl text-sm font-medium transition-colors
                ${
                  period === option.value
                    ? "bg-cyan-500/25 text-cyan-200 border border-cyan-500/40"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }
              `}
            >

              {option.label}

            </button>

          ))

        }

      </div>

      {

        period === ANALYTICS_PERIODS.CUSTOM && (

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">

            <input
              type="date"
              value={customStart}
              onChange={(e) =>
                setCustomStart(e.target.value)
              }
              className="bg-slate-800 p-3 rounded-xl"
            />

            <input
              type="date"
              value={customEnd}
              onChange={(e) =>
                setCustomEnd(e.target.value)
              }
              className="bg-slate-800 p-3 rounded-xl"
            />

          </div>

        )

      }

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">

        <ExportButton
          icon="📄"
          label="Экспорт продаж CSV"
          description="Sync Table · UTF-8 · Excel-ready"
          variant="primary"
          disabled={isLoading}
          onClick={() =>
            runExport("sales-csv", () =>
              exportSalesCsv({
                period,
                customRange,
              })
            )
          }
        />

        <ExportButton
          icon="📊"
          label="Экспорт продаж Excel"
          description="Лист Sync · .xlsx"
          variant="primary"
          disabled={isLoading}
          onClick={() =>
            runExport("sales-xlsx", () =>
              exportSalesXlsx({
                period,
                customRange,
              })
            )
          }
        />

        <ExportButton
          icon="📈"
          label="Экспорт MM Analytics"
          description="Summary, KPI, subscriptions, overdue"
          variant="green"
          disabled={isLoading}
          onClick={() =>
            runExport("mm-xlsx", () =>
              exportMmAnalytics({
                period,
                customRange,
                format: "xlsx",
              })
            )
          }
        />

        <ExportButton
          icon="📋"
          label="Экспорт подписок"
          description="Активные подписки + статусы"
          disabled={isLoading}
          onClick={() =>
            runExport("subs-xlsx", () =>
              exportSubscriptions({
                format: "xlsx",
              })
            )
          }
        />

        <ExportButton
          icon="⚡"
          label="Экспорт pending sales"
          description="Временные продажи команды"
          disabled={isLoading}
          onClick={() =>
            runExport("pending-xlsx", () =>
              exportPendingSales({
                format: "xlsx",
              })
            )
          }
        />

      </div>

      {

        isLoading && (

          <div className="flex items-center gap-3 text-slate-400 text-sm">

            <span className="inline-block w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />

            Подготовка файла...

          </div>

        )

      }

      <details className="mt-6 text-sm text-slate-500">

        <summary className="cursor-pointer hover:text-slate-300">

          Колонки Sync Table (17)

        </summary>

        <p className="mt-3 leading-relaxed">

          {SHEETS_SYNC_COLUMNS.join(" · ")}

        </p>

      </details>

    </div>

  );

}
