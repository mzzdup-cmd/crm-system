import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

import { db } from "./firebase";

import {
  buildCreateAudit,
  buildUpdateAudit,
  buildDeleteAudit,
} from "../domain/audit/auditFields";

import { isAdmin } from "../domain/auth/roleHelpers";

const COLLECTION = "knowledgeFaq";

function mapDoc(snapshot) {
  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

function normalizePayload(data) {
  return {
    title: String(data.title || "").trim(),
    content: String(data.content || "").trim(),
    pinned: Boolean(data.pinned),
    sortOrder: Number(data.sortOrder || 0),
    updatedAt: Date.now(),
  };
}

export function subscribeKnowledgeFaq(callback) {
  const faqQuery = query(
    collection(db, COLLECTION),
    orderBy("sortOrder", "asc")
  );

  return onSnapshot(
    faqQuery,
    (snapshot) => {
      callback(snapshot.docs.map(mapDoc));
    },
    () => callback([])
  );
}

export async function createKnowledgeFaqItem(
  data,
  userData
) {
  if (!isAdmin(userData)) {
    throw new Error("Нет прав");
  }

  const payload = {
    ...normalizePayload(data),
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

export async function updateKnowledgeFaqItem({
  id,
  updates,
  userData,
}) {
  if (!isAdmin(userData)) {
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

export async function deleteKnowledgeFaqItem({
  id,
  userData,
}) {
  if (!isAdmin(userData)) {
    throw new Error("Нет прав");
  }

  await updateDoc(
    doc(db, COLLECTION, id),
    buildDeleteAudit(userData)
  );
}

export async function getAllKnowledgeFaq() {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION),
      orderBy("sortOrder", "asc")
    )
  );

  return snapshot.docs
    .map(mapDoc)
    .filter((item) => !item.deletedAt);
}
