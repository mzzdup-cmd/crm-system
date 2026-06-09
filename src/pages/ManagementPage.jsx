import {
  useEffect,
  useState,
} from "react";

import MoneyInput
from "../components/ui/MoneyInput";

import { MANAGERS } from "../constants/managers";
import {
  getManagerNameById,
} from "../constants/managers";

import {
  updateScheduleOffDays,
} from "../services/scheduleService";

import {
  updateTrafficAmount,
} from "../services/trafficService";

import {
  buildScheduleDocument,
  getTodayDateString,
} from "../domain/schedule/scheduleLogic";

import {
  triggerBackfillPaymentsSync,
} from "../services/sheetsSyncService";

import {
  syncScheduleNotifications,
  syncTrafficOverloadNotifications,
} from "../services/reminderSyncService";

import {
  useManagementRealtime,
} from "../hooks/useRealtimeDashboard";

import LoadingState
from "../components/LoadingState";

import RealtimeIndicator
from "../components/ui/RealtimeIndicator";

import ExportCenter
from "../components/export/ExportCenter";

import PageHeader
from "../components/ui/PageHeader";

export default function ManagementPage() {

  const [date, setDate] =
    useState(getTodayDateString());

  const [offDays, setOffDays] =
    useState([]);

  const [schedule, setSchedule] =
    useState(null);

  const [trafficAmount, setTrafficAmount] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [backfilling, setBackfilling] =
    useState(false);

  const {
    schedule: liveSchedule,
    traffic: liveTraffic,
    failedSyncLogs,
    recentSyncLogs,
    teamLoad,
    initialLoading,
    connected,
  } = useManagementRealtime(date);

  useEffect(() => {
    if (liveSchedule) {
      setSchedule(liveSchedule);
      setOffDays(liveSchedule.offDays || []);
    } else {
      const built = buildScheduleDocument(date);
      setSchedule(built);
      setOffDays([]);
    }
  }, [liveSchedule, date]);

  useEffect(() => {
    setTrafficAmount(
      String(liveTraffic?.trafficAmount || "")
    );
  }, [liveTraffic]);

  function toggleOffDay(managerId) {

    setOffDays((current) => {

      if (current.includes(managerId)) {
        return current.filter(
          (id) => id !== managerId
        );
      }

      return [...current, managerId];

    });

  }

  async function saveScheduleAndTraffic() {

    setSaving(true);

    const prevSchedule = schedule;

    const savedSchedule =
      await updateScheduleOffDays(
        date,
        offDays
      );

    const savedTraffic =
      await updateTrafficAmount(
        date,
        savedSchedule,
        Number(trafficAmount || 0)
      );

    setSchedule(savedSchedule);

    await syncScheduleNotifications({
      schedule: savedSchedule,
      previousSchedule: prevSchedule,
    });

    await syncTrafficOverloadNotifications({
      traffic: savedTraffic,
    });

    setSaving(false);

    alert("График и traffic сохранены");

  }

  async function runBackfill() {

    setBackfilling(true);

    try {

      const result =
        await triggerBackfillPaymentsSync();

      alert(
        `Backfill завершён: success ${result.success}, failed ${result.failed}`
      );

    } catch (error) {

      alert(
        error.message ||
        "Ошибка backfill sync"
      );

    }

    setBackfilling(false);

  }

  if (initialLoading) {

    return (
      <LoadingState message="Загрузка управления..." />
    );

  }

  const syncStatus = {
    failedCount: failedSyncLogs.length,
    recentLogs: recentSyncLogs,
    failedLogs: failedSyncLogs,
  };

  return (

    <div>

      <PageHeader
        title="Управление"
        subtitle={
          <RealtimeIndicator connected={connected} />
        }
      />

      <div className="mb-8">

        <ExportCenter />

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">

        <div className="bg-slate-900 p-6 rounded-2xl">

          <div className="text-slate-400 mb-2">

            Дата

          </div>

          <input
            type="date"
            value={date}
            onChange={(e) =>
              setDate(e.target.value)
            }
            className="w-full bg-slate-800 p-4 rounded-xl"
          />

        </div>

        <div className="bg-slate-900 p-6 rounded-2xl">

          <div className="text-slate-400 mb-2">

            Traffic amount

          </div>

          <MoneyInput
            value={trafficAmount}
            onChange={setTrafficAmount}
            className="w-full bg-slate-800 p-4 rounded-xl"
          />

        </div>

      </div>

      <div className="bg-slate-900 p-6 rounded-2xl mb-8">

        <h2 className="text-2xl font-bold mb-4">

          Выходные

        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {

            MANAGERS.map((manager) => (

              <label
                key={manager.id}
                className="bg-slate-800 p-4 rounded-xl flex items-center gap-3 cursor-pointer"
              >

                <input
                  type="checkbox"
                  checked={offDays.includes(
                    manager.id
                  )}
                  onChange={() =>
                    toggleOffDay(
                      manager.id
                    )
                  }
                />

                {manager.name}

              </label>

            ))

          }

        </div>

        <button
          onClick={saveScheduleAndTraffic}
          disabled={saving}
          className="mt-6 w-full bg-green-500 hover:bg-green-600 p-4 rounded-xl font-bold disabled:opacity-50"
        >

          {saving
            ? "Сохранение..."
            : "Сохранить график и traffic"}

        </button>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">

        <div className="bg-slate-900 p-6 rounded-2xl">

          <h2 className="text-2xl font-bold mb-4">

            Замены

          </h2>

          <div className="space-y-3">

            {

              (schedule?.substitutions || [])
                .map((item) => (

                  <div
                    key={`${item.from}-${item.to}`}
                    className="bg-slate-800 p-4 rounded-xl"
                  >

                    {

                      getManagerNameById(
                        item.to
                      )

                    }

                    {" работает за "}

                    {

                      getManagerNameById(
                        item.from
                      )

                    }

                  </div>

                ))

            }

            {

              !(schedule?.substitutions || []).length && (

                <div className="text-slate-400">

                  Замен нет

                </div>

              )

            }

          </div>

        </div>

        <div className="bg-slate-900 p-6 rounded-2xl">

          <h2 className="text-2xl font-bold mb-4">

            Нагрузка команды

          </h2>

          <div className="space-y-3">

            {

              teamLoad.map((item) => (

                <div
                  key={item.managerId}
                  className="bg-slate-800 p-4 rounded-xl flex justify-between"
                >

                  <div>

                    {

                      getManagerNameById(
                        item.managerId
                      )

                    }

                  </div>

                  <div className="text-cyan-400">

                    {Math.round(
                      item.share * 100
                    )}

                    % / {item.load}

                  </div>

                </div>

              ))

            }

          </div>

        </div>

      </div>

      <details className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80">

        <summary className="cursor-pointer font-bold text-slate-400 hover:text-slate-200">

          Google Sheets Sync (отложено · pilot)

        </summary>

        <p className="text-slate-500 text-sm mt-4 mb-4">

          Auto-sync через Cloud Functions не используется (без billing).
          Ежедневный sync: GitHub Actions → Google Sheets.
          Полная инструкция: docs/SETUP-NIGHTLY-SYNC.md
          Для pilot также доступен Export Center выше.

        </p>

        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">

          <div className="text-slate-400">

            Failed syncs:

            {" "}

            {syncStatus?.failedCount || 0}

          </div>

          <button
            onClick={runBackfill}
            disabled={backfilling}
            className="bg-slate-800 hover:bg-slate-700 px-5 py-2.5 rounded-xl text-sm disabled:opacity-50"
          >

            {

              backfilling

                ? "Backfill..."

                : "Backfill unsynced"

            }

          </button>

        </div>

        <div className="space-y-3">

          {

            (syncStatus?.recentLogs || []).map(
              (log) => (

                <div
                  key={log.id}
                  className="bg-slate-800 p-4 rounded-xl flex justify-between"
                >

                  <div>

                    <div className="font-bold">

                      {log.paymentId}

                    </div>

                    <div className="text-slate-400 text-sm mt-1">

                      {log.reason || log.error || "ok"}

                    </div>

                  </div>

                  <div

                    className={

                      log.status === "success"

                        ? "text-green-400"

                        : log.status === "failed"

                        ? "text-red-400"

                        : "text-yellow-400"

                    }

                  >

                    {log.status}

                  </div>

                </div>

              )
            )

          }

        </div>

      </details>

    </div>

  );

}
