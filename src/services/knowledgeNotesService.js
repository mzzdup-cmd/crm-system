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
  buildCreateAudit,
  buildUpdateAudit,
  buildDeleteAudit,
} from "../domain/audit/auditFields";

import { isAdmin } from "../domain/auth/roleHelpers";

const COLLECTION = "knowledgeNotes";

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
    category: String(data.category || "").trim(),
    links: Array.isArray(data.links)
      ? data.links.filter(Boolean)
      : [],
    pinned: Boolean(data.pinned),
    updatedAt: Date.now(),
  };
}

export function subscribeKnowledgeNotes(callback) {
  const notesQuery = query(
    collection(db, COLLECTION),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(
    notesQuery,
    (snapshot) => {
      callback(snapshot.docs.map(mapDoc));
    },
    () => callback([])
  );
}

export async function createKnowledgeNote(
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

export async function updateKnowledgeNote({
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

export async function deleteKnowledgeNote({
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

export async function getAllKnowledgeNotes() {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION),
      orderBy("updatedAt", "desc")
    )
  );

  return snapshot.docs
    .map(mapDoc)
    .filter((item) => !item.deletedAt);
}
