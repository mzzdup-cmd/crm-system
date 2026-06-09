import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";

import { db } from "./firebase";

import {
  isAdmin,
  getCurrentManagerId,
} from "../domain/auth/roleHelpers";

import {
  normalizeClientPayload,
} from "./clientService";

import {
  normalizePaymentPayload,
} from "./paymentService";

import {
  getRemain,
} from "../domain/client/clientStatus";

function enrichClient(client) {
  const normalized =
    normalizeClientPayload(client);

  return {
    ...normalized,
    id: client.id,
    remain: getRemain(normalized),
  };
}

function mapPaymentFromSnapshot(snapshot) {
  const data = snapshot.data();
  const normalized =
    normalizePaymentPayload(data);

  return {
    id: snapshot.id,
    ...normalized,
  };
}

export function subscribeClientsForUser(
  userData,
  callback
) {
  if (!userData) {
    callback([]);
    return () => {};
  }

  let clientsQuery;

  if (isAdmin(userData)) {
    clientsQuery = collection(
      db,
      "clients"
    );
  } else {
    const managerId =
      getCurrentManagerId(userData);

    if (!managerId) {
      callback([]);
      return () => {};
    }

    clientsQuery = query(
      collection(db, "clients"),
      where(
        "managerId",
        "==",
        managerId
      )
    );
  }

  return onSnapshot(
    clientsQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map((docSnap) =>
          enrichClient({
            id: docSnap.id,
            ...docSnap.data(),
          })
        )
      );
    },
    (error) => {
      console.error(
        "Clients subscription error:",
        error
      );
      callback([]);
    }
  );
}

export function subscribeOperationalPayments(
  userData,
  maxCount,
  callback
) {
  if (!userData) {
    callback([]);
    return () => {};
  }

  const paymentsQuery = query(
    collection(db, "payments"),
    orderBy("createdAt", "desc"),
    limit(maxCount)
  );

  return onSnapshot(
    paymentsQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map(mapPaymentFromSnapshot)
      );
    },
    (error) => {
      console.error(
        "Operational payments subscription error:",
        error
      );
      callback([]);
    }
  );
}

export function subscribeRecentPaymentsForUser(
  userData,
  maxCount,
  callback
) {
  if (!userData) {
    callback([]);
    return () => {};
  }

  let paymentsQuery;

  if (isAdmin(userData)) {
    paymentsQuery = query(
      collection(db, "payments"),
      orderBy("createdAt", "desc"),
      limit(maxCount)
    );
  } else {
    const managerId =
      getCurrentManagerId(userData);

    if (!managerId) {
      callback([]);
      return () => {};
    }

    paymentsQuery = query(
      collection(db, "payments"),
      where(
        "managerId",
        "==",
        managerId
      ),
      orderBy("createdAt", "desc"),
      limit(maxCount)
    );
  }

  return onSnapshot(
    paymentsQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map(mapPaymentFromSnapshot)
      );
    },
    (error) => {
      console.error(
        "Payments subscription error:",
        error
      );
      callback([]);
    }
  );
}

export function subscribeScheduleByDate(
  date,
  callback
) {
  if (!date) {
    callback(null);
    return () => {};
  }

  const ref = doc(db, "schedule", date);

  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback({
        id: snapshot.id,
        ...snapshot.data(),
      });
    },
    (error) => {
      console.error(
        "Schedule subscription error:",
        error
      );
      callback(null);
    }
  );
}

export function subscribeTrafficByDate(
  date,
  callback
) {
  if (!date) {
    callback(null);
    return () => {};
  }

  const ref = doc(db, "traffic", date);

  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback({
        id: snapshot.id,
        ...snapshot.data(),
      });
    },
    (error) => {
      console.error(
        "Traffic subscription error:",
        error
      );
      callback(null);
    }
  );
}

export function subscribeFailedSyncLogs(
  maxCount,
  callback
) {
  const syncQuery = query(
    collection(db, "syncLog"),
    where("status", "==", "failed"),
    orderBy("createdAt", "desc"),
    limit(maxCount)
  );

  return onSnapshot(
    syncQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
      );
    },
    (error) => {
      console.error(
        "SyncLog subscription error:",
        error
      );
      callback([]);
    }
  );
}

export function subscribeRecentSyncLogs(
  maxCount,
  callback
) {
  const syncQuery = query(
    collection(db, "syncLog"),
    orderBy("createdAt", "desc"),
    limit(maxCount)
  );

  return onSnapshot(
    syncQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
      );
    },
    (error) => {
      console.error(
        "SyncLog subscription error:",
        error
      );
      callback([]);
    }
  );
}
