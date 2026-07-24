import {
  collection,
  deleteField,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "./firebase";

/**
 * After VK is saved on a client:
 * - mark already-exported TT rows for VK update
 * - clear stale missing_vk skip on pending appends
 */
export async function queueTtVkResyncForClient(
  clientId
) {
  if (!clientId) {
    return;
  }

  const snapshot = await getDocs(
    query(
      collection(db, "payments"),
      where("clientId", "==", clientId)
    )
  );

  const tasks = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();

    if (data.deletedAt) {
      continue;
    }

    const hasExportedRow = Boolean(
      data.ttRowNumber ||
        data.ttUpdatedRange
    );

    if (
      data.syncedToSheets === true &&
      hasExportedRow
    ) {
      tasks.push(
        updateDoc(docSnap.ref, {
          ttVkResyncPending: true,
        })
      );
      continue;
    }

    if (
      data.syncedToSheets !== true &&
      data.lastTtSyncSkipReason ===
        "missing_vk"
    ) {
      tasks.push(
        updateDoc(docSnap.ref, {
          lastTtSyncSkipReason:
            deleteField(),
        })
      );
    }
  }

  if (!tasks.length) {
    return;
  }

  await Promise.all(tasks);
}

/**
 * After client budget/tariff change, mark exported TT rows for update.
 */
export async function queueTtRowResyncForClient(
  clientId
) {
  if (!clientId) {
    return;
  }

  const snapshot = await getDocs(
    query(
      collection(db, "payments"),
      where("clientId", "==", clientId)
    )
  );

  const updates = snapshot.docs.filter(
    (docSnap) => {
      const data = docSnap.data();

      return (
        !data.deletedAt &&
        data.syncedToSheets === true &&
        (
          data.ttRowNumber ||
          data.ttUpdatedRange
        )
      );
    }
  );

  if (!updates.length) {
    return;
  }

  await Promise.all(
    updates.map((docSnap) =>
      updateDoc(docSnap.ref, {
        ttRowResyncPending: true,
      })
    )
  );
}
