import {
  useSearchParams,
} from "react-router-dom";

import PageHeader
from "../components/ui/PageHeader";

import PageErrorBoundary
from "../components/ui/PageErrorBoundary";

import PageTabs
from "../components/ui/PageTabs";

import SubscriptionsPage
from "./SubscriptionsPage";

import BookingsPage
from "./BookingsPage";

import PendingSalesPage
from "./PendingSalesPage";

const TABS = [
  {
    id: "subscriptions",
    label: "Подписки",
  },
  {
    id: "bookings",
    label: "Бронь",
  },
  {
    id: "quick",
    label: "Быстрые",
  },
];

function resolveActiveTab(tabParam) {
  if (tabParam === "bookings") {
    return "bookings";
  }

  if (
    tabParam === "quick" ||
    tabParam === "pending"
  ) {
    return "quick";
  }

  return "subscriptions";
}

export default function SalesHubPage() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const activeTab = resolveActiveTab(
    searchParams.get("tab")
  );

  function handleTabChange(tabId) {
    if (tabId === "subscriptions") {
      setSearchParams({});
      return;
    }

    setSearchParams({ tab: tabId });
  }

  return (
    <PageErrorBoundary title="Продажи">
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Продажи"
          subtitle="Подписки, бронь и быстрые продажи. Выручка KPI — из ТТ за текущий месяц."
        />

        <PageTabs
          tabs={TABS}
          activeTab={activeTab}
          onChange={handleTabChange}
        />

        {activeTab === "subscriptions" && (
          <SubscriptionsPage embedded />
        )}

        {activeTab === "bookings" && (
          <BookingsPage embedded />
        )}

        {activeTab === "quick" && (
          <PendingSalesPage embedded />
        )}
      </div>
    </PageErrorBoundary>
  );
}
