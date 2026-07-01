import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

import { db } from "./firebase";

import {
  isLeadership,
  getManagerIdsForScopedQuery,
} from "../domain/auth/roleHelpers";

export function subscribeManagerScopedCollection({
  collectionName,
  userData,
  mapDoc,
  callback,
  logLabel,
}) {
  if (!userData) {
    callback([]);
    return () => {};
  }

  if (isLeadership(userData)) {
    const requestsQuery = query(
      collection(db, collectionName),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(
      requestsQuery,
      (snapshot) => {
        callback(
          snapshot.docs.map(mapDoc)
        );
      },
      (error) => {
        console.error(
          `[${logLabel}] leadership subscription failed:`,
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

  const itemsById = new Map();
  const queryResults = new Map();

  const emit = () => {
    callback(
      [...itemsById.values()].sort(
        (a, b) =>
          Number(b.createdAt || 0) -
          Number(a.createdAt || 0)
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

    emit();
  };

  const unsubs = managerIds.map(
    (managerId) => {
      const requestsQuery = query(
        collection(db, collectionName),
        where(
          "managerId",
          "==",
          managerId
        ),
        orderBy("createdAt", "desc")
      );

      return onSnapshot(
        requestsQuery,
        (snapshot) => {
          syncQueryResults(
            managerId,
            snapshot.docs.map(mapDoc)
          );
        },
        (error) => {
          console.error(
            `[${logLabel}] subscription failed for ${managerId}:`,
            error
          );
          syncQueryResults(
            managerId,
            []
          );
        }
      );
    }
  );

  return () => {
    unsubs.forEach((unsub) => unsub());
  };
}
