import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";

import { db } from "./firebase";
import {
  normalizeManagerFields,
} from "../domain/auth/managerMigration";
import {
  isLeadership,
  getFirestoreManagerId,
} from "../domain/auth/roleHelpers";
import {
  buildCreateAudit,
  buildUpdateAudit,
  buildDeleteAudit,
} from "../domain/audit/auditFields";
import { NIGHT_SHIFT_BONUS } from "../constants/salary";
import {
  resolveManagerDisplayName,
} from "./clientService";

function mapShiftDoc(snapshot) {
  const data = snapshot.data();
  const normalized =
    normalizeManagerFields(data);

  return {
    id: snapshot.id,
    ...data,
    ...normalized,
  };
}

export function normalizeShiftPayload(data) {
  const { managerId, manager } =
    normalizeManagerFields(data);

  return {
    ...data,
    managerId,
    manager,
    amount:
      data.amount ?? NIGHT_SHIFT_BONUS,
    createdAt:
      data.createdAt || Date.now(),
    deletedAt: data.deletedAt ?? null,
  };
}

function filterActiveShifts(shifts) {
  return shifts.filter(
    (shift) => !shift.deletedAt
  );
}

export async function getAllNightShifts() {
  const snapshot = await getDocs(
    collection(db, "nightShifts")
  );

  return filterActiveShifts(
    snapshot.docs.map(mapShiftDoc)
  );
}

export async function getNightShiftsForUser(
  userData
) {
  if (isLeadership(userData)) {
    return getAllNightShifts();
  }

  const managerId =
    getFirestoreManagerId(userData);

  if (!managerId) {
    return [];
  }

  try {
    const shiftsQuery = query(
      collection(db, "nightShifts"),
      where(
        "managerId",
        "==",
        managerId
      )
    );

    const snapshot =
      await getDocs(shiftsQuery);

    return filterActiveShifts(
      snapshot.docs.map(mapShiftDoc)
    );
  } catch (error) {
    console.warn(
      "[shiftService] night shifts query failed:",
      error
    );
    return [];
  }
}

export async function addNightShift(
  data,
  userData
) {
  const payload = {
    ...normalizeShiftPayload(data),
    ...(userData
      ? buildCreateAudit(userData)
      : {}),
  };

  const docRef = await addDoc(
    collection(db, "nightShifts"),
    payload
  );

  return {
    id: docRef.id,
    ...payload,
  };
}

export async function updateNightShift({
  shiftId,
  updates,
  userData,
}) {
  const payload = {
    ...normalizeShiftPayload(updates),
    ...buildUpdateAudit(userData),
  };

  await updateDoc(
    doc(db, "nightShifts", shiftId),
    payload
  );

  return {
    id: shiftId,
    ...payload,
  };
}

export async function deleteNightShift({
  shiftId,
  userData,
}) {
  await updateDoc(
    doc(db, "nightShifts", shiftId),
    buildDeleteAudit(userData)
  );

  return { shiftId };
}

export function getShiftManagerName(shift) {
  return resolveManagerDisplayName(
    shift.managerId || shift.manager
  );
}
