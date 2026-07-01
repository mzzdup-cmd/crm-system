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
} from "../domain/payment/paymentPermissions";
import {
  buildCreateAudit,
  buildUpdateAudit,
  buildDeleteAudit,
} from "../domain/audit/auditFields";
import {
  resolveManagerFromLegacy,
} from "../domain/auth/managerMigration";
import {
  isLegacyPayment,
} from "../domain/payment/legacyPayment";
import { updateClient, getClientById } from "./clientService";
import { maybeNotifyMissingVkLink } from "./missingVkReminderService";
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

export function normalizePaymentPayload(data) {
  const { managerId, manager } =
    normalizeManagerFields(data);

  const legacy = isLegacyPayment(data);
  const isLegacyClient =
    data.isLegacyClient === true;
  const isMinimalLegacy =
    legacy && !isLegacyClient;

  return {
    ...data,
    manager,
    managerId,
    amount: Number(data.amount || 0),
    isLegacy: legacy,
    isLegacyClient,
    startDate: isMinimalLegacy
      ? data.startDate || ""
      : data.startDate ||
        (data.paymentDate
          ? getStartDate(data.paymentDate)
          : ""),
    createdAt: data.createdAt || Date.now(),
    syncedToSheets: data.syncedToSheets ?? false,
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
    )
  ) {
    throw new Error(
      "Нет прав на редактирование"
    );
  }

  const payload = {
    ...updates,
    amount: Number(updates.amount),
    startDate:
      updates.startDate ??
      payment.startDate ??
      getStartDate(
        updates.paymentDate ||
          payment.paymentDate
      ),
    syncedToSheets: false,
    ...buildUpdateAudit(userData),
  };

  if (updates.course !== undefined) {
    payload.course = updates.course;
  }

  if (updates.tariff !== undefined) {
    payload.tariff = updates.tariff;
  }

  await updateDoc(
    doc(db, "payments", paymentId),
    payload
  );

  const client = payment.clientId
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

  const client = payment.clientId
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
  sourceId = null,
  sourceName = "",
  userData,
}) {
  const managerFields = userData
    ? resolveManagerFieldsForWrite(
        userData,
        manager
      )
    : normalizeManagerFields({ manager });

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
    sourceId: resolvedSourceId,
    sourceName: resolvedSourceName,
    syncedToSheets: false,
    ...(userData
      ? buildCreateAudit(userData)
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
  firstContactDate,
  sourceId = null,
  sourceName = "",
  budget = 0,
  userData,
}) {
  const managerFields =
    resolveManagerFromLegacy(manager);

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
    vkLink: vkLink.trim(),
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
    sourceId,
    sourceName,
    budget: Number(budget || 0),
    syncedToSheets: false,
    ...(userData
      ? buildCreateAudit(userData)
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

  const legacyPayments = payments
    .filter(
      (payment) => payment.isLegacyClient
    )
    .sort(
      (a, b) =>
        Number(b.createdAt || 0) -
        Number(a.createdAt || 0)
    );

  const matchesLegacyPayment = (
    payment
  ) => {
    if (normalizedId) {
      const storedId =
        payment.legacyClientBsId ||
        payment.clientNote ||
        "";

      if (storedId.trim() === normalizedId) {
        return true;
      }
    }

    if (normalizedLink) {
      return (
        (payment.dialogLink || "").trim() ===
        normalizedLink
      );
    }

    return false;
  };

  const matchingPayments =
    legacyPayments.filter(
      matchesLegacyPayment
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
}) {
  const managerFields =
    resolveManagerFromLegacy(manager);

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
      ? buildCreateAudit(userData)
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
  sourceId = null,
  sourceName = "",
  userData,
}) {
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
    sourceId,
    sourceName,
    userData,
  });

  const updatedClient =   await applyPaymentToClient({
    client,
    paymentAmount,
    paymentDate,
  });

  try {
    await maybeNotifyMissingVkLink({
      client,
      payment: paymentPayload,
      managerName: manager,
      userData,
    });
  } catch (error) {
    console.warn(
      "VK reminder notification skipped:",
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
  if (userData?.role === "admin") {
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
