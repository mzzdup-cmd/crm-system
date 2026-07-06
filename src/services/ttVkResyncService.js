import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "./firebase";

/**
 * After VK is saved on a client, mark already-exported TT rows for update.
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
        ttVkResyncPending: true,
      })
    )
  );
}
