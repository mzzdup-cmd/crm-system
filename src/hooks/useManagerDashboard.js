import { useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { usePermissions } from "./usePermissions";

import {
  getClientsForUser,
} from "../services/clientService";

import {
  getPaymentsForUser,
  getSalaryReportForUser,
} from "../services/paymentService";

import {
  getTodayScheduleOrDefault,
} from "../services/scheduleService";

import {
  getTodayTraffic,
} from "../services/trafficService";

import {
  getManagerShiftInfo,
  getTodayDateString,
} from "../domain/schedule/scheduleLogic";

import {
  getManagerTrafficLoad,
} from "../domain/schedule/trafficLogic";

import {
  isOverdue,
  hasDebt,
} from "../domain/client/clientStatus";

import {
  getManagerNameById,
} from "../constants/managers";

export function useManagerDashboard() {
  const { userData } = useAuth();
  const { managerId, displayName } =
    usePermissions();

  const [loading, setLoading] =
    useState(true);

  const [data, setData] = useState({
    date: getTodayDateString(),
    greetingName: "",
    shiftInfo: null,
    trafficLoad: null,
    revenue: 0,
    deals: 0,
    subscriptions: 0,
    overdueCount: 0,
    salaryTotal: 0,
    recentPayments: [],
  });

  useEffect(() => {
    loadDashboardContext();
  }, [userData, managerId]);

  async function loadDashboardContext() {
    if (!userData) {
      return;
    }

    setLoading(true);

    const [
      clients,
      payments,
      schedule,
      traffic,
      salaryReport,
    ] = await Promise.all([
      getClientsForUser(userData),
      getPaymentsForUser(userData),
      getTodayScheduleOrDefault(),
      getTodayTraffic(),
      getSalaryReportForUser(userData),
    ]);

    const shiftInfo = managerId
      ? getManagerShiftInfo(
          schedule,
          managerId
        )
      : null;

    const trafficLoad = managerId
      ? getManagerTrafficLoad(
          traffic,
          managerId
        )
      : null;

    const subscriptions = clients.filter(
      (client) => hasDebt(client)
    ).length;

    const overdueCount = clients.filter(
      (client) => isOverdue(client)
    ).length;

    const revenue = clients.reduce(
      (sum, client) =>
        sum +
        Number(client.amount || 0),
      0
    );

    const salaryTotal =
      salaryReport[0]?.totalSalary || 0;

    setData({
      date: getTodayDateString(),
      greetingName:
        displayName ||
        getManagerNameById(managerId) ||
        "",
      shiftInfo,
      trafficLoad,
      revenue,
      deals: clients.length,
      subscriptions,
      overdueCount,
      salaryTotal,
      recentPayments: payments.slice(0, 5),
      schedule,
      traffic,
    });

    setLoading(false);
  }

  return {
    loading,
    ...data,
    reload: loadDashboardContext,
  };
}
