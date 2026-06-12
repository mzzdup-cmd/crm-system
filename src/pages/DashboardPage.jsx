import { Link } from "react-router-dom";

import {
  useState,
} from "react";

import LoadingState
from "../components/LoadingState";

import EmptyState
from "../components/ui/EmptyState";

import PageHeader
from "../components/ui/PageHeader";

import RealtimeIndicator
from "../components/ui/RealtimeIndicator";

import QuickSaleModal
from "../components/pendingSales/QuickSaleModal";

import { useDashboardRealtime }
from "../hooks/useRealtimeDashboard";

import { useNotifications }
from "../hooks/useNotifications";

import { usePendingSales }
from "../hooks/usePendingSales";

import { useOperationalRequests }
from "../hooks/useOperationalRequests";

import {
  getQuickSaleButtonLabel,
} from "../domain/pendingSales/pendingSalesLogic";

import { countActiveMissingVkReminders }
from "../services/missingVkReminderService";

import { usePermissions }
from "../hooks/usePermissions";

import { getRemain }
from "../domain/client/clientStatus";

import {
  resolveManagerDisplayName,
} from "../services/clientService";

import {
  getManagerNameById,
} from "../constants/managers";

import {
  SHIFT_START,
  SHIFT_END,
} from "../constants/schedule";

import PageErrorBoundary
from "../components/ui/PageErrorBoundary";

function StatCard({
  label,
  hint,
  value,
  color = "text-white",
  className = "",
}) {
  return (
    <div
      className={`
        bg-slate-900 p-5 md:p-6 rounded-2xl
        transition-transform duration-200
        hover:scale-[1.01]
        ${className}
      `}
    >
      <div className="font-semibold text-slate-200 text-sm">

        {label}

      </div>

      {hint && (
        <div className="text-slate-500 text-xs font-normal mt-0.5">
          {hint}
        </div>
      )}

      <div className={`text-2xl md:text-3xl font-bold mt-2 ${color}`}>

        {value}

      </div>

    </div>
  );
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("ru-RU")} ₽`;
}

function PersonalKpiCard({ kpi }) {
  return (
    <section className="bg-slate-900 p-5 md:p-6 rounded-2xl space-y-4">
      <div>
        <h2 className="text-xl font-bold">
          Мои KPI · {kpi.range.label.toLowerCase()}
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Все типы оплат: новые, доплаты, апсейлы, возвраты, legacy
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Выручка месяца"
          value={formatMoney(kpi.revenue)}
          color="text-green-400"
        />

        <StatCard
          label="Средний чек"
          value={formatMoney(kpi.averageCheck)}
          color="text-cyan-400"
        />

        <StatCard
          label="Количество продаж"
          value={kpi.deals}
        />

        <StatCard
          label={
            kpi.goalAchieved
              ? "Бонусная цель"
              : "До цели"
          }
          value={
            kpi.goalAchieved
              ? "Достигнута ✅"
              : formatMoney(kpi.remainingToGoal)
          }
          color={
            kpi.goalAchieved
              ? "text-green-400"
              : "text-amber-400"
          }
        />
      </div>
    </section>
  );
}

function OperationalRequestsCard({ summary }) {
  const pendingOwn =
    summary.pendingTimeOff.length +
    summary.pendingVacations.length;

  return (
    <section className="bg-slate-900 p-5 md:p-6 rounded-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">
          Отсутствия
        </h2>
        <Link
          to="/time-off"
          className="text-sm text-cyan-400 hover:underline"
        >
          Запросы →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Статус запросов"
          value={
            pendingOwn
              ? `${pendingOwn} на рассмотрении`
              : "Нет pending"
          }
          color={
            pendingOwn
              ? "text-amber-400"
              : "text-green-400"
          }
        />

        <StatCard
          label="Отпуск"
          value={
            summary.activeVacation
              ? `${summary.activeVacation.startDate} — ${summary.activeVacation.endDate}`
              : "—"
          }
          color="text-violet-400"
        />

        <StatCard
          label="Ближайшие выходные"
          value={
            summary.upcomingOffDays.length
              ? summary.upcomingOffDays.join(", ")
              : "—"
          }
        />
      </div>
    </section>
  );
}

function AdminOperationalCard({ summary }) {
  return (
    <section className="bg-slate-900 p-5 md:p-6 rounded-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">
          Отсутствия команды
        </h2>
        <Link
          to="/time-off"
          className="text-sm text-cyan-400 hover:underline"
        >
          Все запросы →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="На согласовании"
          hint="запросы отсутствия"
          value={summary.pendingTotal}
          color={
            summary.pendingTotal
              ? "text-amber-400"
              : "text-green-400"
          }
        />

        <StatCard
          label="Ближайшие отпуска"
          value={summary.approvedVacations.length}
          color="text-violet-400"
        />

        <StatCard
          label="Пересечения"
          value={
            summary.overlappingAbsences.length
              ? `${summary.overlappingAbsences.length} дат`
              : "Нет"
          }
          color={
            summary.overlappingAbsences.length
              ? "text-red-400"
              : "text-green-400"
          }
        />
      </div>

      {summary.overlappingAbsences.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm space-y-2">
          <div className="font-bold text-red-300">
            Пересекающиеся отсутствия
          </div>
          {summary.overlappingAbsences.slice(0, 5).map((item) => (
            <div key={item.date} className="text-slate-300">
              {item.date}:{" "}
              {item.managerIds
                .map((id) =>
                  getManagerNameById(id)
                )
                .join(", ")}
            </div>
          ))}
        </div>
      )}

      {summary.approvedVacations.length > 0 && (
        <div className="space-y-2 text-sm">
          {summary.approvedVacations.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="bg-slate-800/60 p-3 rounded-xl flex justify-between gap-3"
            >
              <span>
                {item.manager} · {item.startDate} — {item.endDate}
              </span>
              <span className="text-slate-500 shrink-0">
                {item.daysCount} дн.
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MotivationalLeaderBlock({
  leaderInfo,
}) {
  const { leader, isLeader, difference } =
    leaderInfo;

  if (!leader) {
    return null;
  }

  return (
    <section
      className="
        p-5 md:p-6 rounded-2xl
        bg-gradient-to-r from-violet-500/15 to-cyan-500/10
        border border-violet-500/30
        space-y-3
      "
    >
      {isLeader ? (
        <>
          <div className="text-2xl font-bold">
            Поздравляем 🎉
          </div>
          <div className="text-lg text-green-300">
            Сейчас у вас самая большая выручка:{" "}
            <strong>
              {formatMoney(leader.revenue)}
            </strong>
          </div>
          <div className="text-slate-300">
            Вы лидер месяца 🔥
          </div>
        </>
      ) : (
        <>
          <div className="text-lg text-slate-200">
            Сейчас лидер месяца —{" "}
            <strong>{leader.name}</strong>:{" "}
            {formatMoney(leader.revenue)}
          </div>
          <div className="text-2xl font-bold text-amber-300">
            До лидерства осталось:{" "}
            {formatMoney(difference)}
          </div>
          <div className="text-slate-300">
            У тебя есть все шансы обогнать 🔥
          </div>
        </>
      )}
    </section>
  );
}

export default function DashboardPage() {
  return (
    <PageErrorBoundary title="Главная">
      <DashboardPageContent />
    </PageErrorBoundary>
  );
}

function DashboardPageContent() {
  const { isAdmin, isManager, displayName } =
    usePermissions();

  const {
    payments,
    summary,
    schedule,
    initialLoading,
    connected,
    today,
  } = useDashboardRealtime();

  const {
    pendingCount,
    canQuickSale,
    coveringTargets,
  } = usePendingSales();

  const {
    summary: requestsSummary,
  } = useOperationalRequests();

  const quickSaleLabel =
    getQuickSaleButtonLabel(coveringTargets);

  const { notifications } =
    useNotifications();

  const missingVkCount =
    countActiveMissingVkReminders(
      notifications
    );

  const todayPaymentsCount =
    payments.filter(
      (payment) =>
        payment.paymentDate === today
    ).length;

  const [quickSaleOpen, setQuickSaleOpen] =
    useState(false);

  if (initialLoading) {
    return (
      <LoadingState message="Загрузка главной..." />
    );
  }

  const leaderboard =
    summary.leaderInfo?.leaderboard || [];

  const personalKpi =
    summary.personalKpi;

  return (
    <div className="space-y-8 animate-fade-in">

      <PageHeader
        title="Главная"
        subtitle={
          <>
            <span>{today}</span>
            <span className="text-slate-500 text-sm font-normal ml-2">
              сводка дня
            </span>
            <RealtimeIndicator connected={connected} />
          </>
        }
        actions={
          canQuickSale && (

            <button
              type="button"
              onClick={() => setQuickSaleOpen(true)}
              className="
                px-4 py-2.5 rounded-xl font-bold text-sm
                bg-cyan-500 hover:bg-cyan-400 transition-colors
              "
            >

              {quickSaleLabel}

            </button>

          )
        }
      />

      {

        pendingCount > 0 && (

          <Link
            to="/pending-sales"
            className="
              block p-5 rounded-2xl
              bg-gradient-to-r from-cyan-500/20 to-green-500/10
              border border-cyan-500/40
              hover:border-cyan-400/60 transition-all
            "
          >

            <div className="flex flex-wrap items-center justify-between gap-3">

              <div>

                <div className="text-lg font-bold text-cyan-300">

                  {

                    pendingCount === 1
                      ? "У вас новая быстрая продажа"
                      : `У вас ${pendingCount} новых быстрых продаж`

                  }

                </div>

                <div className="text-slate-400 text-sm mt-1">

                  Подтвердите и оформите оплату →

                </div>

              </div>

              <div className="text-3xl font-bold text-cyan-400">

                {pendingCount}

              </div>

            </div>

          </Link>

        )

      }

      {

        isAdmin &&
        requestsSummary.pendingTotal > 0 && (

          <Link
            to="/time-off"
            className="
              block p-5 rounded-2xl
              bg-gradient-to-r from-amber-500/20 to-orange-500/10
              border border-amber-500/40
              hover:border-amber-400/60 transition-all
            "
          >

            <div className="flex flex-wrap items-center justify-between gap-3">

              <div>

                <div className="text-lg font-bold text-amber-300">

                  Запросы на рассмотрении

                </div>

                <div className="text-slate-400 text-sm mt-1">

                  Выходные и отпуска →

                </div>

              </div>

              <div className="text-3xl font-bold text-amber-400">

                {requestsSummary.pendingTotal}

              </div>

            </div>

          </Link>

        )

      }

      {

        isAdmin && summary.failedSyncCount > 0 && (

            <Link
              to="/management"
              className="
                px-4 py-2 rounded-xl
                bg-red-500/20 text-red-300
                hover:bg-red-500/30 transition-colors text-sm
              "
            >

              {summary.failedSyncCount} ошибок синхронизации

            </Link>

          )

      }

      {

        isManager && displayName && (

          <section className="bg-slate-900 p-5 md:p-6 rounded-2xl space-y-6">

            <div>

              <div className="text-2xl font-bold">

                Доброго дня, {displayName}

              </div>

              <div className="text-slate-400 mt-1 text-sm">

                Ваши задачи на сегодня

              </div>

            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

              <Link to="/notifications">
                <StatCard
                  label="Не заполнен VK"
                  value={missingVkCount}
                  color="text-amber-400"
                  className="h-full hover:bg-slate-800 transition-colors"
                />
              </Link>

              <Link to="/pending-sales">
                <StatCard
                  label="Черновики продаж"
                  hint="ожидают проведения"
                  value={pendingCount}
                  color="text-cyan-400"
                  className="h-full hover:bg-slate-800 transition-colors"
                />
              </Link>

              <Link to="/subscriptions">
                <StatCard
                  label="Просрочки"
                  value={
                    summary.tasks.overdue
                      .length
                  }
                  color="text-red-400"
                  className="h-full hover:bg-slate-800 transition-colors"
                />
              </Link>

              <Link to="/payments">
                <StatCard
                  label="Сегодняшние оплаты"
                  value={todayPaymentsCount}
                  color="text-green-400"
                  className="h-full hover:bg-slate-800 transition-colors"
                />
              </Link>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

              <StatCard
                label="Смена"
                value={
                  summary.shiftInfo?.isOff
                    ? "Выходной"
                    : `${SHIFT_START}–${SHIFT_END}`
                }
              />

              <StatCard
                label="Нагрузка трафика"
                hint="ваша доля потока"
                value={
                  summary.trafficLoad
                    ? `${Math.round(summary.trafficLoad.share * 100)}%`
                    : "—"
                }
                color="text-cyan-400"
              />

              <StatCard
                label="Задачи сегодня"
                value={summary.tasks.total}
                color="text-yellow-400"
              />

              <StatCard
                label="Просрочки"
                value={summary.tasks.overdue.length}
                color="text-red-400"
              />

            </div>

            {

              summary.tasks.total > 0 && (

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                  {

                    summary.tasks.dueToday.length > 0 && (

                      <div className="bg-slate-800/60 p-4 rounded-xl">

                        <div className="text-yellow-400 font-bold mb-3">

                          Оплата сегодня

                        </div>

                        <div className="space-y-2">

                          {

                            summary.tasks.dueToday.slice(0, 5).map((client) => (

                              <Link
                                key={client.id}
                                to={`/client/${client.id}`}
                                className="block text-sm hover:text-cyan-300"
                              >

                                {client.name || client.course} · {client.debt} ₽

                              </Link>

                            ))

                          }

                        </div>

                      </div>

                    )

                  }

                  {

                    summary.tasks.dueTomorrow.length > 0 && (

                      <div className="bg-slate-800/60 p-4 rounded-xl">

                        <div className="text-slate-300 font-bold mb-3">

                          Оплата завтра

                        </div>

                        <div className="space-y-2">

                          {

                            summary.tasks.dueTomorrow.slice(0, 5).map((client) => (

                              <Link
                                key={client.id}
                                to={`/client/${client.id}`}
                                className="block text-sm hover:text-cyan-300"
                              >

                                {client.name || client.course} · {client.debt} ₽

                              </Link>

                            ))

                          }

                        </div>

                      </div>

                    )

                  }

                  {

                    summary.tasks.overdue.length > 0 && (

                      <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/30">

                        <div className="text-red-400 font-bold mb-3">

                          Просрочено

                        </div>

                        <div className="space-y-2">

                          {

                            summary.tasks.overdue.slice(0, 5).map((client) => (

                              <Link
                                key={client.id}
                                to={`/client/${client.id}`}
                                className="block text-sm hover:text-red-300"
                              >

                                {client.name || client.course} · {client.daysOverdue} дн. · {client.debt} ₽

                              </Link>

                            ))

                          }

                        </div>

                      </div>

                    )

                  }

                </div>

              )

            }

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

              <StatCard
                label="Подписки"
                value={summary.subscriptions}
              />

              <StatCard
                label="Работаете за"
                value={
                  summary.shiftInfo?.coveringFor
                    ? getManagerNameById(summary.shiftInfo.coveringFor)
                    : "—"
                }
              />

              <StatCard
                label="Активных подписок"
                value={summary.activeSubscriptions.length}
                color="text-cyan-400"
              />

            </div>

            {personalKpi && (
              <PersonalKpiCard kpi={personalKpi} />
            )}

            <OperationalRequestsCard
              summary={requestsSummary}
            />

            {summary.leaderInfo && (
              <MotivationalLeaderBlock
                leaderInfo={summary.leaderInfo}
              />
            )}

          </section>

        )

      }

      {

        isAdmin && (

          <section className="bg-slate-900 p-5 md:p-6 rounded-2xl space-y-4">

            <div className="flex items-center justify-between">

              <h2 className="text-xl font-bold">

                Команда · Live

              </h2>

              <Link
                to="/management"
                className="text-sm text-cyan-400 hover:text-cyan-300"
              >

                Управление →

              </Link>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

              <StatCard
                label="Выручка месяца"
                value={formatMoney(summary.totalRevenue)}
                color="text-green-400"
              />

              <StatCard
                label="Активных менеджеров"
                value={summary.activeManagers.length}
                color="text-cyan-400"
              />

              <StatCard
                label="Просрочки"
                value={summary.overdueClients.length}
                color="text-red-400"
              />

              <StatCard
                label="Ошибки выгрузки"
                hint="сбои sync в Sheets"
                value={summary.failedSyncCount}
                color={
                  summary.failedSyncCount
                    ? "text-orange-400"
                    : "text-green-400"
                }
              />

            </div>

            {

              summary.teamLoad.length > 0 && (

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

                  {

                    summary.teamLoad.map((item) => (

                      <div
                        key={item.managerId}
                        className="bg-slate-800 p-3 rounded-xl flex justify-between text-sm"
                      >

                        <span>

                          {getManagerNameById(item.managerId)}

                        </span>

                        <span className="text-cyan-400">

                          {Math.round(item.share * 100)}%

                        </span>

                      </div>

                    ))

                  }

                </div>

              )

            }

            <AdminOperationalCard
              summary={requestsSummary}
            />

          </section>

        )

      }

      {isAdmin && (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">

        <StatCard
          label="Выручка месяца"
          value={formatMoney(summary.totalRevenue)}
          color="text-green-400"
        />

        <StatCard
          label="Сделки месяца"
          value={summary.totalDeals}
        />

        <StatCard
          label="Подписки"
          value={summary.subscriptions}
          color="text-yellow-400"
        />

        <StatCard
          label="Средний чек"
          value={formatMoney(summary.averageCheck)}
          color="text-cyan-400"
        />

      </div>
      )}

      <section>

        <h2 className="text-xl md:text-2xl font-bold mb-4 text-red-400">

          Просроченные подписки

        </h2>

        {

          summary.overdueClients.length === 0

            ? (

              <EmptyState
                icon="✅"
                title="Просрочек нет"
                description="Все подписки оплачены вовремя."
              />

            )

            : (

              <div className="space-y-3">

                {

                  summary.overdueClients.map((client) => (

                    <Link
                      key={client.id}
                      to={`/client/${client.id}`}
                      className="
                        block bg-slate-900 p-4 rounded-2xl
                        flex justify-between items-center
                        hover:bg-slate-800 transition-colors
                      "
                    >

                      <div>

                        <div className="font-bold">

                          {client.name || client.manager || "Клиент"}

                        </div>

                        <div className="text-slate-400 text-sm mt-1">

                          {client.course} · {client.manager}

                        </div>

                      </div>

                      <div className="text-right">

                        <div className="text-red-400 font-bold">

                          Просрочка

                        </div>

                        <div className="text-sm text-slate-400 mt-1">

                          {getRemain(client)} ₽

                        </div>

                      </div>

                    </Link>

                  ))

                }

              </div>

            )

        }

      </section>

      {isAdmin && (
      <section>

        <h2 className="text-xl md:text-2xl font-bold mb-4">

          LIVE FEED

        </h2>

        {

          payments.length === 0

            ? (

              <EmptyState
                icon="💳"
                title="Платежей пока нет"
                description="Новые оплаты появятся здесь в realtime."
              />

            )

            : (

              <div className="space-y-3">

                {

                  payments.slice(0, 10).map((payment) => (

                    <div
                      key={payment.id}
                      className="
                        bg-slate-900 p-4 rounded-2xl
                        hover:bg-slate-800/80 transition-colors
                      "
                    >

                      <div className="font-bold">

                        {payment.clientName}

                      </div>

                      <div className="text-slate-400 mt-1 text-sm">

                        {payment.dealType} — {payment.amount} ₽

                      </div>

                    </div>

                  ))

                }

              </div>

            )

        }

      </section>
      )}

      {isAdmin && (
      <section>

        <h2 className="text-xl md:text-2xl font-bold mb-4">

          Leaderboard · месяц

        </h2>

        <div className="space-y-3">

          {

            leaderboard.map((stats, index) => (

              <div
                key={stats.managerKey}
                className="
                  bg-slate-900 p-5 rounded-2xl
                  flex justify-between items-center
                  hover:bg-slate-800/80 transition-colors
                "
              >

                <div className="flex items-center gap-4">

                  <div className="text-2xl">

                    {

                      index === 0 ? "🥇"
                        : index === 1 ? "🥈"
                        : index === 2 ? "🥉"
                        : "🏅"

                    }

                  </div>

                  <div>

                    <div className="text-lg font-bold">

                      {resolveManagerDisplayName(stats.name)}

                    </div>

                    <div className="text-slate-400 text-sm">

                      Сделок: {stats.deals}

                    </div>

                  </div>

                </div>

                <div className="text-xl font-bold text-yellow-400">

                  {formatMoney(stats.revenue)}

                </div>

              </div>

            ))

          }

        </div>

      </section>
      )}

      <QuickSaleModal
        open={quickSaleOpen}
        onClose={() => setQuickSaleOpen(false)}
        schedule={schedule}
        coveringTargets={coveringTargets}
      />

    </div>

  );
}
