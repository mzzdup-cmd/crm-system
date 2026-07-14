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
  countVacationDays,
} from "../domain/schedule/timeOffDates";

import {
  applyApprovedVacation,
  removeApprovedVacation,
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

export function subscribeVacationRequests(
  userData,
  callback
) {
  return subscribeManagerScopedCollection({
    collectionName: "vacationRequests",
    userData,
    mapDoc: mapRequestDoc,
    callback,
    logLabel: "vacationRequestService",
  });
}

export async function createVacationRequest({
  startDate,
  endDate,
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

  const daysCount = countVacationDays(
    startDate,
    endDate
  );

  if (!daysCount) {
    throw new Error(
      "Некорректный период отпуска"
    );
  }

  const payload = {
    managerId,
    manager,
    startDate,
    endDate,
    daysCount,
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
    collection(db, "vacationRequests"),
    payload
  );

  return {
    id: docRef.id,
    ...payload,
  };
}

export async function reviewVacationRequest({
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
    "vacationRequests",
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
    await applyApprovedVacation({
      startDate: request.startDate,
      endDate: request.endDate,
      managerId: request.managerId,
    });
  }

  return {
    requestId,
    status,
  };
}

function canDeleteVacationRequest(
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

export async function deleteVacationRequest({
  requestId,
  userData,
}) {
  const requestRef = doc(
    db,
    "vacationRequests",
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
    !canDeleteVacationRequest(
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
    await removeApprovedVacation({
      startDate: request.startDate,
      endDate: request.endDate,
      managerId: request.managerId,
    });
  }

  await deleteDoc(requestRef);

  return { requestId };
}
