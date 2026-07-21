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
  removeOffDays,
} from "./timeOffDates";

import {
  syncSubstitutionNotifications,
} from "../../services/reminderSyncService";

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
      offDays,
      { existing }
    );

  try {
    const traffic =
      await getTrafficByDate(date);

    await updateTrafficAmount(
      date,
      schedule,
      Number(traffic?.trafficAmount || 0)
    );
  } catch (error) {
    console.warn(
      "Traffic sync after time-off skipped:",
      error
    );
  }

  try {
    await syncSubstitutionNotifications({
      schedule,
    });
  } catch (error) {
    console.warn(
      "Substitution notifications skipped:",
      error
    );
  }

  return schedule;
}

async function removeOffDayForDate(
  date,
  managerId
) {
  const existing =
    (await getScheduleByDate(date)) ||
    buildScheduleDocument(date);

  const offDays = removeOffDays(
    existing.offDays || [],
    managerId
  );

  const schedule =
    await updateScheduleOffDays(
      date,
      offDays,
      { existing }
    );

  try {
    const traffic =
      await getTrafficByDate(date);

    await updateTrafficAmount(
      date,
      schedule,
      Number(traffic?.trafficAmount || 0)
    );
  } catch (error) {
    console.warn(
      "Traffic sync after time-off removal skipped:",
      error
    );
  }

  try {
    await syncSubstitutionNotifications({
      schedule,
    });
  } catch (error) {
    console.warn(
      "Substitution notifications skipped:",
      error
    );
  }

  return schedule;
}

export async function removeApprovedDayOff({
  date,
  managerId,
}) {
  return removeOffDayForDate(
    date,
    managerId
  );
}

export async function removeApprovedVacation({
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
      await removeOffDayForDate(
        date,
        managerId
      )
    );
  }

  return results;
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
