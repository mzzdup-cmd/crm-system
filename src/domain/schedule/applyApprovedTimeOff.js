import {
  getScheduleByDate,
  updateScheduleOffDays,
} from "../../services/scheduleService";

import {
  getTrafficByDate,
  updateTrafficAmount,
} from "../../services/trafficService";

import {
  buildScheduleDocument,
} from "./scheduleLogic";

import {
  enumerateDateRange,
  mergeOffDays,
} from "./timeOffDates";

async function applyOffDayForDate(
  date,
  managerId
) {
  const existing =
    (await getScheduleByDate(date)) ||
    buildScheduleDocument(date);

  const offDays = mergeOffDays(
    existing.offDays || [],
    managerId
  );

  const schedule =
    await updateScheduleOffDays(
      date,
      offDays
    );

  const traffic =
    await getTrafficByDate(date);

  await updateTrafficAmount(
    date,
    schedule,
    Number(traffic?.trafficAmount || 0)
  );

  return schedule;
}

export async function applyApprovedDayOff({
  date,
  managerId,
}) {
  return applyOffDayForDate(
    date,
    managerId
  );
}

export async function applyApprovedVacation({
  startDate,
  endDate,
  managerId,
}) {
  const dates = enumerateDateRange(
    startDate,
    endDate
  );

  const results = [];

  for (const date of dates) {
    results.push(
      await applyOffDayForDate(
        date,
        managerId
      )
    );
  }

  return results;
}
