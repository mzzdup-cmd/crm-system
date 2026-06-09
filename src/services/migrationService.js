import {
  collection,
  getDocs,
  doc,
  writeBatch,
} from "firebase/firestore";

import { db } from "./firebase";
import {
  normalizeManagerFields,
  needsManagerIdMigration,
} from "../domain/auth/managerMigration";

const MIGRATABLE_COLLECTIONS = [
  "clients",
  "payments",
  "manualBonuses",
  "nightShifts",
];

/**
 * One-time / admin migration:
 * backfill managerId from legacy manager string.
 */
export async function migrateCollectionManagerIds(
  collectionName
) {
  const snapshot = await getDocs(
    collection(db, collectionName)
  );

  let migratedCount = 0;
  let batch = writeBatch(db);
  let batchCount = 0;

  for (const item of snapshot.docs) {
    const data = item.data();

    if (!needsManagerIdMigration(data)) {
      continue;
    }

    const { managerId, manager } =
      normalizeManagerFields(data);

    if (!managerId) {
      continue;
    }

    batch.update(
      doc(db, collectionName, item.id),
      {
        managerId,
        manager,
        updatedAt: Date.now(),
      }
    );

    migratedCount += 1;
    batchCount += 1;

    if (batchCount >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return {
    collectionName,
    migratedCount,
    totalDocs: snapshot.size,
  };
}

export async function migrateAllManagerIds() {
  const results = [];

  for (const collectionName of MIGRATABLE_COLLECTIONS) {
    const result =
      await migrateCollectionManagerIds(
        collectionName
      );

    results.push(result);
  }

  return results;
}

export async function getMigrationPreview() {
  const preview = [];

  for (const collectionName of MIGRATABLE_COLLECTIONS) {
    const snapshot = await getDocs(
      collection(db, collectionName)
    );

    const pending = snapshot.docs.filter(
      (item) =>
        needsManagerIdMigration(
          item.data()
        )
    ).length;

    preview.push({
      collectionName,
      totalDocs: snapshot.size,
      pendingMigration: pending,
    });
  }

  return preview;
}
