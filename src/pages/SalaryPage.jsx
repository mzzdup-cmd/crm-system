import { usePageLoad }
from "../hooks/usePageLoad";

import {
  getSalaryReportForUser,
} from "../services/paymentService";

import PageHeader
from "../components/ui/PageHeader";

import EmptyState
from "../components/ui/EmptyState";

import ListPageSkeleton
from "../components/ui/ListPageSkeleton";

function LoadErrorState({
  message,
  timedOut,
  onRetry,
}) {
  return (
    <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-2xl space-y-4">
      <div className="text-red-300 font-semibold">
        {timedOut
          ? "Загрузка занимает слишком много времени"
          : "Не удалось загрузить зарплаты"}
      </div>
      <p className="text-sm text-slate-400">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="
          px-4 py-2 rounded-xl
          bg-red-600 hover:bg-red-700
          font-semibold text-sm
        "
      >
        Повторить
      </button>
    </div>
  );
}

export default function SalaryPage() {
  const {
    data: salaryData,
    loading,
    error,
    timedOut,
    reload,
  } = usePageLoad(getSalaryReportForUser);

  const rows = salaryData || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Зарплаты"
        subtitle={
          loading
            ? "Загрузка..."
            : `${rows.length} менеджер(ов)`
        }
      />

      {loading && (
        <ListPageSkeleton rows={3} />
      )}

      {!loading && error && (
        <LoadErrorState
          message={error}
          timedOut={timedOut}
          onRetry={reload}
        />
      )}

      {!loading &&
        !error &&
        rows.length === 0 && (
          <EmptyState
            icon="💰"
            title="Нет данных по зарплате"
            description="Данные появятся после первых оплат."
          />
        )}

      {!loading &&
        !error &&
        rows.length > 0 && (
          <div className="space-y-6">
            {rows.map((manager) => (
              <div
                key={manager.managerKey}
                className="
                  bg-slate-900 p-5 md:p-6 rounded-2xl
                  hover:bg-slate-800/80 transition-colors
                "
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div>
                    <div className="text-2xl md:text-3xl font-bold">
                      {manager.name}
                    </div>
                    <div className="text-slate-400 mt-2 text-sm">
                      Выручка:{" "}
                      {manager.revenue.toLocaleString(
                        "ru-RU"
                      )}{" "}
                      ₽ · сделок:{" "}
                      {manager.deals || 0}
                    </div>
                  </div>

                  <div className="text-3xl md:text-4xl font-bold text-green-400">
                    {manager.totalSalary.toLocaleString(
                      "ru-RU"
                    )}{" "}
                    ₽
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
                  <div className="bg-slate-800 p-4 rounded-xl">
                    <div className="text-slate-400 text-sm">
                      Оклад
                    </div>
                    <div className="text-xl font-bold mt-2">
                      {manager.baseSalary.toLocaleString(
                        "ru-RU"
                      )}{" "}
                      ₽
                    </div>
                  </div>

                  <div className="bg-slate-800 p-4 rounded-xl">
                    <div className="text-slate-400 text-sm">
                      5% от продаж
                    </div>
                    <div className="text-xl font-bold mt-2">
                      {manager.percentBonus.toLocaleString(
                        "ru-RU"
                      )}{" "}
                      ₽
                    </div>
                  </div>

                  <div className="bg-slate-800 p-4 rounded-xl">
                    <div className="text-slate-400 text-sm">
                      Бонус оборота
                    </div>
                    <div className="text-xl font-bold mt-2 text-yellow-400">
                      {manager.revenueBonus.toLocaleString(
                        "ru-RU"
                      )}{" "}
                      ₽
                    </div>
                  </div>

                  <div className="bg-slate-800 p-4 rounded-xl">
                    <div className="text-slate-400 text-sm">
                      Ночные смены
                    </div>
                    <div className="text-xl font-bold mt-2 text-cyan-400">
                      {manager.nightBonus.toLocaleString(
                        "ru-RU"
                      )}{" "}
                      ₽
                    </div>
                  </div>

                  <div className="bg-slate-800 p-4 rounded-xl">
                    <div className="text-slate-400 text-sm">
                      Ручные бонусы
                    </div>
                    <div className="text-xl font-bold mt-2 text-pink-400">
                      {manager.manualBonus.toLocaleString(
                        "ru-RU"
                      )}{" "}
                      ₽
                    </div>
                  </div>

                  <div className="bg-green-500/20 p-4 rounded-xl border border-green-500/40">
                    <div className="text-green-400 text-sm">
                      ИТОГО
                    </div>
                    <div className="text-2xl font-bold mt-2 text-green-400">
                      {manager.totalSalary.toLocaleString(
                        "ru-RU"
                      )}{" "}
                      ₽
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
