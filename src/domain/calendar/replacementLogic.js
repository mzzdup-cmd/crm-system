import {
  SHIFT_START,
  SHIFT_END,
  PERMANENT_SUBSTITUTION_PAIRS,
  GROUP_OFFDAY_MANAGER_IDS,
} from "../../constants/schedule.js";

import {
  MANAGERS,
  getManagerNameById,
} from "../../constants/managers.js";

export const REPLACEMENT_PAIRS =
  PERMANENT_SUBSTITUTION_PAIRS;

export const QUINTET_MANAGER_IDS =
  GROUP_OFFDAY_MANAGER_IDS;

export function normalizeReplacementManagerId(
  managerId
) {
  if (!managerId) {
    return managerId;
  }

  if (managerId === "vilu_petrova") {
    return "violeta_petrova";
  }

  return managerId;
}

export function getPairPartner(managerId) {
  const id =
    normalizeReplacementManagerId(
      managerId
    );

  for (const [first, second] of REPLACEMENT_PAIRS) {
    if (first === id) {
      return second;
    }

    if (second === id) {
      return first;
    }
  }

  return null;
}

export function isPairMember(managerId) {
  return Boolean(
    getPairPartner(managerId)
  );
}

export function isQuintetMember(managerId) {
  return QUINTET_MANAGER_IDS.includes(
    normalizeReplacementManagerId(
      managerId
    )
  );
}

function parseTimeToMinutes(timeStr) {
  const [hours, minutes] = timeStr
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

function formatMinutesToTime(totalMinutes) {
  const hours = Math.floor(
    totalMinutes / 60
  );
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function splitShiftIntoSlots(slotCount) {
  if (slotCount <= 0) {
    return [];
  }

  const startMin =
    parseTimeToMinutes(SHIFT_START);
  const endMin =
    parseTimeToMinutes(SHIFT_END);
  const totalMin = endMin - startMin;
  const slotDuration = Math.floor(
    totalMin / slotCount
  );

  const slots = [];

  for (let index = 0; index < slotCount; index += 1) {
    const slotStart =
      startMin + index * slotDuration;
    const slotEnd =
      index === slotCount - 1
        ? endMin
        : startMin +
          (index + 1) * slotDuration;

    slots.push({
      start: formatMinutesToTime(slotStart),
      end: formatMinutesToTime(slotEnd),
    });
  }

  return slots;
}

export function detectPairBothOffCases(
  offDays = []
) {
  const normalized = offDays.map(
    normalizeReplacementManagerId
  );
  const cases = [];

  for (const [first, second] of REPLACEMENT_PAIRS) {
    if (
      normalized.includes(first) &&
      normalized.includes(second)
    ) {
      cases.push({
        pair: [first, second],
        offMembers: [first, second],
      });
    }
  }

  return cases;
}

export function getPendingManualAssignments(
  offDays = [],
  manualAssignments = {}
) {
  const pending = [];

  for (const { offMembers } of detectPairBothOffCases(
    offDays
  )) {
    for (const offManagerId of offMembers) {
      if (manualAssignments[offManagerId]) {
        continue;
      }

      pending.push({
        offManagerId,
        offManagerName:
          getManagerNameById(offManagerId),
        reason: "pair_both_off",
      });
    }
  }

  return pending;
}

function buildDefaultShift(
  managerId,
  existingShift = null
) {
  return {
    start:
      existingShift?.start || SHIFT_START,
    end: existingShift?.end || SHIFT_END,
    coveringFor: null,
    active: true,
    splitCover: false,
  };
}

function applyPairSubstitution({
  shifts,
  substitutions,
  offManagerId,
  covererId,
  type = "permanent_pair",
}) {
  shifts[offManagerId] = {
    ...shifts[offManagerId],
    active: false,
    coveringFor: null,
  };

  shifts[covererId] = {
    ...shifts[covererId],
    active: true,
    coveringFor: offManagerId,
    start: SHIFT_START,
    end: SHIFT_END,
    splitCover: false,
  };

  substitutions.push({
    from: offManagerId,
    to: covererId,
    type,
    start: SHIFT_START,
    end: SHIFT_END,
  });
}

export function computeReplacements({
  offDays = [],
  manualAssignments = {},
  existingShifts = {},
}) {
  const normalizedOff = [
    ...new Set(
      offDays.map(
        normalizeReplacementManagerId
      )
    ),
  ];

  const managerIds = MANAGERS.map(
    (manager) => manager.id
  );

  const shifts = {};

  managerIds.forEach((managerId) => {
    shifts[managerId] = buildDefaultShift(
      managerId,
      existingShifts[managerId]
    );
  });

  normalizedOff.forEach((managerId) => {
    if (shifts[managerId]) {
      shifts[managerId].active = false;
      shifts[managerId].coveringFor = null;
    }
  });

  const substitutions = [];
  const processedPairOff = new Set();

  for (const offManagerId of normalizedOff) {
    if (processedPairOff.has(offManagerId)) {
      continue;
    }

    const partner =
      getPairPartner(offManagerId);

    if (!partner) {
      continue;
    }

    const partnerOff =
      normalizedOff.includes(partner);

    if (partnerOff) {
      processedPairOff.add(offManagerId);
      processedPairOff.add(partner);

      for (const memberId of [
        offManagerId,
        partner,
      ]) {
        const covererId =
          manualAssignments[memberId];

        if (
          !covererId ||
          normalizedOff.includes(covererId)
        ) {
          continue;
        }

        applyPairSubstitution({
          shifts,
          substitutions,
          offManagerId: memberId,
          covererId,
          type: "manual_rop",
        });
      }

      continue;
    }

    processedPairOff.add(offManagerId);

    applyPairSubstitution({
      shifts,
      substitutions,
      offManagerId,
      covererId: partner,
    });
  }

  const quintetOff = normalizedOff.filter(
    (managerId) =>
      QUINTET_MANAGER_IDS.includes(
        managerId
      )
  );

  const quintetWorking =
    QUINTET_MANAGER_IDS.filter(
      (managerId) =>
        !normalizedOff.includes(managerId)
    );

  if (
    quintetOff.length > 0 &&
    quintetWorking.length > 0
  ) {
    const slots = splitShiftIntoSlots(
      quintetWorking.length
    );

    quintetWorking.forEach(
      (workerId, index) => {
        const existing =
          existingShifts[workerId];
        const defaultSlot =
          slots[index] || {
            start: SHIFT_START,
            end: SHIFT_END,
          };

        const hasCustomSlot =
          existing?.splitCover &&
          existing?.start &&
          existing?.end;

        const start = hasCustomSlot
          ? existing.start
          : defaultSlot.start;
        const end = hasCustomSlot
          ? existing.end
          : defaultSlot.end;

        const coveringFor =
          quintetOff.length === 1
            ? quintetOff[0]
            : quintetOff.join(",");

        shifts[workerId] = {
          ...shifts[workerId],
          active: true,
          coveringFor,
          start,
          end,
          splitCover: true,
        };

        quintetOff.forEach((offId) => {
          substitutions.push({
            from: offId,
            to: workerId,
            type: "quintet_split",
            start,
            end,
          });
        });
      }
    );
  }

  const pendingManualAssignments =
    getPendingManualAssignments(
      normalizedOff,
      manualAssignments
    );

  return {
    shifts,
    substitutions,
    pendingManualAssignments,
    offDays: normalizedOff,
  };
}

export function formatShiftRange(
  start,
  end
) {
  if (!start || !end) {
    return `${SHIFT_START}–${SHIFT_END} MSK`;
  }

  return `${start}–${end} MSK`;
}

export function buildReplacementTooltip({
  isOff,
  coveringFor,
  shiftStart,
  shiftEnd,
  splitCover,
}) {
  if (isOff) {
    return "Выходной";
  }

  if (!coveringFor) {
    return `Смена ${formatShiftRange(shiftStart, shiftEnd)}`;
  }

  const names = coveringFor
    .split(",")
    .map((id) =>
      getManagerNameById(id.trim())
    )
    .filter(Boolean)
    .join(", ");

  const timeLabel = splitCover
    ? formatShiftRange(shiftStart, shiftEnd)
    : formatShiftRange(SHIFT_START, SHIFT_END);

  return `Работает за ${names} · ${timeLabel}`;
}

export function getCoveringManagerIds(
  schedule
) {
  if (!schedule?.shifts) {
    return [];
  }

  return Object.entries(schedule.shifts)
    .filter(
      ([, shift]) => shift?.coveringFor
    )
    .map(([managerId]) => managerId);
}

export function getTodayReplacementSummary(
  shiftInfo
) {
  if (!shiftInfo?.coveringFor) {
    return null;
  }

  const names = String(
    shiftInfo.coveringFor
  )
    .split(",")
    .map((id) =>
      getManagerNameById(id.trim())
    )
    .filter(Boolean)
    .join(", ");

  const hours = formatShiftRange(
    shiftInfo.shift?.start,
    shiftInfo.shift?.end
  );

  return {
    coveringFor: shiftInfo.coveringFor,
    names,
    hours,
    splitCover: Boolean(
      shiftInfo.shift?.splitCover
    ),
    shiftStart: shiftInfo.shift?.start,
    shiftEnd: shiftInfo.shift?.end,
  };
}
