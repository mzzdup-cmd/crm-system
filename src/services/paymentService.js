import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";

import { db } from "./firebase";
import {
  queueTtRowDeletion,
} from "./ttRowDeletionQueueService";
import {
  normalizeManagerFields,
} from "../domain/auth/managerMigration";
import {
  isLeadership,
  getCurrentManagerId,
  getFirestoreManagerId,
  resolveManagerFieldsForWrite,
} from "../domain/auth/roleHelpers";
import {
  getStartDate,
  resolveNextPaymentDate,
} from "../domain/client/clientDates";
import {
  buildClientAmountUpdate,
} from "../domain/payment/clientAmountRecalc";
import {
  buildSubscriptionOutcomeUpdate,
} from "../domain/client/subscriptionOutcome";
import {
  canEditPayment,
  canDeletePayment,
  isPaymentDeleted,
  canEditPaymentStartDate,
  canEditCuratorStartDate,
  isStartDateOnlyPaymentUpdates,
  isCuratorStartDateOnlyPaymentUpdates,
  shouldSkipClientRecalcForPaymentUpdates,
} from "../domain/payment/paymentPermissions";
import {
  buildWriteAuditFields,
  buildUpdateAudit,
  buildDeleteAudit,
} from "../domain/audit/auditFields";
import { auth } from "./firebase";
import {
  resolveAuditUser,
} from "../domain/audit/resolveAuditUser";
import {
  resolveManagerFromLegacy,
} from "../domain/auth/managerMigration";
import {
  isLegacyPayment,
} from "../domain/payment/legacyPayment";
import {
  isOptionalStartDateDealType,
  isTopupBbDealType,
  needsBudgetFieldForExistingDeal,
} from "../constants/dealTypes";
import {
  BB_BOOKING_STAGE,
} from "../domain/client/bbBookingLogic";
import {
  dialogLinksMatch,
} from "../domain/client/dialogLinkUtils";
import { updateClient, getClientById } from "./clientService";
import {
  maybeNotifyMissingStartDate,
  resolveMissingStartDateReminder,
} from "./missingStartDateReminderService";
import {
  maybeNotifyCuratorStart,
} from "./curatorStartReminderService";
import { getManualBonusesForUser } from "./bonusService";
import { getNightShiftsForUser } from "./shiftService";
import {
  buildSalaryReportBundle,
  filterSalaryRowsForManager,
} from "../domain/salary/salaryPeriod";
import { MANAGERS } from "../constants/managers";

function mapPaymentDoc(snapshot) {
  const data = snapshot.data();
  const normalized =
    normalizePaymentPayload(data);

  return {
    id: snapshot.id,
    ...normalized,
  };
}

function resolvePaymentManagerFields(
  userData,
  manager
) {
  if (userData) {
    return resolveManagerFieldsForWrite(
      userData,
      manager
    );
  }

  return resolveManagerFromLegacy(manager);
}

export function normalizePaymentPayload(data) {
  const { managerId, manager } =
    normalizeManagerFields(data);

  const legacy = isLegacyPayment(data);
  const isLegacyClient =
    data.isLegacyClient === true;
  const isMinimalLegacy =
    legacy && !isLegacyClient;

  const optionalStartDate =
    isOptionalStartDateDealType(
      data.dealType
    );

  let startDate = data.startDate || "";

  if (
    !isMinimalLegacy &&
    !optionalStartDate &&
    !startDate &&
    data.paymentDate
  ) {
    startDate = getStartDate(
      data.paymentDate
    );
  }

  return {
    ...data,
    manager,
    managerId,
    amount: Number(data.amount || 0),
    isLegacy: legacy,
    isLegacyClient,
    startDate,
    curatorStartDate:
      data.curatorStartDate || "",
    createdAt: data.createdAt || Date.now(),
    syncedToSheets: data.syncedToSheets ?? false,
    lastTtSyncSkipReason:
      data.lastTtSyncSkipReason || null,
    deletedAt: data.deletedAt ?? null,
  };
}

function filterActivePayments(payments) {
  return payments.filter(
    (payment) => !isPaymentDeleted(payment)
  );
}

function sortPaymentsDesc(payments) {
  return [...payments].sort(
    (a, b) =>
      Number(b.createdAt || 0) -
      Number(a.createdAt || 0)
  );
}

function paymentHasExportedTtRow(payment) {
  return Boolean(
    payment?.ttRowNumber ||
      payment?.ttUpdatedRange ||
      payment?.sheetsUpdatedRange
  );
}

function shouldQueueTtRowResync(
  payment,
  updates,
  {
    shouldResyncStartDate = false,
    isStartDateOnlyUpdate = false,
    isCuratorStartDateOnlyUpdate = false,
  } = {}
) {
  if (
    isStartDateOnlyUpdate ||
    isCuratorStartDateOnlyUpdate
  ) {
    return false;
  }

  if (shouldResyncStartDate) {
    return false;
  }

  return paymentHasExportedTtRow(payment);
}

async function fetchAllPaymentDocs() {
  const snapshot = await getDocs(
    collection(db, "payments")
  );

  return filterActivePayments(
    snapshot.docs.map(mapPaymentDoc)
  );
}

export async function getAllPayments() {
  const payments =
    await fetchAllPaymentDocs();

  return sortPaymentsDesc(payments);
}

export async function getPaymentById(id) {
  const snapshot = await getDoc(
    doc(db, "payments", id)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return mapPaymentDoc(snapshot);
}

function paymentBelongsToManager(
  payment,
  userData
) {
  const canonicalId =
    getCurrentManagerId(userData);
  const firestoreId =
    getFirestoreManagerId(userData);
  const managerName =
    userData?.name || "";

  return (
    (canonicalId &&
      payment.managerId === canonicalId) ||
    (firestoreId &&
      payment.managerId === firestoreId) ||
    (managerName &&
      payment.manager === managerName)
  );
}

function getManagerQueryIds(userData) {
  const canonicalId =
    getCurrentManagerId(userData);
  const firestoreId =
    getFirestoreManagerId(userData);

  return [
    ...new Set(
      [firestoreId, canonicalId].filter(
        Boolean
      )
    ),
  ];
}

async function queryPaymentsByManagerId(
  managerId
) {
  const snapshot = await getDocs(
    query(
      collection(db, "payments"),
      where(
        "managerId",
        "==",
        managerId
      )
    )
  );

  return filterActivePayments(
    snapshot.docs.map(mapPaymentDoc)
  );
}

async function queryPaymentsByManagerIds(
  managerIds
) {
  const paymentMap = new Map();

  for (const managerId of managerIds) {
    try {
      const payments =
        await queryPaymentsByManagerId(
          managerId
        );

      for (const payment of payments) {
        paymentMap.set(
          payment.id,
          payment
        );
      }
    } catch (error) {
      console.warn(
        `[paymentService] payments query failed for ${managerId}:`,
        error
      );
    }
  }

  return [...paymentMap.values()];
}

export async function getPaymentsForUser(userData) {
  if (isLeadership(userData)) {
    return getAllPayments();
  }

  const queryIds =
    getManagerQueryIds(userData);

  if (!queryIds.length) {
    return [];
  }

  const payments =
    await queryPaymentsByManagerIds(
      queryIds
    );

  if (payments.length > 0) {
    return sortPaymentsDesc(payments);
  }

  try {
    const snapshot = await getDocs(
      query(
        collection(db, "payments"),
        orderBy("createdAt", "desc"),
        limit(5000)
      )
    );

    return sortPaymentsDesc(
      filterActivePayments(
        snapshot.docs
          .map(mapPaymentDoc)
          .filter((payment) =>
            paymentBelongsToManager(
              payment,
              userData
            )
          )
      )
    );
  } catch (error) {
    console.error(
      "[paymentService] getPaymentsForUser fallback failed:",
      error
    );
    throw error;
  }
}

export async function getPaymentsByClientId(clientId) {
  try {
    const paymentsQuery = query(
      collection(db, "payments"),
      where("clientId", "==", clientId),
      orderBy("createdAt", "desc")
    );

    const snapshot =
      await getDocs(paymentsQuery);

    return sortPaymentsDesc(
      filterActivePayments(
        snapshot.docs.map(mapPaymentDoc)
      )
    );
  } catch (error) {
    console.error(
      "[paymentService] getPaymentsByClientId indexed query failed:",
      error
    );

    const paymentsQuery = query(
      collection(db, "payments"),
      where("clientId", "==", clientId)
    );

    const snapshot =
      await getDocs(paymentsQuery);

    return sortPaymentsDesc(
      filterActivePayments(
        snapshot.docs.map(mapPaymentDoc)
      )
    );
  }
}

export async function getRecentPayments(count = 10) {
  const paymentsQuery = query(
    collection(db, "payments"),
    orderBy("createdAt", "desc"),
    limit(count)
  );

  const snapshot =
    await getDocs(paymentsQuery);

  return filterActivePayments(
    snapshot.docs.map(mapPaymentDoc)
  );
}

export async function getRecentPaymentsForUser(
  userData,
  count = 10
) {
  if (isLeadership(userData)) {
    return getRecentPayments(count);
  }

  const managerId =
    getCurrentManagerId(userData);

  if (!managerId) {
    return [];
  }

  const paymentsQuery = query(
    collection(db, "payments"),
    where(
      "managerId",
      "==",
      managerId
    ),
    orderBy("createdAt", "desc"),
    limit(count)
  );

  const snapshot =
    await getDocs(paymentsQuery);

  return filterActivePayments(
    snapshot.docs.map(mapPaymentDoc)
  );
}

export async function recalculateClientAmount(
  clientId
) {
  const client =
    await getClientById(clientId);

  if (!client) {
    throw new Error(
      "Клиент не найден"
    );
  }

  const payments =
    await getPaymentsByClientId(clientId);

  const update =
    buildClientAmountUpdate(
      client,
      payments
    );

  await updateClient(clientId, update);

  return {
    ...client,
    ...update,
  };
}

/** Указать поток для ББ / Рассылка — без пересчёта клиента и лишних полей. */
export async function updatePaymentStartDate({
  paymentId,
  startDate,
  userData,
}) {
  const payment =
    await getPaymentById(paymentId);

  if (!payment) {
    throw new Error(
      "Оплата не найдена"
    );
  }

  if (
    !canEditPaymentStartDate(
      payment,
      userData
    )
  ) {
    throw new Error(
      "Нет прав на редактирование"
    );
  }

  const optionalStartDate =
    isOptionalStartDateDealType(
      payment.dealType
    ) ||
    isOptionalStartDateDealType(
      payment.dealTypeId
    );

  if (!optionalStartDate) {
    throw new Error(
      "Дата старта доступна только для ББ и Рассылки"
    );
  }

  const hasTtRow = paymentHasExportedTtRow(
    payment
  );
  const startDateChanged =
    (startDate || "") !==
    (payment.startDate || "");
  const shouldResyncStartDate =
    payment.syncedToSheets === true &&
    hasTtRow &&
    startDateChanged;

  const payload = {
    startDate: startDate || "",
    ...buildUpdateAudit(
      resolveAuditUser(userData)
    ),
  };

  if (shouldResyncStartDate) {
    payload.ttStartDateResyncPending = true;
  }

  try {
    await updateDoc(
      doc(db, "payments", paymentId),
      payload
    );
  } catch (error) {
    console.error(
      "[paymentService] updatePaymentStartDate failed:",
      {
        paymentId,
        dealType: payment.dealType,
        dealTypeId: payment.dealTypeId,
        managerId: payment.managerId,
        manager: payment.manager,
        payload,
        code: error?.code,
      }
    );
    throw error;
  }

  try {
    await resolveMissingStartDateReminder(
      {
        ...payment,
        ...payload,
        id: paymentId,
      },
      userData
    );
  } catch (error) {
    console.warn(
      "Start date reminder resolve skipped:",
      error
    );
  }

  return {
    id: paymentId,
    ...payment,
    ...payload,
  };
}

export async function updatePaymentCuratorStartDate({
  paymentId,
  curatorStartDate,
  userData,
}) {
  const payment =
    await getPaymentById(paymentId);

  if (!payment) {
    throw new Error(
      "Оплата не найдена"
    );
  }

  if (
    !canEditCuratorStartDate(
      payment,
      userData
    )
  ) {
    throw new Error(
      "Нет прав на редактирование"
    );
  }

  const payload = {
    curatorStartDate:
      curatorStartDate || "",
    ...buildUpdateAudit(
      resolveAuditUser(userData)
    ),
  };

  try {
    await updateDoc(
      doc(db, "payments", paymentId),
      payload
    );
  } catch (error) {
    console.error(
      "[paymentService] updatePaymentCuratorStartDate failed:",
      {
        paymentId,
        dealType: payment.dealType,
        managerId: payment.managerId,
        manager: payment.manager,
        payload,
        code: error?.code,
      }
    );
    throw error;
  }

  return {
    id: paymentId,
    ...payment,
    ...payload,
  };
}

export async function updatePayment({
  paymentId,
  updates,
  userData,
}) {
  const payment =
    await getPaymentById(paymentId);

  if (!payment) {
    throw new Error(
      "Оплата не найдена"
    );
  }

  if (
    !canEditPayment(
      payment,
      userData
    ) &&
    !(
      canEditPaymentStartDate(
        payment,
        userData
      ) &&
      updates.startDate !== undefined
    ) &&
    !(
      canEditCuratorStartDate(
        payment,
        userData
      ) &&
      updates.curatorStartDate !== undefined
    )
  ) {
    throw new Error(
      "Нет прав на редактирование"
    );
  }

  const optionalStartDate =
    isOptionalStartDateDealType(
      payment.dealType
    );
  const hasTtRow = paymentHasExportedTtRow(
    payment
  );
  const startDateChanged =
    updates.startDate !==
    undefined &&
    (updates.startDate || "") !==
      (payment.startDate || "");
  const shouldResyncStartDate =
    optionalStartDate &&
    payment.syncedToSheets === true &&
    hasTtRow &&
    startDateChanged;

  const payload = {
    ...updates,
    ...buildUpdateAudit(
      resolveAuditUser(userData)
    ),
  };

  if (updates.amount !== undefined) {
    payload.amount = Number(
      updates.amount
    );
  }

  if (updates.startDate !== undefined) {
    payload.startDate =
      updates.startDate || "";
  } else if (
    !optionalStartDate
  ) {
    payload.startDate =
      payment.startDate ??
      getStartDate(
        updates.paymentDate ||
          payment.paymentDate
      );
  }

  if (
    updates.curatorStartDate !== undefined
  ) {
    payload.curatorStartDate =
      updates.curatorStartDate || "";
  }

  const isStartDateOnlyUpdate =
    isStartDateOnlyPaymentUpdates(
      updates,
      payment
    );
  const isCuratorStartDateOnlyUpdate =
    isCuratorStartDateOnlyPaymentUpdates(
      updates
    );

  if (shouldResyncStartDate) {
    payload.ttStartDateResyncPending = true;
  } else if (
    shouldQueueTtRowResync(
      payment,
      updates,
      {
        shouldResyncStartDate,
        isStartDateOnlyUpdate,
        isCuratorStartDateOnlyUpdate,
      }
    )
  ) {
    payload.ttRowResyncPending = true;
  } else if (
    !isStartDateOnlyUpdate &&
    !isCuratorStartDateOnlyUpdate &&
    payment.syncedToSheets === true &&
    !hasTtRow
  ) {
    payload.syncedToSheets = false;
  }

  if (updates.course !== undefined) {
    payload.course = updates.course;
  }

  if (updates.tariff !== undefined) {
    payload.tariff = updates.tariff;
  }

  try {
    await updateDoc(
      doc(db, "payments", paymentId),
      payload
    );
  } catch (error) {
    if (error?.code === "permission-denied") {
      console.error(
        "[paymentService] startDate update denied:",
        {
          paymentId,
          dealType: payment.dealType,
          managerId: payment.managerId,
          manager: payment.manager,
          clientId: payment.clientId,
          payloadKeys: Object.keys(payload),
        }
      );
    }

    throw error;
  }

  if (payload.startDate?.trim()) {
    try {
      await resolveMissingStartDateReminder(
        {
          ...payment,
          ...payload,
          id: paymentId,
        },
        userData
      );
    } catch (error) {
      console.warn(
        "Start date reminder resolve skipped:",
        error
      );
    }
  }

  const client =
    payment.clientId &&
    !shouldSkipClientRecalcForPaymentUpdates(
      updates
    )
      ? await recalculateClientAmount(
          payment.clientId
        )
      : null;

  return {
    id: paymentId,
    ...payment,
    ...payload,
    client,
  };
}

export async function updatePaymentWithClient({
  paymentId,
  paymentUpdates,
  clientUpdates,
  userData,
}) {
  const payment =
    await getPaymentById(paymentId);

  if (!payment) {
    throw new Error(
      "Оплата не найдена"
    );
  }

  const result = await updatePayment({
    paymentId,
    updates: paymentUpdates,
    userData,
  });

  if (
    clientUpdates &&
    Object.keys(clientUpdates).length &&
    payment.clientId
  ) {
    await updateClient(
      payment.clientId,
      clientUpdates
    );
  }

  const startDateOnlyUpdate =
    shouldSkipClientRecalcForPaymentUpdates(
      paymentUpdates
    );

  const client =
    payment.clientId &&
    !startDateOnlyUpdate
      ? await recalculateClientAmount(
          payment.clientId
        )
      : null;

  return {
    ...result,
    client,
  };
}

export async function deletePayment({
  paymentId,
  userData,
}) {
  const payment =
    await getPaymentById(paymentId);

  if (!payment) {
    throw new Error(
      "Оплата не найдена"
    );
  }

  if (
    !canDeletePayment(
      payment,
      userData
    )
  ) {
    throw new Error(
      "Нет прав на удаление"
    );
  }

  try {
    await queueTtRowDeletion(payment, {
      sourceType: "payment",
      sourceId: paymentId,
    });
  } catch (error) {
    console.warn(
      "Payment TT row deletion queue failed:",
      error
    );
  }

  await updateDoc(
    doc(db, "payments", paymentId),
    {
      syncedToSheets: false,
      ...buildDeleteAudit(userData),
    }
  );

  const client = payment.clientId
    ? await recalculateClientAmount(
        payment.clientId
      )
    : null;

  return {
    paymentId,
    client,
  };
}

export async function addPaymentRecord({
  client,
  dealType,
  amount,
  paymentSystem,
  invoiceNumber,
  comment,
  clientNote = "",
  manager,
  paymentDate,
  startDate,
  curatorStartDate = "",
  sourceId = null,
  sourceName = "",
  budget = null,
  userData,
  createdByUid = null,
}) {
  const managerFields = userData
    ? resolveManagerFieldsForWrite(
        userData,
        client?.manager || manager
      )
    : normalizeManagerFields({
        manager: client?.manager || manager,
        managerId: client?.managerId,
      });

  if (client?.managerId) {
    const clientManagerFields =
      normalizeManagerFields({
        managerId: client.managerId,
        manager:
          client.manager ||
          managerFields.manager,
      });

    managerFields.managerId =
      clientManagerFields.managerId;
    managerFields.manager =
      clientManagerFields.manager ||
      managerFields.manager;
  }

  const resolvedSourceName =
    sourceName ||
    client?.sourceName ||
    client?.source ||
    "";

  const resolvedSourceId =
    sourceId ||
    client?.sourceId ||
    null;

  const resolvedClientNote =
    clientNote ||
    client?.clientNote ||
    "";

  const paymentPayload = normalizePaymentPayload({
    clientId: client?.id ?? null,
    clientName: client?.name || "",
    dialogLink: client?.dialogLink || "",
    course: client?.course || "",
    tariff: client?.tariff || "",
    dealType,
    amount,
    paymentSystem,
    invoiceNumber,
    comment,
    clientNote: resolvedClientNote,
    manager: managerFields.manager,
    managerId: managerFields.managerId,
    paymentDate,
    startDate,
    curatorStartDate,
    sourceId: resolvedSourceId,
    sourceName: resolvedSourceName,
    ...(budget != null
      ? { budget: Number(budget || 0) }
      : {}),
    syncedToSheets: false,
    ...(userData
      ? buildWriteAuditFields(
          userData,
          createdByUid ||
            auth.currentUser?.uid
        )
      : {}),
  });

  const docRef = await addDoc(
    collection(db, "payments"),
    paymentPayload
  );

  return {
    id: docRef.id,
    ...paymentPayload,
  };
}

export async function applyPaymentToClient({
  client,
  paymentAmount,
  paymentDate,
}) {
  const newAmount =
    Number(client.amount || 0) +
    Number(paymentAmount);

  const remain =
    Number(client.budget || 0) - newAmount;

  const nextPaymentDate =
    remain > 0
      ? resolveNextPaymentDate({
          amount: newAmount,
          budget: client.budget,
          paymentDate,
        })
      : null;

  await updateClient(client.id, {
    amount: newAmount,
    nextPaymentDate,
    ...buildSubscriptionOutcomeUpdate(
      client,
      newAmount
    ),
  });

  return {
    amount: newAmount,
    nextPaymentDate,
    remain,
  };
}

export async function createLegacyClientPayment({
  dialogLink,
  vkLink,
  legacyClientName,
  legacyClientBsId,
  course,
  tariff,
  dealType,
  paymentAmount,
  paymentSystem,
  invoiceNumber,
  comment = "",
  manager,
  paymentDate,
  startDate,
  curatorStartDate = "",
  firstContactDate,
  sourceId = null,
  sourceName = "",
  budget = 0,
  userData,
  createdByUid = null,
}) {
  const managerFields =
    resolvePaymentManagerFields(
      userData,
      manager
    );

  const paymentPayload = normalizePaymentPayload({
    clientId: null,
    clientName:
      legacyClientName ||
      dialogLink.trim(),
    legacyClientName,
    legacyClientBsId,
    course,
    tariff,
    dealType,
    isLegacy: true,
    isLegacyClient: true,
    dialogLink: dialogLink.trim(),
    vkLink,
    amount: paymentAmount,
    paymentSystem,
    invoiceNumber,
    comment: comment.trim(),
    clientNote: legacyClientBsId,
    firstContact: firstContactDate,
    manager: managerFields.manager,
    managerId: managerFields.managerId,
    paymentDate,
    startDate,
    curatorStartDate,
    sourceId,
    sourceName,
    budget: Number(budget || 0),
    syncedToSheets: false,
    ...(userData
      ? buildWriteAuditFields(
          userData,
          createdByUid ||
            auth.currentUser?.uid
        )
      : {}),
  });

  const docRef = await addDoc(
    collection(db, "payments"),
    paymentPayload
  );

  const savedPayment = {
    id: docRef.id,
    ...paymentPayload,
  };

  try {
    await maybeNotifyCuratorStart({
      payment: savedPayment,
      managerName:
        managerFields.manager,
      userData,
    });
  } catch (error) {
    console.warn(
      "Curator start reminder skipped:",
      error
    );
  }

  return savedPayment;
}

export async function findLegacySubscriber({
  bsId,
  dialogLink,
  userData,
}) {
  const normalizedId = bsId?.trim();
  const normalizedLink =
    dialogLink?.trim();

  if (
    (!normalizedId && !normalizedLink) ||
    !userData
  ) {
    return null;
  }

  const payments =
    await getPaymentsForUser(userData);

  const matchingPayments = payments
    .filter((payment) => {
      if (normalizedId) {
        const storedId =
          payment.legacyClientBsId ||
          payment.clientNote ||
          "";

        if (
          storedId.trim() === normalizedId
        ) {
          return true;
        }
      }

      if (normalizedLink) {
        return dialogLinksMatch(
          payment.dialogLink,
          normalizedLink
        );
      }

      return false;
    })
    .sort(
      (a, b) =>
        Number(b.createdAt || 0) -
        Number(a.createdAt || 0)
    );

  if (!matchingPayments.length) {
    return null;
  }

  const latest = matchingPayments[0];
  const totalPaidInCrm =
    matchingPayments.reduce(
      (sum, payment) =>
        sum +
        Number(payment.amount || 0),
      0
    );
  const budget = Number(
    latest.budget || 0
  );
  const remainInCrm =
    budget > 0
      ? Math.max(
          0,
          budget - totalPaidInCrm
        )
      : null;

  return {
    ...latest,
    totalPaidInCrm,
    remainInCrm,
    paymentCount:
      matchingPayments.length,
  };
}

/** @deprecated use findLegacySubscriber */
export async function findLegacySubscriberByBsId(
  bsId,
  userData
) {
  return findLegacySubscriber({
    bsId,
    userData,
  });
}

export async function createLegacyPayment({
  dialogLink,
  dealType,
  paymentAmount,
  comment = "",
  manager,
  paymentDate,
  sourceId = null,
  sourceName = "",
  userData,
  createdByUid = null,
}) {
  const managerFields =
    resolvePaymentManagerFields(
      userData,
      manager
    );

  const paymentPayload = normalizePaymentPayload({
    clientId: null,
    clientName: "",
    course: "",
    tariff: "",
    dealType,
    isLegacy: true,
    dialogLink: dialogLink.trim(),
    amount: paymentAmount,
    paymentSystem: "",
    invoiceNumber: "",
    comment: comment.trim(),
    manager: managerFields.manager,
    managerId: managerFields.managerId,
    paymentDate,
    startDate: "",
    sourceId,
    sourceName,
    syncedToSheets: false,
    ...(userData
      ? buildWriteAuditFields(
          userData,
          createdByUid ||
            auth.currentUser?.uid
        )
      : {}),
  });

  const docRef = await addDoc(
    collection(db, "payments"),
    paymentPayload
  );

  return {
    id: docRef.id,
    ...paymentPayload,
  };
}

export async function createPayment({
  client,
  dealType,
  paymentAmount,
  paymentSystem,
  invoiceNumber,
  comment,
  clientNote = "",
  manager,
  paymentDate,
  startDate,
  curatorStartDate = "",
  sourceId = null,
  sourceName = "",
  budget = null,
  userData,
  createdByUid = null,
}) {
  const isUpsellBudget =
    needsBudgetFieldForExistingDeal(dealType);
  const budgetValue =
    budget != null
      ? Number(budget || 0)
      : null;

  const paymentPayload = await addPaymentRecord({
    client,
    dealType,
    amount: paymentAmount,
    paymentSystem,
    invoiceNumber,
    comment,
    clientNote,
    manager,
    paymentDate,
    startDate,
    curatorStartDate,
    sourceId,
    sourceName,
    budget: isUpsellBudget ? budgetValue : null,
    userData,
    createdByUid,
  });

  let clientForApply = client;

  if (
    isUpsellBudget &&
    budgetValue != null &&
    budgetValue > 0
  ) {
    await updateClient(client.id, {
      budget: budgetValue,
    });

    clientForApply = {
      ...client,
      budget: budgetValue,
    };
  }

  let updatedClient =
    await applyPaymentToClient({
      client: clientForApply,
      paymentAmount,
      paymentDate,
    });

  if (
    isTopupBbDealType(dealType) &&
    client.subscriptionStage ===
      BB_BOOKING_STAGE
  ) {
    await updateClient(client.id, {
      subscriptionStage: "converted",
    });

    updatedClient = {
      ...updatedClient,
      subscriptionStage: "converted",
    };
  }


  try {
    await maybeNotifyMissingStartDate({
      payment: paymentPayload,
      managerName: manager,
      userData,
    });
  } catch (error) {
    console.warn(
      "Start date reminder skipped:",
      error
    );
  }

  try {
    await maybeNotifyCuratorStart({
      payment: paymentPayload,
      client,
      managerName: manager,
      userData,
    });
  } catch (error) {
    console.warn(
      "Curator start reminder skipped:",
      error
    );
  }

  return {
    payment: paymentPayload,
    client: updatedClient,
  };
}

/** @deprecated use getPaymentsForUser */
export function filterPaymentsByAccess(payments, userData) {
  if (isLeadership(userData)) {
    return payments;
  }

  const userManagerId = userData?.managerId;
  const userName = userData?.name;

  return payments.filter((payment) => {
    if (userManagerId && payment.managerId) {
      return payment.managerId === userManagerId;
    }

    return payment.manager === userName;
  });
}

export function buildManagersStats(payments) {
  const managersStats = {};

  payments.forEach((payment) => {
    if (payment.deletedAt) {
      return;
    }

    const managerKey =
      payment.managerId ||
      payment.manager;

    if (!managerKey) {
      return;
    }

    if (!managersStats[managerKey]) {
      managersStats[managerKey] = {
        revenue: 0,
        deals: 0,
      };
    }

    managersStats[managerKey].revenue += Number(
      payment.amount || 0
    );

    managersStats[managerKey].deals += 1;
  });

  return managersStats;
}

export async function getSalaryReportForUser(userData) {
  let payments;

  try {
    payments =
      await getPaymentsForUser(userData);
  } catch (error) {
    console.error(
      "[salary] payments load failed:",
      error
    );
    throw error;
  }

  let nightShifts = [];
  let manualBonuses = [];

  try {
    nightShifts =
      await getNightShiftsForUser(userData);
  } catch (error) {
    console.error(
      "[salary] night shifts load failed:",
      error
    );
  }

  try {
    manualBonuses =
      await getManualBonusesForUser(userData);
  } catch (error) {
    console.error(
      "[salary] manual bonuses load failed:",
      error
    );
  }

  const managerNames = Object.fromEntries(
    MANAGERS.map((manager) => [
      manager.id,
      manager.name,
    ])
  );

  MANAGERS.forEach((manager) => {
    managerNames[manager.name] = manager.name;
  });

  const managerId =
    getCurrentManagerId(userData);

  const allManagerKeys = isLeadership(userData)
    ? MANAGERS.map(
        (manager) => manager.id
      )
    : managerId
      ? [managerId]
      : [];

  const bundle = buildSalaryReportBundle({
    payments,
    nightShifts,
    manualBonuses,
    managerNames,
    allManagerKeys,
    archiveOffsets: [-1],
  });

  if (isLeadership(userData)) {
    return bundle;
  }

  return {
    current: {
      ...bundle.current,
      rows: filterSalaryRowsForManager(
        bundle.current.rows,
        userData,
        managerId
      ),
    },
    archive: bundle.archive.map(
      (period) => ({
        ...period,
        rows: filterSalaryRowsForManager(
          period.rows,
          userData,
          managerId
        ),
      })
    ),
  };
}

/** @deprecated use bonusService / shiftService */
export async function getNightShifts() {
  const snapshot = await getDocs(
    collection(db, "nightShifts")
  );

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

/** @deprecated use bonusService */
export async function getManualBonuses() {
  const snapshot = await getDocs(
    collection(db, "manualBonuses")
  );

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}
