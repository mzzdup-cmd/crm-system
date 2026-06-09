import {
  summarizeTeamLoad,
} from "../schedule/trafficLogic";

import {
  getActiveManagers,
  getManagerShiftInfo,
} from "../schedule/scheduleLogic";

import {
  getManagerNameById,
} from "../../constants/managers";

export function buildTrafficChartData(
  trafficDoc
) {
  const teamLoad =
    summarizeTeamLoad(trafficDoc);

  return teamLoad.map((item) => ({
    name: getManagerNameById(
      item.managerId
    )?.split(" ")[0] || item.managerId,
    load: item.load,
    share: Math.round(item.share * 100),
  }));
}

export function buildManagementOverview({
  schedule,
  traffic,
}) {
  if (!schedule) {
    return {
      working: [],
      offDays: [],
      substitutions: [],
      trafficAmount: 0,
      teamLoad: [],
    };
  }

  const activeManagers =
    getActiveManagers(schedule);

  const offDays = (
    schedule.offDays || []
  ).map((managerId) => ({
    managerId,
    name: getManagerNameById(managerId),
  }));

  const working = activeManagers.map(
    (managerId) => {
      const info = getManagerShiftInfo(
        schedule,
        managerId
      );

      return {
        managerId,
        name: getManagerNameById(
          managerId
        ),
        coveringFor: info?.coveringFor
          ? getManagerNameById(
              info.coveringFor
            )
          : null,
        trafficShare: info?.trafficShare,
      };
    }
  );

  const substitutions = (
    schedule.substitutions || []
  ).map((item) => ({
    from: getManagerNameById(item.from),
    to: getManagerNameById(item.to),
    type: item.type,
  }));

  return {
    working,
    offDays,
    substitutions,
    trafficAmount:
      traffic?.trafficAmount || 0,
    teamLoad: summarizeTeamLoad(traffic),
    trafficDistribution:
      schedule.trafficDistribution || {},
  };
}

export function buildSyncOverview(syncLogs) {
  const total = syncLogs.length;
  const success = syncLogs.filter(
    (log) => log.status === "success"
  ).length;

  const failed = syncLogs.filter(
    (log) => log.status === "failed"
  ).length;

  const pending = syncLogs.filter(
    (log) => log.status === "pending"
  ).length;

  return {
    total,
    success,
    failed,
    pending,
    successRate: total
      ? Math.round((success / total) * 100)
      : 100,
  };
}
