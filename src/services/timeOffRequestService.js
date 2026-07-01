import {
  collection,
  getDoc,
  addDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
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
  if (!userData) {
    callback([]);
    return () => {};
  }

  let requestsQuery;

  if (isLeadership(userData)) {
    requestsQuery = query(
      collection(db, "timeOffRequests"),
      orderBy("createdAt", "desc")
    );
  } else {
    const managerId =
      getCurrentManagerId(userData);

    if (!managerId) {
      callback([]);
      return () => {};
    }

    requestsQuery = query(
      collection(db, "timeOffRequests"),
      where(
        "managerId",
        "==",
        managerId
      ),
      orderBy("createdAt", "desc")
    );
  }

  return onSnapshot(
    requestsQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map(mapRequestDoc)
      );
    },
    (error) => {
      console.error(
        "[timeOffRequestService] subscription failed:",
        error
      );
      callback([]);
    }
  );
}

export async function createTimeOffRequest({
  date,
  comment = "",
  userData,
}) {
  const managerId =
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
