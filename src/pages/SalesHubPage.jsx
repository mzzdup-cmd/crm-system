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

const TABS = [
  {
    id: "subscriptions",
    label: "Подписки",
  },
  {
    id: "bookings",
    label: "Бронь",
  },
];

export default function SalesHubPage() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const tabParam = searchParams.get("tab");
  const activeTab =
    tabParam === "bookings"
      ? "bookings"
      : "subscriptions";

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
          subtitle="Подписки и бронь. Выручка — из ТТ менеджеров."
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
      </div>
    </PageErrorBoundary>
  );
}
