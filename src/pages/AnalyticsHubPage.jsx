import {
  useSearchParams,
} from "react-router-dom";

import PageHeader
from "../components/ui/PageHeader";

import PageTabs
from "../components/ui/PageTabs";

import AdminAnalyticsPage
from "./AdminAnalyticsPage";

import RatingPage
from "./RatingPage";

const TABS = [
  {
    id: "analytics",
    label: "Аналитика",
  },
  {
    id: "rating",
    label: "Рейтинг",
  },
];

export default function AnalyticsHubPage() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const activeTab =
    searchParams.get("tab") || "analytics";

  function handleTabChange(tabId) {
    if (tabId === "analytics") {
      setSearchParams({});
      return;
    }

    setSearchParams({ tab: tabId });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="MM Аналитика"
        subtitle="Сводка, графики и рейтинг менеджеров"
      />

      <PageTabs
        tabs={TABS}
        activeTab={activeTab}
        onChange={handleTabChange}
      />

      {activeTab === "analytics" && (
        <AdminAnalyticsPage embedded />
      )}

      {activeTab === "rating" && (
        <RatingPage embedded />
      )}
    </div>
  );
}
