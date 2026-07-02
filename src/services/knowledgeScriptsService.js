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
  resolveOwnershipManagerFieldsForWrite,
  getManagerIdsForScopedQuery,
} from "../domain/auth/roleHelpers";

import {
  buildWriteAuditFields,
  buildUpdateAudit,
  buildDeleteAudit,
} from "../domain/audit/auditFields";

import { auth } from "./firebase";

const COLLECTION = "knowledgeScripts";

function scriptOwnedByUser(script, userData) {
  if (!script?.managerId || !userData) {
    return false;
  }

  const allowedIds =
    getManagerIdsForScopedQuery(userData);

  return allowedIds.includes(
    script.managerId
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

  return scriptOwnedByUser(
    script,
    userData
  );
}

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

export async function createKnowledgeScript(
  data,
  userData,
  createdByUid = null
) {
  const { managerId, manager } =
    resolveOwnershipManagerFieldsForWrite(
      userData,
      data.manager || ""
    );

  const resolvedManagerId =
    isLeadership(userData)
      ? data.managerId || managerId
      : managerId;

  const resolvedManager =
    isLeadership(userData)
      ? data.manager ||
        manager ||
        userData?.name?.trim() ||
        ""
      : manager ||
        userData?.name?.trim() ||
        "";

  if (
    !resolvedManagerId &&
    !isLeadership(userData)
  ) {
    throw new Error("Нет прав");
  }

  if (
    !isLeadership(userData) &&
    (!resolvedManagerId || !resolvedManager)
  ) {
    throw new Error(
      "Не удалось определить менеджера. Обновите страницу."
    );
  }

  const payload = {
    ...normalizePayload(data),
    managerId: resolvedManagerId,
    manager: resolvedManager,
    createdAt: Date.now(),
    deletedAt: null,
    ...buildWriteAuditFields(
      userData,
      createdByUid ||
        auth.currentUser?.uid
    ),
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

  const allowedIds =
    getManagerIdsForScopedQuery(userData);

  return items.filter(
    (item) =>
      !item.managerId ||
      allowedIds.includes(item.managerId)
  );
}
