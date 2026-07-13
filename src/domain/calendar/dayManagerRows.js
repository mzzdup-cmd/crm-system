import { MANAGERS } from "../../constants/managers.js";

import {
  getManagerInitials,
} from "./calendarAggregator";

import {
  getManagerNameById,
} from "../../constants/managers.js";

import {
  buildScheduleDocument,
  getManagerShiftInfo,
  resolveEffectiveSchedule,
} from "../schedule/scheduleLogic.js";

import {
  buildReplacementTooltip,
  normalizeReplacementManagerId,
} from "./replacementLogic.js";

function getShortManagerLabel(managerId) {
  const name =
    getManagerNameById(managerId) || "?";
  const parts = name.split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}.${parts[1]}`;
  }

  return name.slice(0, 6);
}

export function buildDayManagerRows({
  date,
  schedule = null,
}) {
  const effective = resolveEffectiveSchedule(
    schedule || buildScheduleDocument(date),
    date
  );

  return MANAGERS.map((manager) => {
    const managerId =
      normalizeReplacementManagerId(
        manager.id
      );
    const info = getManagerShiftInfo(
      effective,
      managerId
    );
    const isOff = Boolean(info?.isOff);
    const coveringFor =
      info?.coveringFor || null;
    const shiftStart = info?.shift?.start;
    const shiftEnd = info?.shift?.end;
    const splitCover = Boolean(
      info?.shift?.splitCover
    );

    let statusLabel = "работает";

    if (isOff) {
      statusLabel = "выходной";
    } else if (coveringFor) {
      const names = coveringFor
        .split(",")
        .map((id) =>
          getManagerNameById(id.trim())
        )
        .filter(Boolean)
        .join(", ");

      statusLabel = `→ ${names}`;
    }

    return {
      managerId,
      name: manager.name,
      shortLabel:
        getShortManagerLabel(managerId),
      initials:
        getManagerInitials(managerId),
      isOff,
      isCovering: Boolean(coveringFor),
      coveringFor,
      shiftStart,
      shiftEnd,
      splitCover,
      highlight: isOff || Boolean(coveringFor),
      statusLabel,
      tooltip: buildReplacementTooltip({
        isOff,
        coveringFor,
        shiftStart,
        shiftEnd,
        splitCover,
      }),
    };
  });
}
