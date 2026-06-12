import LoadingState
from "../components/LoadingState";

import AnalyticsCard
from "../components/analytics/AnalyticsCard";

import PeriodFilter
from "../components/analytics/PeriodFilter";

import {
  RevenueLineChart,
  ManagerBarChart,
  DealsPieChart,
  TrafficLoadChart,
  SubscriptionChart,
  ManagerKpiChart,
} from "../components/analytics/AnalyticsCharts";

import {
  useAdminAnalytics,
} from "../hooks/useAdminAnalytics";

import {
  useAdminAnalyticsSummary,
} from "../hooks/useRealtimeDashboard";

import SectionHeading
from "../components/ui/SectionHeading";

import RealtimeIndicator
from "../components/ui/RealtimeIndicator";

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("ru-RU")} ₽`;
}

export default function AdminAnalyticsPage() {

  const {
    data,
    loading,
    period,
    setPeriod,
    customRange,
    setCustomRange,
  } = useAdminAnalytics();

  const {
    summary: liveSummary,
    connected,
  } = useAdminAnalyticsSummary();

  if (loading || !data) {

    return (
      <LoadingState message="Загрузка аналитики..." />
    );

  }

  const { summary } = data;

  return (

    <div className="space-y-8">

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">

          <div className="font-semibold text-slate-200 text-xs flex items-center gap-2">

            Выручка live

            <RealtimeIndicator connected={connected} />

          </div>

          <div className="text-slate-500 text-[11px] font-normal mt-0.5">

            сейчас в CRM

          </div>

          <div className="text-lg font-bold text-green-400 mt-1">

            {formatMoney(liveSummary.revenue)}

          </div>

        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">

          <div className="font-semibold text-slate-200 text-xs">

            Просрочки live

          </div>

          <div className="text-slate-500 text-[11px] font-normal mt-0.5">

            неоплаченные клиенты

          </div>

          <div className="text-lg font-bold text-red-400 mt-1">

            {liveSummary.overdue}

          </div>

        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">

          <div className="font-semibold text-slate-200 text-xs">

            Сделок

          </div>

          <div className="text-slate-500 text-[11px] font-normal mt-0.5">

            за период

          </div>

          <div className="text-lg font-bold mt-1">

            {liveSummary.deals}

          </div>

        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">

          <div className="font-semibold text-slate-200 text-xs">

            Свежие оплаты

          </div>

          <div className="text-slate-500 text-[11px] font-normal mt-0.5">

            недавние поступления

          </div>

          <div className="text-lg font-bold text-cyan-400 mt-1">

            {formatMoney(liveSummary.recentRevenue)}

          </div>

        </div>

      </div>

      <div className="flex flex-wrap justify-between gap-4 items-start">

        <div>

          <h1 className="text-4xl font-bold">

            MM Аналитика

          </h1>

          <p className="text-slate-400 mt-2">

            Панель руководителя · {data.range.label}

          </p>

        </div>

        <div className="text-right text-sm text-slate-400">

          <div>

            Успешность sync:

            {" "}

            {data.syncOverview.successRate}%

          </div>

          <div>

            Записей в Sheets:

            {" "}

            {data.syncOverview.total}

          </div>

        </div>

      </div>

      <PeriodFilter
        period={period}
        customRange={customRange}
        onPeriodChange={setPeriod}
        onCustomRangeChange={setCustomRange}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">

        <AnalyticsCard
          title="Общая выручка"
          value={formatMoney(summary.totalRevenue)}
          accent="text-green-400"
        />

        <AnalyticsCard
          title="Сделки"
          value={summary.totalDeals}
          accent="text-white"
        />

        <AnalyticsCard
          title="Средний чек"
          value={formatMoney(summary.averageCheck)}
          accent="text-cyan-400"
        />

        <AnalyticsCard
          title="Просрочки"
          value={summary.overdueCount}
          subtitle={formatMoney(summary.overdueAmount)}
          accent="text-red-400"
        />

      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">

        <AnalyticsCard
          title="Новые"
          value={summary.newDeals}
          subtitle={formatMoney(summary.newRevenue)}
        />

        <AnalyticsCard
          title="Доплаты"
          value={summary.topups}
          subtitle={formatMoney(summary.topupRevenue)}
        />

        <AnalyticsCard
          title="Апсэйлы"
          value={summary.upsells}
          subtitle={formatMoney(summary.upsellRevenue)}
        />

        <AnalyticsCard
          title="Подписки"
          value={summary.subscriptions}
          accent="text-yellow-400"
        />

      </div>

      <div className="grid grid-cols-2 gap-4">

        <AnalyticsCard
          title="VIP"
          value={formatMoney(summary.vipRevenue)}
          accent="text-pink-400"
        />

        <AnalyticsCard
          title="Базовый"
          value={formatMoney(summary.baseRevenue)}
          accent="text-purple-400"
        />

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {

          data.topManagers.map((item) => (

            <div
              key={item.key}
              className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl border border-cyan-500/20"
            >

              <div className="text-cyan-400 font-bold">

                {item.label}

              </div>

              <div className="text-2xl font-bold mt-3">

                {

                  item.leader?.name ||
                  "—"

                }

              </div>

              <div className="text-green-400 mt-2">

                {

                  formatMoney(
                    item.leader?.revenue || 0
                  )

                }

              </div>

              <div className="text-slate-400 text-sm mt-2">

                Сделок:

                {" "}

                {item.leader?.deals || 0}

              </div>

            </div>

          ))

        }

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        <div className="bg-slate-900 p-6 rounded-2xl">

          <SectionHeading
            title="Динамика выручки"
            hint="по дням периода"
            className="mb-4"
          />

          <RevenueLineChart
            data={data.charts.revenueLine}
          />

        </div>

        <div className="bg-slate-900 p-6 rounded-2xl">

          <SectionHeading
            title="Выручка по менеджерам"
            hint="сравнение команды"
            className="mb-4"
          />

          <ManagerBarChart
            data={data.charts.managerBars}
          />

        </div>

        <div className="bg-slate-900 p-6 rounded-2xl">

          <SectionHeading
            title="Структура сделок"
            hint="новые, доплаты, апсейлы"
            className="mb-4"
          />

          <DealsPieChart
            data={data.charts.dealPie}
          />

        </div>

        <div className="bg-slate-900 p-6 rounded-2xl">

          <SectionHeading
            title="Подписки и просрочки"
            hint="активные и должники"
            className="mb-4"
          />

          <SubscriptionChart
            data={data.charts.subscriptionSplit}
          />

        </div>

        <div className="bg-slate-900 p-6 rounded-2xl">

          <SectionHeading
            title="Нагрузка трафика"
            hint="распределение потока"
            className="mb-4"
          />

          <TrafficLoadChart
            data={data.charts.trafficLoad}
          />

        </div>

        <div className="bg-slate-900 p-6 rounded-2xl">

          <SectionHeading
            title="KPI менеджеров"
            hint="сделки по типам"
            className="mb-4"
          />

          <ManagerKpiChart
            data={data.charts.managerKpi}
          />

        </div>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        <div className="bg-slate-900 p-6 rounded-2xl">

          <h2 className="text-2xl font-bold mb-4">

            Рейтинг менеджеров

          </h2>

          <div className="space-y-3">

            {

              data.managerRanking.map(
                (manager) => (

                  <div
                    key={manager.managerKey}
                    className="bg-slate-800 p-4 rounded-xl flex justify-between items-center"
                  >

                    <div className="flex items-center gap-4">

                      <div className="text-2xl">

                        #{manager.rank}

                      </div>

                      <div>

                        <div className="font-bold">

                          {manager.name}

                        </div>

                        <div className="text-slate-400 text-sm mt-1">

                          Сделок: {manager.deals}

                          {" · "}

                          VIP: {formatMoney(manager.vipRevenue)}

                          {" · "}

                          Доплаты: {manager.topups}

                          {" · "}

                          Апсэйлы: {manager.upsells}

                        </div>

                      </div>

                    </div>

                    <div className="text-right">

                      <div className="text-green-400 font-bold">

                        {formatMoney(manager.revenue)}

                      </div>

                      <div className="text-slate-400 text-sm">

                        Средний чек: {formatMoney(manager.averageCheck)}

                      </div>

                    </div>

                  </div>

                )
              )

            }

          </div>

        </div>

        <div className="bg-slate-900 p-6 rounded-2xl">

          <h2 className="text-2xl font-bold mb-4">

            Выручка по курсам

          </h2>

          <div className="space-y-3">

            {

              data.courseStats.map(
                (course) => (

                  <div
                    key={course.course}
                    className="bg-slate-800 p-4 rounded-xl flex justify-between"
                  >

                    <div>

                      {course.course}

                      <div className="text-slate-400 text-sm mt-1">

                        {course.deals} сделок

                      </div>

                    </div>

                    <div className="text-green-400 font-bold">

                      {formatMoney(course.revenue)}

                    </div>

                  </div>

                )
              )

            }

          </div>

        </div>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        <div className="bg-slate-900 p-6 rounded-2xl">

          <SectionHeading
            title="Обзор смен"
            hint="кто работает сегодня"
            size="lg"
            className="mb-4"
          />

          <div className="grid grid-cols-2 gap-4 mb-4">

            <AnalyticsCard
              title="Трафик сегодня"
              hint="количество лидов"
              value={data.management.trafficAmount}
            />

            <AnalyticsCard
              title="На смене"
              hint="менеджеры сейчас"
              value={data.management.working.length}
            />

          </div>

          <div className="space-y-3">

            {

              data.management.working.map(
                (item) => (

                  <div
                    key={item.managerId}
                    className="bg-slate-800 p-4 rounded-xl"
                  >

                    <div className="font-bold">

                      {item.name}

                    </div>

                    <div className="text-slate-400 text-sm mt-1">

                      {

                        item.coveringFor

                          ? `Заменяет: ${item.coveringFor}`

                          : "Основная смена"

                      }

                      {" · "}

                      Трафик:

                      {" "}

                      {Math.round(
                        (item.trafficShare || 0) * 100
                      )}

                      %

                    </div>

                  </div>

                )
              )

            }

          </div>

          {

            data.management.offDays.length > 0 && (

              <div className="mt-4">

                <div className="text-slate-400 mb-2">

                  Выходные сегодня

                </div>

                <div className="flex flex-wrap gap-2">

                  {

                    data.management.offDays.map(
                      (item) => (

                        <span
                          key={item.managerId}
                          className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm"
                        >

                          {item.name}

                        </span>

                      )
                    )

                  }

                </div>

              </div>

            )

          }

        </div>

        <div className="bg-slate-900 p-6 rounded-2xl">

          <h2 className="text-2xl font-bold mb-4">

            Зарплаты менеджеров

          </h2>

          <div className="space-y-3">

            {

              data.salaryReport.map(
                (item) => (

                  <div
                    key={item.managerKey}
                    className="bg-slate-800 p-4 rounded-xl flex justify-between"
                  >

                    <div>

                      <div className="font-bold">

                        {item.name}

                      </div>

                      <div className="text-slate-400 text-sm mt-1">

                        Выручка: {formatMoney(item.revenue)}

                      </div>

                    </div>

                    <div className="text-green-400 font-bold text-xl">

                      {formatMoney(item.totalSalary)}

                    </div>

                  </div>

                )
              )

            }

          </div>

        </div>

      </div>

      <div className="bg-slate-900 p-6 rounded-2xl">

        <h2 className="text-2xl font-bold mb-4">

          Просрочки по менеджерам

        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">

          {

            data.subscriptionStats.byManager.map(
              (item) => (

                <div
                  key={item.managerKey}
                  className="bg-slate-800 p-4 rounded-xl flex justify-between"
                >

                  <div>

                    {item.name}

                    <div className="text-slate-400 text-sm mt-1">

                      {item.count} клиентов

                    </div>

                  </div>

                  <div className="text-red-400 font-bold">

                    {formatMoney(item.amount)}

                  </div>

                </div>

              )
            )

          }

          {

            !data.subscriptionStats.byManager.length && (

              <div className="text-slate-400">

                Просрочек нет

              </div>

            )

          }

        </div>

      </div>

    </div>

  );

}
