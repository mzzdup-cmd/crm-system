import {
  collection,
  doc,
  getDoc,
  getDocs,
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

function mapTtSaleDoc(snapshot) {
  return {
    id: snapshot.id,
    ...snapshot.data(),
    amount: Number(
      snapshot.data()?.amount || 0
    ),
    budget: Number(
      snapshot.data()?.budget || 0
    ),
  };
}

function monthStartIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  return `${year}-${month}-01`;
}

export function previousMonthStartIso() {
  const now = new Date();
  const previous = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  );
  const year = previous.getFullYear();
  const month = String(
    previous.getMonth() + 1
  ).padStart(2, "0");

  return `${year}-${month}-01`;
}

export async function getTtImportMeta() {
  const snapshot = await getDoc(
    doc(db, "ttImportMeta", "latest")
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export function subscribeTtImportMeta(
  callback
) {
  return onSnapshot(
    doc(db, "ttImportMeta", "latest"),
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
        "ttImportMeta subscription error:",
        error
      );
      callback(null);
    }
  );
}

export async function getTtSalesForUser(
  userData,
  {
    fromDate = monthStartIso(),
    maxCount = 3000,
  } = {}
) {
  if (!userData) {
    return [];
  }

  if (isLeadership(userData)) {
    const snapshot = await getDocs(
      query(
        collection(db, "ttSales"),
        where("paymentDate", ">=", fromDate),
        orderBy("paymentDate", "desc"),
        limit(maxCount)
      )
    );

    return snapshot.docs.map(mapTtSaleDoc);
  }

  const managerIds =
    getManagerIdsForScopedQuery(userData);

  if (!managerIds.length) {
    return [];
  }

  const chunks = [];

  for (const managerId of managerIds.slice(
    0,
    10
  )) {
    const snapshot = await getDocs(
      query(
        collection(db, "ttSales"),
        where("managerId", "==", managerId),
        where("paymentDate", ">=", fromDate),
        orderBy("paymentDate", "desc"),
        limit(maxCount)
      )
    );

    chunks.push(
      ...snapshot.docs.map(mapTtSaleDoc)
    );
  }

  return chunks.sort((left, right) =>
    String(right.paymentDate || "").localeCompare(
      String(left.paymentDate || "")
    )
  );
}

export function subscribeTtSalesForUser(
  userData,
  {
    fromDate = monthStartIso(),
    maxCount = 3000,
  } = {},
  callback
) {
  if (!userData) {
    callback([]);
    return () => {};
  }

  if (isLeadership(userData)) {
    return onSnapshot(
      query(
        collection(db, "ttSales"),
        where("paymentDate", ">=", fromDate),
        orderBy("paymentDate", "desc"),
        limit(maxCount)
      ),
      (snapshot) => {
        callback(
          snapshot.docs.map(mapTtSaleDoc)
        );
      },
      (error) => {
        console.error(
          "ttSales subscription error:",
          error
        );
        callback([]);
      }
    );
  }

  const managerIds =
    getManagerIdsForScopedQuery(userData);

  if (!managerIds.length) {
    callback([]);
    return () => {};
  }

  const managerId = managerIds[0];

  return onSnapshot(
    query(
      collection(db, "ttSales"),
      where("managerId", "==", managerId),
      where("paymentDate", ">=", fromDate),
      orderBy("paymentDate", "desc"),
      limit(maxCount)
    ),
    (snapshot) => {
      callback(
        snapshot.docs.map(mapTtSaleDoc)
      );
    },
    (error) => {
      console.error(
        "ttSales subscription error:",
        error
      );
      callback([]);
    }
  );
}
