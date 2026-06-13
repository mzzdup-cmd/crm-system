import { useState } from "react";

import EmptyState
from "../components/ui/EmptyState";

import RealtimeIndicator
from "../components/ui/RealtimeIndicator";

import SubscriptionCard
from "../components/subscriptions/SubscriptionCard";

import ConfirmModal
from "../components/ui/ConfirmModal";

import { useToast }
from "../context/ToastContext";

import { useSubscriptionsRealtime }
from "../hooks/useRealtimeDashboard";

import { markSubscriptionChurned }
from "../services/clientService";

import {
  SUBSCRIPTION_OUTCOMES,
} from "../domain/client/subscriptionOutcome";

import LoadingState
from "../components/LoadingState";

const TABS = [
  {
    id: SUBSCRIPTION_OUTCOMES.ACTIVE,
    label: "Активные",
  },
  {
    id: SUBSCRIPTION_OUTCOMES.COMPLETED,
    label: "Успешные",
  },
  {
    id: SUBSCRIPTION_OUTCOMES.CHURNED,
    label: "Слив",
  },
];

export default function SubscriptionsPage({
  embedded = false,
}) {
  const toast = useToast();

  const [activeTab, setActiveTab] =
    useState(SUBSCRIPTION_OUTCOMES.ACTIVE);

  const [churnTarget, setChurnTarget] =
    useState(null);

  const [savingChurn, setSavingChurn] =
    useState(false);

  const {
    activeSubscriptions,
    completedSubscriptions,
    churnedSubscriptions,
    subscriptionCounts,
    initialLoading,
    connected,
  } = useSubscriptionsRealtime();

  if (initialLoading) {
    return (
      <LoadingState message="Загрузка подписок..." />
    );
  }

  const tabItems = {
    [SUBSCRIPTION_OUTCOMES.ACTIVE]:
      activeSubscriptions,
    [SUBSCRIPTION_OUTCOMES.COMPLETED]:
      completedSubscriptions,
    [SUBSCRIPTION_OUTCOMES.CHURNED]:
      churnedSubscriptions,
  };

  const currentItems =
    tabItems[activeTab] || [];

  const emptyCopy = {
    [SUBSCRIPTION_OUTCOMES.ACTIVE]: {
      title: "Активных подписок нет",
      description:
        "Здесь клиенты с незакрытым бюджетом и графиком доплат.",
    },
    [SUBSCRIPTION_OUTCOMES.COMPLETED]: {
      title: "Успешных подписок пока нет",
      description:
        "Полностью оплаченные подписки появятся здесь автоматически.",
    },
    [SUBSCRIPTION_OUTCOMES.CHURNED]: {
      title: "Сливов пока нет",
      description:
        "Если ученик отказывается продолжать оплату, перенесите подписку в слив.",
    },
  };

  async function confirmChurn() {
    if (!churnTarget) {
      return;
    }

    setSavingChurn(true);

    try {
      await markSubscriptionChurned(
        churnTarget.id
      );

      toast.success(
        "Подписка перенесена в слив"
      );
      setChurnTarget(null);
    } catch (error) {
      toast.error(
        error.message ||
          "Не удалось обновить подписку"
      );
    } finally {
      setSavingChurn(false);
    }
  }

  function handleCopy(status) {
    if (status === "error") {
      toast.error(
        "Не удалось скопировать текст"
      );
      return;
    }

    toast.success(
      "Текст скопирован для Bluesales"
    );
  }

  const totalCount =
    subscriptionCounts.active
    + subscriptionCounts.completed
    + subscriptionCounts.churned;

  return (
    <div className="space-y-6">

      <div className="flex flex-wrap items-center justify-between gap-4">

        {!embedded && (
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">
              Подписки
            </h1>

            <p className="text-slate-400 mt-2 flex items-center gap-3">
              <span>
                {subscriptionCounts.active} активных
                {" · "}
                {totalCount} всего
              </span>

              <RealtimeIndicator connected={connected} />
            </p>
          </div>
        )}

        {embedded && (
          <p className="text-slate-400 text-sm flex items-center gap-3">
            <span>
              {subscriptionCounts.active} активных
              {" · "}
              {totalCount} всего
            </span>
            <RealtimeIndicator connected={connected} />
          </p>
        )}

      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const count =
            subscriptionCounts[
              tab.id === SUBSCRIPTION_OUTCOMES.ACTIVE
                ? "active"
                : tab.id === SUBSCRIPTION_OUTCOMES.COMPLETED
                  ? "completed"
                  : "churned"
            ];

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setActiveTab(tab.id)
              }
              className={`
                px-4 py-2 rounded-xl font-medium transition-colors
                ${
                  activeTab === tab.id
                    ? "bg-cyan-500 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }
              `}
            >
              {tab.label}
              {" "}
              ({count})
            </button>
          );
        })}
      </div>

      {currentItems.length === 0 ? (
        <EmptyState
          icon="📋"
          title={
            emptyCopy[activeTab].title
          }
          description={
            emptyCopy[activeTab].description
          }
        />
      ) : (
        <div className="grid gap-4">
          {currentItems.map((client) => (
            <SubscriptionCard
              key={client.id}
              client={client}
              variant={activeTab}
              onMarkChurned={
                activeTab ===
                SUBSCRIPTION_OUTCOMES.ACTIVE
                  ? setChurnTarget
                  : undefined
              }
              onCopy={handleCopy}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        open={Boolean(churnTarget)}
        title="Перенести в слив?"
        message={
          churnTarget
            ? `Клиент «${churnTarget.name || "без имени"}» больше не будет в активных подписках.`
            : ""
        }
        confirmLabel="В слив"
        loading={savingChurn}
        onConfirm={confirmChurn}
        onCancel={() =>
          setChurnTarget(null)
        }
      />

    </div>
  );

}
