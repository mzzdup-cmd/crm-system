import {
  SHIFT_START,
  SHIFT_END,
  GROUP_OFFDAY_MANAGER_IDS,
} from "../../constants/schedule.js";

import { MANAGERS } from "../../constants/managers.js";

import {
  computeReplacements,
  getPairPartner as getReplacementPairPartner,
} from "../calendar/replacementLogic.js";

export function getTodayDateString(
  date = new Date()
) {
  return date
    .toISOString()
    .split("T")[0];
}

export function getSubstitutionPartner(
  managerId
) {
  return getReplacementPairPartner(
    managerId
  );
}

export function buildDefaultShifts(
  managerIds = MANAGERS.map(
    (manager) => manager.id
  )
) {
  const shifts = {};

  managerIds.forEach((managerId) => {
    shifts[managerId] = {
      start: SHIFT_START,
      end: SHIFT_END,
      coveringFor: null,
      active: true,
    };
  });

  return shifts;
}

export function applyPermanentSubstitutions({
  offDays = [],
  shifts = {},
  manualAssignments = {},
}) {
  return computeReplacements({
    offDays,
    manualAssignments,
    existingShifts: shifts,
  });
}

export function computeGroupTrafficDistribution(
  offDays = [],
  groupIds = GROUP_OFFDAY_MANAGER_IDS
) {
  const distribution = {};
  const groupOffDays = offDays.filter((id) =>
    groupIds.includes(id)
  );

  const working = groupIds.filter(
    (id) => !groupOffDays.includes(id)
  );

  if (groupOffDays.length === 0) {
    const equalShare = 1 / groupIds.length;

    groupIds.forEach((id) => {
      distribution[id] = equalShare;
    });

    return distribution;
  }

  const baseShare = 1 / groupIds.length;
  const extraLoad =
    (groupOffDays.length * baseShare) /
    Math.max(working.length, 1);

  groupIds.forEach((id) => {
    if (groupOffDays.includes(id)) {
      distribution[id] = 0;
      return;
    }

    distribution[id] = baseShare + extraLoad;
  });

  return distribution;
}

export function buildScheduleDocument(
  date,
  options = {}
) {
  const offDays = options.offDays || [];
  const manualAssignments =
    options.manualAssignments || {};
  const existingShifts =
    options.existingShifts ||
    buildDefaultShifts();
  const {
    shifts,
    substitutions,
    pendingManualAssignments,
  } = applyPermanentSubstitutions({
    offDays,
    shifts: existingShifts,
    manualAssignments,
  });

  const trafficDistribution =
    computeGroupTrafficDistribution(offDays);

  return {
    date,
    shifts,
    offDays,
    substitutions,
    manualAssignments,
    pendingManualAssignments,
    trafficDistribution,
    updatedAt: Date.now(),
  };
}

export function resolveEffectiveSchedule(
  schedule,
  date = getTodayDateString()
) {
  if (!schedule) {
    return buildScheduleDocument(date);
  }

  const offDays = schedule.offDays || [];

  if (offDays.length === 0) {
    return schedule;
  }

  const { shifts, substitutions, pendingManualAssignments } =
    applyPermanentSubstitutions({
      offDays,
      shifts:
        schedule.shifts ||
        buildDefaultShifts(),
      manualAssignments:
        schedule.manualAssignments || {},
    });

  return {
    ...schedule,
    date: schedule.date || date,
    shifts,
    substitutions,
    pendingManualAssignments,
  };
}

export function getManagerShiftInfo(
  schedule,
  managerId
) {
  if (!schedule || !managerId) {
    return null;
  }

  const shift = schedule.shifts?.[managerId];
  const isOff = schedule.offDays?.includes(
    managerId
  );

  const coveringFor =
    shift?.coveringFor || null;

  const coveredBy = schedule.substitutions
    ?.filter(
      (item) => item.from === managerId
    )
    ?.map((item) => item.to) || [];

  const trafficShare =
    schedule.trafficDistribution?.[
      managerId
    ] ?? null;

  return {
    managerId,
    isOff,
    shift,
    coveringFor,
    coveredBy,
    trafficShare,
  };
}

export function getActiveManagers(schedule) {
  if (!schedule?.shifts) {
    return [];
  }

  return Object.entries(schedule.shifts)
    .filter(([, shift]) => shift.active)
    .map(([managerId]) => managerId);
}
