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
  getManagerScopeKeys,
} from "../domain/auth/roleHelpers";

function buildScopedQueries({
  collectionName,
  managerIds,
  managerNames,
}) {
  const queries = [];

  managerIds.forEach((managerId) => {
    queries.push({
      key: `id:${managerId}`,
      query: query(
        collection(db, collectionName),
        where(
          "managerId",
          "==",
          managerId
        ),
        orderBy("createdAt", "desc")
      ),
    });
  });

  managerNames.forEach((managerName) => {
    queries.push({
      key: `name:${managerName}`,
      query: query(
        collection(db, collectionName),
        where(
          "manager",
          "==",
          managerName
        ),
        orderBy("createdAt", "desc")
      ),
    });
  });

  return queries;
}

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

  const { managerIds, managerNames } =
    getManagerScopeKeys(userData);

  const scopedQueries =
    buildScopedQueries({
      collectionName,
      managerIds,
      managerNames,
    });

  if (!scopedQueries.length) {
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

  const unsubs = scopedQueries.map(
    ({ key, query: requestsQuery }) =>
      onSnapshot(
        requestsQuery,
        (snapshot) => {
          syncQueryResults(
            key,
            snapshot.docs.map(mapDoc)
          );
        },
        (error) => {
          console.error(
            `[${logLabel}] subscription failed for ${key}:`,
            error
          );
          syncQueryResults(key, []);
        }
      )
  );

  return () => {
    unsubs.forEach((unsub) => unsub());
  };
}
