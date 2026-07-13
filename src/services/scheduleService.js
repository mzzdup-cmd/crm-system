import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";

import { db } from "./firebase";
import {
  buildScheduleDocument,
  getTodayDateString,
} from "../domain/schedule/scheduleLogic";

function mapScheduleDoc(snapshot) {
  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export async function getScheduleByDate(date) {
  const ref = doc(db, "schedule", date);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return mapScheduleDoc(snapshot);
}

export async function getTodaySchedule() {
  const date = getTodayDateString();

  return getScheduleByDate(date);
}

export async function saveSchedule(date, payload) {
  const ref = doc(db, "schedule", date);

  const schedule = {
    ...payload,
    date,
    updatedAt: Date.now(),
  };

  await setDoc(ref, schedule, {
    merge: true,
  });

  return schedule;
}

export async function updateScheduleOffDays(
  date,
  offDays,
  options = {}
) {
  const existing =
    options.existing ||
    (await getScheduleByDate(date));

  const schedule = buildScheduleDocument(
    date,
    {
      offDays,
      manualAssignments:
        options.manualAssignments ??
        existing?.manualAssignments ??
        {},
      existingShifts:
        existing?.shifts ?? {},
    }
  );

  return saveSchedule(date, schedule);
}

export async function updateManualAssignments(
  date,
  manualAssignments
) {
  const existing =
    (await getScheduleByDate(date)) ||
    buildScheduleDocument(date);

  const schedule = buildScheduleDocument(
    date,
    {
      offDays: existing.offDays || [],
      manualAssignments,
      existingShifts:
        existing.shifts || {},
    }
  );

  return saveSchedule(date, schedule);
}

export async function updateManagerShiftSlot({
  date,
  managerId,
  start,
  end,
}) {
  const existing =
    (await getScheduleByDate(date)) ||
    buildScheduleDocument(date);

  const shifts = {
    ...(existing.shifts || {}),
    [managerId]: {
      ...(existing.shifts?.[managerId] || {}),
      start,
      end,
      splitCover: true,
    },
  };

  const schedule = buildScheduleDocument(
    date,
    {
      offDays: existing.offDays || [],
      manualAssignments:
        existing.manualAssignments || {},
      existingShifts: shifts,
    }
  );

  return saveSchedule(date, schedule);
}

export async function getRecentSchedules(count = 7) {
  const snapshot = await getDocs(
    query(
      collection(db, "schedule"),
      orderBy("date", "desc"),
      limit(count)
    )
  );

  return snapshot.docs.map(mapScheduleDoc);
}

export async function getTodayScheduleOrDefault() {
  const date = getTodayDateString();
  const existing =
    await getScheduleByDate(date);

  if (existing) {
    return existing;
  }

  return buildScheduleDocument(date);
}

/** Admin-only: persist default schedule if missing */
export async function ensureTodaySchedule() {
  const date = getTodayDateString();
  const existing =
    await getScheduleByDate(date);

  if (existing) {
    return existing;
  }

  const schedule =
    buildScheduleDocument(date);

  return saveSchedule(date, schedule);
}
