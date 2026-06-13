import {
  useEffect,
  useState,
} from "react";

import {
  useSearchParams,
} from "react-router-dom";

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
  syncScheduleNotifications,
  syncTrafficOverloadNotifications,
} from "../services/reminderSyncService";

import {
  subscribeOperationalPayments,
} from "../services/realtimeService";

import {
  countUnsyncedPayments,
} from "../services/ttSyncService";

import {
  useManagementRealtime,
} from "../hooks/useRealtimeDashboard";

import { useAuth }
from "../context/AuthContext";

import LoadingState
from "../components/LoadingState";

import RealtimeIndicator
from "../components/ui/RealtimeIndicator";

import TtSyncPanel
from "../components/export/TtSyncPanel";

import PageHeader
from "../components/ui/PageHeader";

import PageTabs
from "../components/ui/PageTabs";

import TimeOffPage
from "./TimeOffPage";

import TrafficPage
from "./TrafficPage";

const TABS = [
  {
    id: "schedule",
    label: "График",
  },
  {
    id: "requests",
    label: "Запросы",
  },
  {
    id: "traffic",
    label: "Трафик",
  },
];

export default function ManagementPage() {
  const { userData } = useAuth();

  const [searchParams, setSearchParams] =
    useSearchParams();

  const activeTab =
    searchParams.get("tab") || "schedule";

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

  const [pendingTtCount, setPendingTtCount] =
    useState(0);

  const {
    schedule: liveSchedule,
    traffic: liveTraffic,
    teamLoad,
    initialLoading,
    connected,
  } = useManagementRealtime(date);

  useEffect(() => {
    if (!userData) {
      return undefined;
    }

    return subscribeOperationalPayments(
      userData,
      3000,
      (payments) => {
        setPendingTtCount(
          countUnsyncedPayments(payments)
        );
      }
    );
  }, [userData]);

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

  function handleTabChange(tabId) {
    if (tabId === "schedule") {
      setSearchParams({});
      return;
    }

    setSearchParams({ tab: tabId });
  }

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

  if (initialLoading) {
    return (
      <LoadingState message="Загрузка управления..." />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Управление"
        subtitle={
          <RealtimeIndicator connected={connected} />
        }
      />

      <TtSyncPanel
        pendingCount={pendingTtCount}
      />

      <PageTabs
        tabs={TABS}
        activeTab={activeTab}
        onChange={handleTabChange}
      />

      {activeTab === "requests" && (
        <TimeOffPage embedded />
      )}

      {activeTab === "traffic" && (
        <TrafficPage embedded />
      )}

      {activeTab === "schedule" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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

          <div className="bg-slate-900 p-6 rounded-2xl">
            <h2 className="text-2xl font-bold mb-4">
              Выходные
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {MANAGERS.map((manager) => (
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
              ))}
            </div>

            <button
              type="button"
              onClick={saveScheduleAndTraffic}
              disabled={saving}
              className="mt-6 w-full bg-green-500 hover:bg-green-600 p-4 rounded-xl font-bold disabled:opacity-50"
            >
              {saving
                ? "Сохранение..."
                : "Сохранить график и traffic"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="bg-slate-900 p-6 rounded-2xl">
              <h2 className="text-2xl font-bold mb-4">
                Замены
              </h2>

              <div className="space-y-3">
                {(schedule?.substitutions || [])
                  .map((item) => (
                    <div
                      key={`${item.from}-${item.to}`}
                      className="bg-slate-800 p-4 rounded-xl"
                    >
                      {getManagerNameById(item.to)}
                      {" работает за "}
                      {getManagerNameById(item.from)}
                    </div>
                  ))}

                {!(schedule?.substitutions || []).length && (
                  <div className="text-slate-400">
                    Замен нет
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl">
              <h2 className="text-2xl font-bold mb-4">
                Нагрузка команды
              </h2>

              <div className="space-y-3">
                {teamLoad.map((item) => (
                  <div
                    key={item.managerId}
                    className="bg-slate-800 p-4 rounded-xl flex justify-between"
                  >
                    <div>
                      {getManagerNameById(
                        item.managerId
                      )}
                    </div>

                    <div className="text-cyan-400">
                      {Math.round(
                        item.share * 100
                      )}
                      % / {item.load}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
