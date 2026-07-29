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

function mskYmdParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Europe/Moscow",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(date);

  const get = (type) =>
    parts.find((part) => part.type === type)
      ?.value;

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
  };
}

/** YYYY-MM-01 for the current Moscow calendar month. */
export function currentMonthStartIso() {
  const { year, month } = mskYmdParts();
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

/** YYYY-MM-01 for the next Moscow calendar month (exclusive upper bound). */
export function nextMonthStartIso() {
  const { year, month } = mskYmdParts();
  const next = new Date(year, month, 1);
  const nextYear = next.getFullYear();
  const nextMonth = next.getMonth() + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
}

/** @deprecated use currentMonthStartIso */
export function previousMonthStartIso() {
  const { year, month } = mskYmdParts();
  const previous = new Date(year, month - 2, 1);
  const prevYear = previous.getFullYear();
  const prevMonth = previous.getMonth() + 1;
  return `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
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

function buildCurrentMonthQuery(
  managerId,
  {
    fromDate = currentMonthStartIso(),
    toDateExclusive = nextMonthStartIso(),
    maxCount = 3000,
  } = {}
) {
  if (managerId) {
    return query(
      collection(db, "ttSales"),
      where("managerId", "==", managerId),
      where("paymentDate", ">=", fromDate),
      where("paymentDate", "<", toDateExclusive),
      orderBy("paymentDate", "desc"),
      limit(maxCount)
    );
  }

  return query(
    collection(db, "ttSales"),
    where("paymentDate", ">=", fromDate),
    where("paymentDate", "<", toDateExclusive),
    orderBy("paymentDate", "desc"),
    limit(maxCount)
  );
}

export async function getTtSalesForUser(
  userData,
  {
    fromDate = currentMonthStartIso(),
    toDateExclusive = nextMonthStartIso(),
    maxCount = 3000,
  } = {}
) {
  if (!userData) {
    return [];
  }

  if (isLeadership(userData)) {
    const snapshot = await getDocs(
      buildCurrentMonthQuery(null, {
        fromDate,
        toDateExclusive,
        maxCount,
      })
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
      buildCurrentMonthQuery(managerId, {
        fromDate,
        toDateExclusive,
        maxCount,
      })
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
    fromDate = currentMonthStartIso(),
    toDateExclusive = nextMonthStartIso(),
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
      buildCurrentMonthQuery(null, {
        fromDate,
        toDateExclusive,
        maxCount,
      }),
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
    buildCurrentMonthQuery(managerId, {
      fromDate,
      toDateExclusive,
      maxCount,
    }),
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
