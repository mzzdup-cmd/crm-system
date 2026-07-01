import {
  collection,
  getDoc,
  addDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

import { db } from "./firebase";

import {
  normalizeManagerFields,
} from "../domain/auth/managerMigration";

import {
  isLeadership,
  getCurrentManagerId,
  getFirestoreManagerId,
} from "../domain/auth/roleHelpers";

import {
  buildCreateAudit,
  buildUpdateAudit,
} from "../domain/audit/auditFields";

import {
  REQUEST_STATUS,
} from "../constants/timeOff";

import {
  getManagerNameById,
} from "../constants/managers";

import {
  applyApprovedDayOff,
} from "../domain/schedule/applyApprovedTimeOff";

import {
  subscribeManagerScopedCollection,
} from "./managerScopedSubscription";

function mapRequestDoc(snapshot) {
  const data = snapshot.data();
  const normalized =
    normalizeManagerFields(data);

  return {
    id: snapshot.id,
    ...data,
    ...normalized,
  };
}

export function subscribeTimeOffRequests(
  userData,
  callback
) {
  return subscribeManagerScopedCollection({
    collectionName: "timeOffRequests",
    userData,
    mapDoc: mapRequestDoc,
    callback,
    logLabel: "timeOffRequestService",
  });
}

export async function createTimeOffRequest({
  date,
  comment = "",
  userData,
}) {
  const managerId =
    getFirestoreManagerId(userData) ||
    getCurrentManagerId(userData);

  if (!managerId) {
    throw new Error(
      "Manager ID не найден"
    );
  }

  const payload = {
    managerId,
    manager:
      userData.name ||
      getManagerNameById(managerId),
    date,
    comment: comment.trim(),
    status: REQUEST_STATUS.PENDING,
    reviewComment: "",
    reviewedBy: null,
    reviewedAt: null,
    createdAt: Date.now(),
    ...buildCreateAudit(userData),
  };

  const docRef = await addDoc(
    collection(db, "timeOffRequests"),
    payload
  );

  return {
    id: docRef.id,
    ...payload,
  };
}

export async function reviewTimeOffRequest({
  requestId,
  status,
  reviewComment = "",
  userData,
}) {
  if (!isLeadership(userData)) {
    throw new Error(
      "Нет прав на рассмотрение"
    );
  }

  const requestRef = doc(
    db,
    "timeOffRequests",
    requestId
  );

  const snapshot =
    await getDoc(requestRef);

  if (!snapshot.exists()) {
    throw new Error(
      "Запрос не найден"
    );
  }

  const request = snapshot.data();

  const updates = {
    status,
    reviewComment: reviewComment.trim(),
    reviewedBy: userData.uid,
    reviewedAt: Date.now(),
    ...buildUpdateAudit(userData),
  };

  await updateDoc(requestRef, updates);

  if (status === REQUEST_STATUS.APPROVED) {
    await applyApprovedDayOff({
      date: request.date,
      managerId: request.managerId,
    });
  }

  return {
    requestId,
    status,
  };
}
