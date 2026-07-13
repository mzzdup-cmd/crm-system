import { Link } from "react-router-dom";

import {
  useState,
  useMemo,
  useEffect,
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

import { usePendingSales }
from "../hooks/usePendingSales";

import { useOperationalRequests }
from "../hooks/useOperationalRequests";

import {
  formatVacationRangeLabel,
} from "../domain/schedule/timeOffDates";

import {
  getQuickSaleButtonLabel,
} from "../domain/pendingSales/pendingSalesLogic";

import { countClientsMissingVk, syncMissingVkRemindersForUser, syncMissingVkResolutionForUser }
from "../services/missingVkReminderService";

import { useAuth }
from "../context/AuthContext";

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

import {
  getTodayReplacementSummary,
  splitShiftIntoSlots,
  QUINTET_MANAGER_IDS,
} from "../domain/calendar/replacementLogic";

import {
  updateManagerShiftSlot,
} from "../services/scheduleService";

import {
  getCuratorStartsTodayItems,
  getPlannedTopupsSummary,
  countTodayPaymentsForUser,
} from "../domain/dashboard/dayPlanInsights";

import PageErrorBoundary
from "../components/ui/PageErrorBoundary";

function TodayReplacementBanner({
  replacement,
  today,
  managerId,
  slotCount = 4,
  onSlotSaved,
}) {
  const [saving, setSaving] = useState(false);
  const slotOptions = splitShiftIntoSlots(slotCount);

  async function handleSlotSelect(start, end) {
    setSaving(true);

    try {
      await updateManagerShiftSlot({
        date: today,
        managerId,
        start,
        end,
      });
      onSlotSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="bg-violet-500/15 border border-violet-500/40 p-5 md:p-6 rounded-2xl space-y-3">
      <div className="text-lg font-bold text-violet-200">
        Сегодня вы работаете за {replacement.names}
      </div>
      <div className="text-violet-100/90">
        Часы смены: {replacement.hours}
      </div>

      {replacement.splitCover && (
        <div className="space-y-2">
          <div className="text-sm text-violet-200/80">
            Выберите свой временной слот:
          </div>
          <div className="flex flex-wrap gap-2">
            {slotOptions.map((slot) => (
              <button
                key={`${slot.start}-${slot.end}`}
                type="button"
                disabled={saving}
                onClick={() =>
                  handleSlotSelect(
                    slot.start,
                    slot.end
                  )
                }
                className={`
                  px-3 py-1.5 rounded-lg text-sm border transition-colors
                  ${
                    replacement.shiftStart === slot.start &&
                    replacement.shiftEnd === slot.end
                      ? "bg-violet-500/40 border-violet-300 text-white"
                      : "bg-slate-900/60 border-violet-500/30 text-violet-100 hover:bg-violet-500/20"
                  }
                `}
              >
                {slot.start}–{slot.end}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

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

function AbsenceDateChip({
  title,
  subtitle,
  tone = "day_off",
}) {
  const toneClass =
    tone === "vacation"
      ? "border-violet-500/40 bg-violet-500/10"
      : "border-slate-700 bg-slate-800/80";

  return (
    <div
      className={`
        inline-flex flex-col
        rounded-xl border px-3 py-2
        min-w-[108px] max-w-[160px]
        ${toneClass}
      `}
    >
      <span className="text-sm font-semibold text-slate-100 leading-tight">
        {title}
      </span>
      {subtitle && (
        <span className="text-xs text-slate-400 mt-0.5 capitalize">
          {subtitle}
        </span>
      )}
    </div>
  );
}

function OperationalRequestsCard({ summary }) {
  const pendingOwn =
    summary.pendingTimeOff.length +
    summary.pendingVacations.length;

  const displayVacation =
    summary.activeVacation ||
    summary.nextVacation;

  const vacationChip = displayVacation
    ? {
        title:
          displayVacation.title ||
          formatVacationRangeLabel(
            displayVacation.startDate,
            displayVacation.endDate
          ),
        subtitle: summary.activeVacation
          ? "сейчас"
          : "отпуск",
      }
    : null;

  const dayOffs =
    summary.upcomingAbsences?.dayOffs ||
    [];

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

        <div className="bg-slate-900 p-5 md:p-6 rounded-2xl">
          <div className="font-semibold text-slate-200 text-sm">
            Отпуск
          </div>
          <div className="mt-3">
            {vacationChip ? (
              <AbsenceDateChip
                tone="vacation"
                title={vacationChip.title}
                subtitle={vacationChip.subtitle}
              />
            ) : (
              <span className="text-2xl font-bold text-slate-500">
                —
              </span>
            )}
          </div>
        </div>

        <div className="bg-slate-900 p-5 md:p-6 rounded-2xl">
          <div className="font-semibold text-slate-200 text-sm">
            Ближайшие выходные
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {dayOffs.length ? (
              dayOffs.map((item) => (
                <AbsenceDateChip
                  key={item.date}
                  title={item.title}
                  subtitle={item.subtitle}
                />
              ))
            ) : (
              <span className="text-2xl font-bold text-slate-500">
                —
              </span>
            )}
          </div>
        </div>
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
  const {
    current,
    isLeader,
    teamAverageRevenue,
  } = leaderInfo;

  const myRevenue =
    current?.revenue || 0;

  return (
    <section
      className="
        p-5 md:p-6 rounded-2xl
        bg-gradient-to-r from-violet-500/15 to-cyan-500/10
        border border-violet-500/30
        space-y-2
      "
    >
      {isLeader ? (
        <>
          <div className="text-lg font-bold text-green-300">
            Поздравляю, вы лидер!
          </div>
          <div className="text-slate-300">
            У вас самая большая выручка:{" "}
            <strong className="text-green-300">
              {formatMoney(myRevenue)}
            </strong>
            , средняя по команде сейчас{" "}
            <strong>
              {formatMoney(
                teamAverageRevenue
              )}
            </strong>
          </div>
        </>
      ) : (
        <div className="text-slate-300">
          Ваша выручка:{" "}
          <strong className="text-green-300">
            {formatMoney(myRevenue)}
          </strong>
          , средняя по команде{" "}
          <strong>
            {formatMoney(
              teamAverageRevenue
            )}
          </strong>
        </div>
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
  const { userData } = useAuth();
  const {
    isManager,
    isLeadership,
    displayName,
    canAccessPayment,
    managerId,
  } = usePermissions();

  const {
    clients,
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

  const missingVkCount =
    countClientsMissingVk(clients);

  useEffect(() => {
    if (!userData?.uid || !clients.length) {
      return;
    }

    syncMissingVkRemindersForUser(
      userData,
      clients
    ).catch((error) => {
      console.warn(
        "Missing VK sync skipped:",
        error
      );
    });

    syncMissingVkResolutionForUser(
      userData.uid,
      clients
    ).catch((error) => {
      console.warn(
        "Missing VK resolve skipped:",
        error
      );
    });
  }, [userData, clients]);

  const [quickSaleOpen, setQuickSaleOpen] =
    useState(false);

  const curatorStartsToday = useMemo(
    () =>
      getCuratorStartsTodayItems({
        payments,
        clients,
        today,
        userData,
      }),
    [payments, clients, today, userData]
  );

  const plannedTopups = useMemo(
    () =>
      getPlannedTopupsSummary(
        clients,
        payments,
        today
      ),
    [clients, payments, today]
  );

  const todayPaymentsCount = useMemo(
    () =>
      countTodayPaymentsForUser({
        payments,
        today,
        userData,
        isLeadership,
        canAccessPayment,
      }),
    [
      payments,
      today,
      userData,
      isLeadership,
      canAccessPayment,
    ]
  );

  const todayReplacement = useMemo(
    () =>
      getTodayReplacementSummary(
        summary.shiftInfo
      ),
    [summary.shiftInfo]
  );

  const quintetSlotCount = useMemo(() => {
    const offDays =
      schedule?.offDays || [];
    const quintetOff = offDays.filter((id) =>
      QUINTET_MANAGER_IDS.includes(id)
    );

    return Math.max(
      QUINTET_MANAGER_IDS.length -
        quintetOff.length,
      1
    );
  }, [schedule]);

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

        isLeadership &&
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

        isLeadership && summary.unsyncedTtCount > 0 && (

            <Link
              to="/management"
              className="
                px-4 py-2 rounded-xl
                bg-amber-500/20 text-amber-300
                hover:bg-amber-500/30 transition-colors text-sm
              "
            >

              {summary.unsyncedTtCount} ожидают выгрузки в ТТ

            </Link>

          )

      }

      {

        isManager && !isLeadership && (

          <section className="bg-slate-900 p-5 md:p-6 rounded-2xl space-y-6">

            {todayReplacement && managerId && (
              <TodayReplacementBanner
                replacement={todayReplacement}
                today={today}
                managerId={managerId}
                slotCount={quintetSlotCount}
              />
            )}

            <div>

              <div className="text-2xl font-bold">

                Доброго дня, {displayName || "коллега"}

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
                  label="Старт сегодня"
                  hint="отправить ссылку на лида куратору"
                  value={
                    curatorStartsToday.length
                  }
                  color="text-purple-400"
                  className="h-full hover:bg-slate-800 transition-colors"
                />
              </Link>

              <Link to="/subscriptions">
                <StatCard
                  label={
                    plannedTopups.monthLabel
                      ? `План доплат · ${plannedTopups.monthLabel}`
                      : "План доплат"
                  }
                  hint="остаток в текущем месяце"
                  value={formatMoney(
                    plannedTopups.monthRemain
                  )}
                  color="text-cyan-300"
                  className="h-full hover:bg-slate-800 transition-colors"
                />
              </Link>

              <Link to="/subscriptions">
                <StatCard
                  label="Всего доплат"
                  hint="остаток на всё время"
                  value={formatMoney(
                    plannedTopups.totalRemain
                  )}
                  color="text-cyan-400"
                  className="h-full hover:bg-slate-800 transition-colors"
                />
              </Link>

              <Link to="/payments?tab=bookings">
                <StatCard
                  label="Бронь ББ"
                  hint="до доплаты ББ"
                  value={
                    plannedTopups.bookingsCount ??
                    "—"
                  }
                  color="text-amber-300"
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

            {curatorStartsToday.length > 0 && (
              <div className="bg-slate-800/60 p-4 rounded-xl">
                <div className="text-purple-300 font-bold mb-3">
                  Старт сегодня ({today})
                </div>
                <div className="space-y-3">
                  {curatorStartsToday
                    .slice(0, 8)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="text-sm space-y-1"
                      >
                        <div className="font-semibold">
                          {item.clientName}
                          {item.course
                            ? ` · ${item.course}`
                            : ""}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-400">
                          {item.dialogLink && (
                            <a
                              href={
                                item.dialogLink
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:underline"
                            >
                              Диалог
                            </a>
                          )}
                          {item.vkLink && (
                            <a
                              href={
                                item.vkLink
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:underline"
                            >
                              VK
                            </a>
                          )}
                          {item.clientId && (
                            <Link
                              to={`/client/${item.clientId}`}
                              className="text-purple-300 hover:underline"
                            >
                              Отправить куратору →
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

              <StatCard
                label="Смена"
                value={
                  summary.shiftInfo?.isOff
                    ? "Выходной"
                    : todayReplacement
                      ? todayReplacement.hours
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
                  todayReplacement
                    ? todayReplacement.names
                    : "—"
                }
                color="text-violet-300"
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

            {summary.leaderInfo && (
              <MotivationalLeaderBlock
                leaderInfo={summary.leaderInfo}
              />
            )}

            <OperationalRequestsCard
              summary={requestsSummary}
            />

          </section>

        )

      }

      {

        isLeadership && (

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

              <Link to="/management">
                <StatCard
                  label="Ожидает выгрузки в ТТ"
                  hint="новые оплаты для ТТ-таблиц"
                  value={summary.unsyncedTtCount}
                  color={
                    summary.unsyncedTtCount
                      ? "text-amber-400"
                      : "text-green-400"
                  }
                  className="h-full hover:bg-slate-800 transition-colors"
                />
              </Link>

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

      {isLeadership && (
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

      {isLeadership && (
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

      {isLeadership && (
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
