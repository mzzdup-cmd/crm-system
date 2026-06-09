import {
  collection,
  doc,
  getDocs,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";

import { db } from "./firebase";

import {
  INITIAL_TRAFFIC_SOURCE_NAMES,
  OBSOLETE_TRAFFIC_SOURCE_NAMES,
} from "../constants/trafficSourcesSeed";

import {
  mergeTrafficSourcesWithFallback,
} from "../domain/traffic/trafficSourceMerge";

function mapTrafficSourceDoc(snapshot) {
  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function normalizedNameKey(name) {
  return normalizeName(name).toLowerCase();
}

function buildExistingNameSet(docs) {
  const names = new Set();

  docs.forEach((snapshot) => {
    const name = snapshot.data()?.name;

    if (name) {
      names.add(
        normalizedNameKey(name)
      );
    }
  });

  return names;
}

function chunkArray(items, size) {
  const chunks = [];

  for (
    let index = 0;
    index < items.length;
    index += size
  ) {
    chunks.push(
      items.slice(index, index + size)
    );
  }

  return chunks;
}

function emitMergedSources(
  docs,
  callback
) {
  const firestoreSources = docs.map(
    mapTrafficSourceDoc
  );

  callback(
    mergeTrafficSourcesWithFallback(
      firestoreSources
    )
  );
}

export function subscribeTrafficSources(
  callback
) {
  const coll = collection(
    db,
    "trafficSources"
  );

  const orderedQuery = query(
    coll,
    orderBy("name", "asc")
  );

  let fallbackUnsub = null;

  const primaryUnsub = onSnapshot(
    orderedQuery,
    (snapshot) => {
      emitMergedSources(
        snapshot.docs,
        callback
      );
    },
    (error) => {
      console.error(
        "[trafficSourceService] ordered subscription failed:",
        error
      );

      fallbackUnsub = onSnapshot(
        coll,
        (snapshot) => {
          emitMergedSources(
            snapshot.docs,
            callback
          );
        },
        (fallbackError) => {
          console.error(
            "[trafficSourceService] fallback subscription failed:",
            fallbackError
          );
          callback(
            mergeTrafficSourcesWithFallback([])
          );
        }
      );
    }
  );

  return () => {
    primaryUnsub();
    fallbackUnsub?.();
  };
}

export async function getAllTrafficSources() {
  try {
    const sourcesQuery = query(
      collection(db, "trafficSources"),
      orderBy("name", "asc")
    );

    const snapshot =
      await getDocs(sourcesQuery);

    return mergeTrafficSourcesWithFallback(
      snapshot.docs.map(mapTrafficSourceDoc)
    );
  } catch (error) {
    console.error(
      "[trafficSourceService] getAllTrafficSources ordered query failed:",
      error
    );

    const snapshot = await getDocs(
      collection(db, "trafficSources")
    );

    return mergeTrafficSourcesWithFallback(
      snapshot.docs.map(mapTrafficSourceDoc)
    );
  }
}

export async function addTrafficSource({
  name,
  createdBy,
}) {
  const normalized =
    normalizeName(name);

  if (!normalized) {
    throw new Error(
      "Укажите название traffic"
    );
  }

  const existing =
    await getAllTrafficSources();

  const duplicate = existing.find(
    (item) =>
      item.name.toLowerCase() ===
      normalized.toLowerCase()
  );

  if (duplicate) {
    return duplicate;
  }

  const payload = {
    name: normalized,
    createdAt: Date.now(),
    createdBy: createdBy || null,
  };

  const docRef = await addDoc(
    collection(db, "trafficSources"),
    payload
  );

  return {
    id: docRef.id,
    ...payload,
    isFallback: false,
  };
}

let seedPromise = null;

const FIRESTORE_BATCH_LIMIT = 450;

export async function ensureTrafficSourcesSeeded({
  createdBy = "system",
} = {}) {
  if (seedPromise) {
    return seedPromise;
  }

  seedPromise = (async () => {
    const coll = collection(
      db,
      "trafficSources"
    );

    const snapshot = await getDocs(coll);
    const existingNames =
      buildExistingNameSet(snapshot.docs);

    const obsoleteKeys = new Set(
      OBSOLETE_TRAFFIC_SOURCE_NAMES.map(
        normalizedNameKey
      )
    );

    const namesToAdd = [];

    INITIAL_TRAFFIC_SOURCE_NAMES.forEach(
      (name) => {
        const normalized =
          normalizeName(name);
        const key =
          normalizedNameKey(normalized);

        if (
          !normalized ||
          existingNames.has(key)
        ) {
          return;
        }

        existingNames.add(key);
        namesToAdd.push(normalized);
      }
    );

    const docsToDelete = snapshot.docs.filter(
      (item) =>
        obsoleteKeys.has(
          normalizedNameKey(
            item.data()?.name || ""
          )
        )
    );

    if (
      !namesToAdd.length &&
      !docsToDelete.length
    ) {
      return {
        seeded: false,
        added: 0,
        removed: 0,
        count: snapshot.size,
      };
    }

    const now = Date.now();
    const writeOps = [
      ...docsToDelete.map((item) => ({
        type: "delete",
        ref: item.ref,
      })),
      ...namesToAdd.map((name) => ({
        type: "set",
        ref: doc(coll),
        data: {
          name,
          createdAt: now,
          createdBy,
        },
      })),
    ];

    for (const chunk of chunkArray(
      writeOps,
      FIRESTORE_BATCH_LIMIT
    )) {
      const batch = writeBatch(db);

      chunk.forEach((operation) => {
        if (operation.type === "delete") {
          batch.delete(operation.ref);
          return;
        }

        batch.set(
          operation.ref,
          operation.data
        );
      });

      await batch.commit();
    }

    return {
      seeded: true,
      added: namesToAdd.length,
      removed: docsToDelete.length,
      count:
        snapshot.size -
        docsToDelete.length +
        namesToAdd.length,
    };
  })();

  try {
    return await seedPromise;
  } finally {
    seedPromise = null;
  }
}
