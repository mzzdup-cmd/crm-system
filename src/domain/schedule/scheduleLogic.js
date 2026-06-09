import {
  SHIFT_START,
  SHIFT_END,
  PERMANENT_SUBSTITUTION_PAIRS,
  GROUP_OFFDAY_MANAGER_IDS,
} from "../../constants/schedule";

import { MANAGERS } from "../../constants/managers";

export function getTodayDateString(
  date = new Date()
) {
  return date
    .toISOString()
    .split("T")[0];
}

export function getSubstitutionPartner(managerId) {
  for (const [first, second] of PERMANENT_SUBSTITUTION_PAIRS) {
    if (first === managerId) {
      return second;
    }

    if (second === managerId) {
      return first;
    }
  }

  return null;
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
}) {
  const updatedShifts = { ...shifts };
  const substitutions = [];

  offDays.forEach((offManagerId) => {
    const partnerId =
      getSubstitutionPartner(offManagerId);

    if (!partnerId) {
      return;
    }

    if (updatedShifts[offManagerId]) {
      updatedShifts[offManagerId] = {
        ...updatedShifts[offManagerId],
        active: false,
      };
    }

    if (updatedShifts[partnerId]) {
      updatedShifts[partnerId] = {
        ...updatedShifts[partnerId],
        active: true,
        coveringFor: offManagerId,
      };
    }

    substitutions.push({
      from: offManagerId,
      to: partnerId,
      type: "permanent_pair",
    });
  });

  return {
    shifts: updatedShifts,
    substitutions,
  };
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

export function buildScheduleDocument(date, options = {}) {
  const offDays = options.offDays || [];
  const baseShifts = buildDefaultShifts();
  const { shifts, substitutions } =
    applyPermanentSubstitutions({
      offDays,
      shifts: baseShifts,
    });

  const trafficDistribution =
    computeGroupTrafficDistribution(offDays);

  return {
    date,
    shifts,
    offDays,
    substitutions,
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

  const { shifts, substitutions } =
    applyPermanentSubstitutions({
      offDays,
      shifts:
        schedule.shifts ||
        buildDefaultShifts(),
    });

  return {
    ...schedule,
    date: schedule.date || date,
    shifts,
    substitutions,
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
