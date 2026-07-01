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

export async function getPaymentsForUser(userData) {
  if (isLeadership(userData)) {
    return getAllPayments();
  }

  const managerId =
    getCurrentManagerId(userData);

  if (!managerId) {
    return [];
  }

  try {
    const paymentsQuery = query(
      collection(db, "payments"),
      where(
        "managerId",
        "==",
        managerId
      ),
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
      "[paymentService] getPaymentsForUser indexed query failed:",
      error
    );

    const fallbackQuery = query(
      collection(db, "payments"),
      where(
        "managerId",
        "==",
        managerId
      )
    );

    const snapshot =
      await getDocs(fallbackQuery);

    return sortPaymentsDesc(
      filterActivePayments(
        snapshot.docs.map(mapPaymentDoc)
      )
    );
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
    manager,
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

  const updatedClient = await applyPaymentToClient({
    client,
    paymentAmount,
    paymentDate,
  });

  await maybeNotifyMissingVkLink({
    client,
    payment: paymentPayload,
    managerName: manager,
  });

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
  const [payments, nightShifts, manualBonuses] =
    await Promise.all([
      getPaymentsForUser(userData),
      getNightShiftsForUser(userData),
      getManualBonusesForUser(userData),
    ]);

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
