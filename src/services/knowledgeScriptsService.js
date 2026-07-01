import {
  collection,
  addDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
} from "firebase/firestore";

import { db } from "./firebase";

import {
  normalizeManagerFields,
} from "../domain/auth/managerMigration";

import {
  isLeadership,
  getCurrentManagerId,
} from "../domain/auth/roleHelpers";

import {
  buildCreateAudit,
  buildUpdateAudit,
  buildDeleteAudit,
} from "../domain/audit/auditFields";

import {
  getManagerNameById,
} from "../constants/managers";

const COLLECTION = "knowledgeScripts";

function mapDoc(snapshot) {
  const data = snapshot.data();
  const normalized =
    normalizeManagerFields(data);

  return {
    id: snapshot.id,
    ...data,
    ...normalized,
  };
}

function normalizePayload(data) {
  return {
    title: String(data.title || "").trim(),
    content: String(data.content || "").trim(),
    tags: Array.isArray(data.tags)
      ? data.tags.map((tag) =>
          String(tag).trim().toLowerCase()
        ).filter(Boolean)
      : [],
    pinned: Boolean(data.pinned),
    updatedAt: Date.now(),
  };
}

export function subscribeKnowledgeScripts(
  userData,
  callback
) {
  if (!userData) {
    callback([]);
    return () => {};
  }

  const scriptsQuery = query(
    collection(db, COLLECTION),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(
    scriptsQuery,
    (snapshot) => {
      callback(snapshot.docs.map(mapDoc));
    },
    () => callback([])
  );
}

export function canEditScript(
  script,
  userData
) {
  if (!script || !userData) {
    return false;
  }

  if (isLeadership(userData)) {
    return true;
  }

  const managerId =
    getCurrentManagerId(userData);

  return (
    managerId &&
    script.managerId === managerId
  );
}

export async function createKnowledgeScript(
  data,
  userData
) {
  const managerId =
    getCurrentManagerId(userData);

  if (!managerId && !isLeadership(userData)) {
    throw new Error("Нет прав");
  }

  const payload = {
    ...normalizePayload(data),
    managerId:
      data.managerId || managerId,
    manager:
      data.manager ||
      userData.name ||
      getManagerNameById(managerId),
    createdAt: Date.now(),
    deletedAt: null,
    ...buildCreateAudit(userData),
  };

  const docRef = await addDoc(
    collection(db, COLLECTION),
    payload
  );

  return { id: docRef.id, ...payload };
}

export async function updateKnowledgeScript({
  id,
  updates,
  userData,
  existing,
}) {
  if (!canEditScript(existing, userData)) {
    throw new Error("Нет прав");
  }

  await updateDoc(
    doc(db, COLLECTION, id),
    {
      ...normalizePayload(updates),
      ...buildUpdateAudit(userData),
    }
  );
}

export async function deleteKnowledgeScript({
  id,
  userData,
  existing,
}) {
  if (!canEditScript(existing, userData)) {
    throw new Error("Нет прав");
  }

  await updateDoc(
    doc(db, COLLECTION, id),
    buildDeleteAudit(userData)
  );
}

export async function getKnowledgeScriptsForUser(
  userData
) {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION),
      orderBy("updatedAt", "desc")
    )
  );

  const items = snapshot.docs
    .map(mapDoc)
    .filter((item) => !item.deletedAt);

  if (isLeadership(userData)) {
    return items;
  }

  const managerId =
    getCurrentManagerId(userData);

  return items.filter(
    (item) =>
      !item.managerId ||
      item.managerId === managerId
  );
}
