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
  isAdmin,
  getCurrentManagerId,
} from "../domain/auth/roleHelpers";
import {
  buildCreateAudit,
  buildUpdateAudit,
  buildDeleteAudit,
} from "../domain/audit/auditFields";
import {
  resolveManagerDisplayName,
} from "./clientService";

function mapBonusDoc(snapshot) {
  const data = snapshot.data();
  const normalized =
    normalizeManagerFields(data);

  return {
    id: snapshot.id,
    ...data,
    ...normalized,
  };
}

export function normalizeBonusPayload(data) {
  const { managerId, manager } =
    normalizeManagerFields(data);

  return {
    ...data,
    managerId,
    manager,
    amount: Number(data.amount || 0),
    createdAt:
      data.createdAt || Date.now(),
    deletedAt: data.deletedAt ?? null,
  };
}

function filterActiveBonuses(bonuses) {
  return bonuses.filter(
    (bonus) => !bonus.deletedAt
  );
}

export async function getAllManualBonuses() {
  const snapshot = await getDocs(
    collection(db, "manualBonuses")
  );

  return filterActiveBonuses(
    snapshot.docs.map(mapBonusDoc)
  );
}

export async function getManualBonusesForUser(
  userData
) {
  if (isAdmin(userData)) {
    return getAllManualBonuses();
  }

  const managerId =
    getCurrentManagerId(userData);

  if (!managerId) {
    return [];
  }

  const bonusesQuery = query(
    collection(db, "manualBonuses"),
    where(
      "managerId",
      "==",
      managerId
    )
  );

  const snapshot =
    await getDocs(bonusesQuery);

  return filterActiveBonuses(
    snapshot.docs.map(mapBonusDoc)
  );
}

export async function addManualBonus(
  data,
  userData
) {
  const payload = {
    ...normalizeBonusPayload(data),
    ...(userData
      ? buildCreateAudit(userData)
      : {}),
  };

  const docRef = await addDoc(
    collection(db, "manualBonuses"),
    payload
  );

  return {
    id: docRef.id,
    ...payload,
  };
}

export async function updateManualBonus({
  bonusId,
  updates,
  userData,
}) {
  const payload = {
    ...normalizeBonusPayload(updates),
    ...buildUpdateAudit(userData),
  };

  await updateDoc(
    doc(db, "manualBonuses", bonusId),
    payload
  );

  return {
    id: bonusId,
    ...payload,
  };
}

export async function deleteManualBonus({
  bonusId,
  userData,
}) {
  await updateDoc(
    doc(db, "manualBonuses", bonusId),
    buildDeleteAudit(userData)
  );

  return { bonusId };
}

export function getBonusManagerName(bonus) {
  return resolveManagerDisplayName(
    bonus.managerId || bonus.manager
  );
}
