import {
  useSearchParams,
} from "react-router-dom";

import PageHeader
from "../components/ui/PageHeader";

import PageTabs
from "../components/ui/PageTabs";

import PaymentsPage
from "./PaymentsPage";

import ClientsPage
from "./ClientsPage";

import DealsPage
from "./DealsPage";

import SubscriptionsPage
from "./SubscriptionsPage";

const TABS = [
  {
    id: "history",
    label: "История оплат",
  },
  {
    id: "clients",
    label: "Клиенты",
  },
  {
    id: "deals",
    label: "Сделки",
  },
  {
    id: "subscriptions",
    label: "Подписки",
  },
];

export default function SalesHubPage() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const activeTab =
    searchParams.get("tab") || "history";

  function handleTabChange(tabId) {
    if (tabId === "history") {
      setSearchParams({});
      return;
    }

    setSearchParams({ tab: tabId });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Продажи"
        subtitle="История оплат, клиенты, сделки и подписки"
      />

      <PageTabs
        tabs={TABS}
        activeTab={activeTab}
        onChange={handleTabChange}
      />

      {activeTab === "history" && (
        <PaymentsPage embedded />
      )}

      {activeTab === "clients" && (
        <ClientsPage embedded />
      )}

      {activeTab === "deals" && (
        <DealsPage embedded />
      )}

      {activeTab === "subscriptions" && (
        <SubscriptionsPage embedded />
      )}
    </div>
  );
}
