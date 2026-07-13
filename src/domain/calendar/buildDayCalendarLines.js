import { MANAGERS } from "../../constants/managers.js";

import {
  getManagerNameById,
} from "../../constants/managers.js";

import {
  buildScheduleDocument,
  getManagerShiftInfo,
  resolveEffectiveSchedule,
} from "../schedule/scheduleLogic.js";

import {
  getMajorCalendarAlerts,
  getMajorAlertLabel,
} from "./calendarAlerts.js";

import {
  normalizeReplacementManagerId,
} from "./replacementLogic.js";

function formatCovererLabel(
  managerId,
  schedule
) {
  const name =
    getManagerNameById(managerId) ||
    managerId;
  const shift =
    schedule?.shifts?.[managerId];

  if (
    shift?.start &&
    shift?.end &&
    shift?.splitCover
  ) {
    return `${name} (${shift.start}–${shift.end} MSK)`;
  }

  return name;
}

export function buildDayCalendarLines({
  date,
  schedule = null,
  events = [],
}) {
  const lines = [];
  const effective = resolveEffectiveSchedule(
    schedule || buildScheduleDocument(date),
    date
  );

  getMajorCalendarAlerts(events).forEach(
    (event) => {
      lines.push({
        id: `alert_${event.id || `${event.type}_${event.title}`}`,
        kind: "alert",
        label: getMajorAlertLabel(event),
        tooltip:
          event.description ||
          event.title ||
          getMajorAlertLabel(event),
      });
    }
  );

  MANAGERS.forEach((manager) => {
    const managerId =
      normalizeReplacementManagerId(
        manager.id
      );
    const info = getManagerShiftInfo(
      effective,
      managerId
    );

    if (!info?.isOff) {
      return;
    }

    const coverers = (
      info.coveredBy || []
    )
      .map((id) =>
        formatCovererLabel(
          id,
          effective
        )
      )
      .filter(Boolean);

    const tooltip = coverers.length
      ? `Заменяет: ${coverers.join(", ")}`
      : "Замена пока не назначена";

    lines.push({
      id: `off_${managerId}`,
      kind: "off",
      label: `${getManagerNameById(managerId)} — выходной`,
      tooltip,
    });
  });

  return lines;
}
