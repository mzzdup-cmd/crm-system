import {
  getActiveManagers,
} from "./scheduleLogic";

export function buildTrafficDocument(
  date,
  schedule,
  trafficAmount = 0
) {
  const activeManagers =
    getActiveManagers(schedule);

  const distribution =
    schedule?.trafficDistribution || {};

  const perManager = {};

  activeManagers.forEach((managerId) => {
    const share = distribution[managerId] || 0;

    perManager[managerId] = {
      share,
      load: Math.round(
        trafficAmount * share
      ),
    };
  });

  return {
    date,
    trafficAmount: Number(trafficAmount || 0),
    load: {
      total: Number(trafficAmount || 0),
      perManager,
    },
    activeManagers,
    scheduleDistribution: distribution,
    shiftAllocation: schedule?.shifts || {},
    updatedAt: Date.now(),
  };
}

export function getManagerTrafficLoad(
  trafficDoc,
  managerId
) {
  if (!trafficDoc || !managerId) {
    return null;
  }

  const entry =
    trafficDoc.load?.perManager?.[
      managerId
    ];

  if (!entry) {
    return null;
  }

  return {
    share: entry.share,
    load: entry.load,
    trafficAmount:
      trafficDoc.trafficAmount || 0,
  };
}

export function summarizeTeamLoad(trafficDoc) {
  const perManager =
    trafficDoc?.load?.perManager || {};

  return Object.entries(perManager).map(
    ([managerId, data]) => ({
      managerId,
      share: data.share,
      load: data.load,
    })
  );
}
