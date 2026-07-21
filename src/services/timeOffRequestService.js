import {
  collection,
  getDoc,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

import { db } from "./firebase";

import {
  managerRequestMatchesUser,
  normalizeManagerFields,
} from "../domain/auth/managerMigration";

import {
  isLeadership,
  resolveOwnershipManagerFieldsForWrite,
} from "../domain/auth/roleHelpers";

import {
  buildWriteAuditFields,
  buildUpdateAudit,
} from "../domain/audit/auditFields";

import { auth } from "./firebase";

import {
  REQUEST_STATUS,
  normalizeRequestStatus,
} from "../constants/timeOff";

import {
  applyApprovedDayOff,
  removeApprovedDayOff,
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
    status: normalizeRequestStatus(
      data.status
    ),
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
  createdByUid = null,
}) {
  const { managerId, manager } =
    resolveOwnershipManagerFieldsForWrite(
      userData
    );

  if (!managerId) {
    throw new Error(
      "Manager ID не найден"
    );
  }

  const payload = {
    managerId,
    manager,
    date,
    comment: comment.trim(),
    status: REQUEST_STATUS.PENDING,
    reviewComment: "",
    reviewedBy: null,
    reviewedAt: null,
    ...buildWriteAuditFields(
      userData,
      createdByUid ||
        auth.currentUser?.uid
    ),
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

function canDeleteTimeOffRequest(
  request,
  userData
) {
  if (isLeadership(userData)) {
    return true;
  }

  return (
    managerRequestMatchesUser(
      request,
      userData
    ) &&
    (
      request.status ===
        REQUEST_STATUS.PENDING ||
      request.status ===
        REQUEST_STATUS.APPROVED
    )
  );
}

export async function deleteTimeOffRequest({
  requestId,
  userData,
}) {
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

  const request = {
    id: snapshot.id,
    ...snapshot.data(),
    status: normalizeRequestStatus(
      snapshot.data().status
    ),
  };

  if (
    !canDeleteTimeOffRequest(
      request,
      userData
    )
  ) {
    throw new Error(
      "Нет прав на удаление"
    );
  }

  if (
    request.status ===
    REQUEST_STATUS.APPROVED
  ) {
    try {
      await removeApprovedDayOff({
        date: request.date,
        managerId: request.managerId,
      });
    } catch (error) {
      console.warn(
        "Schedule update after time-off delete skipped:",
        error
      );
    }
  }

  await deleteDoc(requestRef);

  return { requestId };
}
