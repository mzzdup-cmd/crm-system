import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";

import { db } from "./firebase";

import {
  isLeadership,
  getManagerIdsForScopedQuery,
} from "../domain/auth/roleHelpers";

import {
  PENDING_SALE_STATUS,
} from "../constants/pendingSales";

import {
  getManagerNameById,
} from "../constants/managers";

import {
  managerIdsMatch,
} from "../domain/auth/managerMigration";

import {
  createNotificationIfMissing,
} from "./notificationService";

import {
  getUsersByManagerIds,
} from "./userService";

function mapPendingSaleDoc(snapshot) {
  return {
    id: snapshot.id,
    ...snapshot.data(),
    amount: Number(snapshot.data()?.amount || 0),
  };
}

export function normalizePendingSalePayload(data) {
  return {
    status: PENDING_SALE_STATUS.PENDING,
    confirmedAt: null,
    paymentId: null,
    createdAt: Date.now(),
    ...data,
    amount: Number(data.amount || 0),
  };
}

export async function createPendingSale({
  createdByManagerId,
  ownerManagerId,
  dialogLink,
  amount,
  paymentDate,
  comment = "",
  course = "",
  dealTypeId = "new",
}) {
  const payload = normalizePendingSalePayload({
    createdByManagerId,
    ownerManagerId,
    dialogLink: dialogLink.trim(),
    amount: Number(amount),
    paymentDate,
    comment: comment.trim(),
    course: course.trim(),
    dealTypeId,
    status: PENDING_SALE_STATUS.PENDING,
  });

  const docRef = await addDoc(
    collection(db, "pendingSales"),
    payload
  );

  try {
    await notifyOwnerPendingSale({
      pendingSaleId: docRef.id,
      ownerManagerId,
      createdByManagerId,
      amount: payload.amount,
      dialogLink: payload.dialogLink,
    });
  } catch (notifyError) {
    console.error(
      "Pending sale notification failed:",
      notifyError
    );
  }

  return {
    id: docRef.id,
    ...payload,
  };
}

async function notifyOwnerPendingSale({
  pendingSaleId,
  ownerManagerId,
  createdByManagerId,
  amount,
  dialogLink,
}) {
  const users = await getUsersByManagerIds([
    ownerManagerId,
  ]);

  const creatorName =
    getManagerNameById(createdByManagerId) ||
    "Коллега";

  await Promise.all(
    users.map((user) =>
      createNotificationIfMissing({
        userId: user.uid,
        dedupKey: `pending_sale_${pendingSaleId}`,
        type: "pending_sale",
        title: "У вас новая быстрая продажа",
        body: `${creatorName} · ${amount.toLocaleString("ru-RU")} ₽`,
        link: "/pending-sales",
        priority: "high",
        data: {
          pendingSaleId,
          ownerManagerId,
          createdByManagerId,
          dialogLink,
          amount,
        },
        channels: ["in_app"],
      })
    )
  );
}

export async function getPendingSaleById(id) {
  const ref = doc(db, "pendingSales", id);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return mapPendingSaleDoc(snapshot);
}

export async function confirmPendingSale(
  id,
  { paymentId } = {}
) {
  const ref = doc(db, "pendingSales", id);

  await updateDoc(ref, {
    status: PENDING_SALE_STATUS.CONFIRMED,
    confirmedAt: Date.now(),
    paymentId: paymentId || null,
  });
}

export async function rejectPendingSale(id) {
  const ref = doc(db, "pendingSales", id);

  await updateDoc(ref, {
    status: PENDING_SALE_STATUS.REJECTED,
    confirmedAt: Date.now(),
  });
}

function subscribeQuery(
  salesQuery,
  callback,
  label
) {
  return onSnapshot(
    salesQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map(mapPendingSaleDoc)
      );
    },
    (error) => {
      console.error(
        `Pending sales subscription error (${label}):`,
        error
      );
      callback([]);
    }
  );
}

export function subscribePendingSalesForUser(
  userData,
  callback
) {
  if (!userData) {
    callback([]);
    return () => {};
  }

  if (isLeadership(userData)) {
    const adminQuery = query(
      collection(db, "pendingSales"),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    return subscribeQuery(
      adminQuery,
      callback,
      "admin"
    );
  }

  const managerIds =
    getManagerIdsForScopedQuery(userData);

  if (!managerIds.length) {
    callback([]);
    return () => {};
  }

  const itemsById = new Map();
  const queryResults = new Map();

  const emitMerged = () => {
    callback(
      [...itemsById.values()].sort(
        (a, b) => b.createdAt - a.createdAt
      )
    );
  };

  const syncQueryResults = (
    queryKey,
    docs
  ) => {
    queryResults.set(queryKey, docs);
    itemsById.clear();

    queryResults.forEach((queryDocs) => {
      queryDocs.forEach((item) => {
        itemsById.set(item.id, item);
      });
    });

    emitMerged();
  };

  const unsubs = [];

  managerIds.forEach((managerId) => {
    unsubs.push(
      subscribeQuery(
        query(
          collection(db, "pendingSales"),
          where(
            "ownerManagerId",
            "==",
            managerId
          ),
          orderBy("createdAt", "desc"),
          limit(50)
        ),
        (items) => {
          syncQueryResults(
            `incoming:${managerId}`,
            items
          );
        },
        `incoming:${managerId}`
      )
    );

    unsubs.push(
      subscribeQuery(
        query(
          collection(db, "pendingSales"),
          where(
            "createdByManagerId",
            "==",
            managerId
          ),
          orderBy("createdAt", "desc"),
          limit(50)
        ),
        (items) => {
          syncQueryResults(
            `created:${managerId}`,
            items
          );
        },
        `created:${managerId}`
      )
    );
  });

  return () => {
    unsubs.forEach((unsub) => unsub());
  };
}

export function countPendingForOwner(
  pendingSales,
  ownerManagerId
) {
  return pendingSales.filter(
    (sale) =>
      managerIdsMatch(
        sale.ownerManagerId,
        ownerManagerId
      ) &&
      sale.status === PENDING_SALE_STATUS.PENDING
  ).length;
}

export function filterPendingIncoming(
  pendingSales,
  ownerManagerId
) {
  return pendingSales.filter(
    (sale) =>
      managerIdsMatch(
        sale.ownerManagerId,
        ownerManagerId
      ) &&
      sale.status === PENDING_SALE_STATUS.PENDING
  );
}

export function filterPendingCreated(
  pendingSales,
  creatorManagerId
) {
  return pendingSales.filter(
    (sale) =>
      managerIdsMatch(
        sale.createdByManagerId,
        creatorManagerId
      )
  );
}

export async function getAllPendingSales(
  maxCount = 500
) {
  const pendingQuery = query(
    collection(db, "pendingSales"),
    orderBy("createdAt", "desc"),
    limit(maxCount)
  );

  const snapshot =
    await getDocs(pendingQuery);

  return snapshot.docs.map(mapPendingSaleDoc);
}
