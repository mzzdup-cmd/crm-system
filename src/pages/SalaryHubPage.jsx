import {
  useEffect,
  useMemo,
} from "react";

import {
  useSearchParams,
} from "react-router-dom";

import PageHeader
from "../components/ui/PageHeader";

import PageTabs
from "../components/ui/PageTabs";

import { usePermissions }
from "../hooks/usePermissions";

import SalaryPage
from "./SalaryPage";

import NightShiftsPage
from "./NightShiftsPage";

import BonusesPage
from "./BonusesPage";

const ALL_TABS = [
  {
    id: "salary",
    label: "Зарплата",
  },
  {
    id: "night-shifts",
    label: "Ночные смены",
    adminOnly: true,
  },
  {
    id: "bonuses",
    label: "Бонусы",
    adminOnly: true,
  },
];

export default function SalaryHubPage() {
  const { isLeadership } = usePermissions();

  const [searchParams, setSearchParams] =
    useSearchParams();

  const tabs = useMemo(
    () =>
      isLeadership
        ? ALL_TABS
        : ALL_TABS.filter(
            (tab) => !tab.adminOnly
          ),
    [isLeadership]
  );

  const requestedTab =
    searchParams.get("tab") || "salary";

  const allowedTabIds = tabs.map(
    (tab) => tab.id
  );

  const activeTab = allowedTabIds.includes(
    requestedTab
  )
    ? requestedTab
    : "salary";

  useEffect(() => {
    if (
      requestedTab !== activeTab
    ) {
      setSearchParams(
        {},
        { replace: true }
      );
    }
  }, [
    requestedTab,
    activeTab,
    setSearchParams,
  ]);

  function handleTabChange(tabId) {
    if (tabId === "salary") {
      setSearchParams({});
      return;
    }

    setSearchParams({ tab: tabId });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Зарплата"
        subtitle={
          isLeadership
            ? "Расчёт ЗП, ночные смены и бонусы"
            : "Ваш расчёт за текущий месяц"
        }
      />

      {tabs.length > 1 && (
        <PageTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={handleTabChange}
        />
      )}

      {activeTab === "salary" && (
        <SalaryPage embedded />
      )}

      {isLeadership &&
        activeTab === "night-shifts" && (
          <NightShiftsPage embedded />
        )}

      {isLeadership &&
        activeTab === "bonuses" && (
          <BonusesPage embedded />
        )}
    </div>
  );
}
