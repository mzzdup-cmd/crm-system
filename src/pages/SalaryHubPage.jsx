import {
  useSearchParams,
} from "react-router-dom";

import PageHeader
from "../components/ui/PageHeader";

import PageTabs
from "../components/ui/PageTabs";

import SalaryPage
from "./SalaryPage";

import NightShiftsPage
from "./NightShiftsPage";

import BonusesPage
from "./BonusesPage";

const TABS = [
  {
    id: "salary",
    label: "Зарплата",
  },
  {
    id: "night-shifts",
    label: "Ночные смены",
  },
  {
    id: "bonuses",
    label: "Бонусы",
  },
];

export default function SalaryHubPage() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const activeTab =
    searchParams.get("tab") || "salary";

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
        subtitle="Расчёт ЗП, ночные смены и бонусы"
      />

      <PageTabs
        tabs={TABS}
        activeTab={activeTab}
        onChange={handleTabChange}
      />

      {activeTab === "salary" && (
        <SalaryPage embedded />
      )}

      {activeTab === "night-shifts" && (
        <NightShiftsPage embedded />
      )}

      {activeTab === "bonuses" && (
        <BonusesPage embedded />
      )}
    </div>
  );
}
