import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";

import { db } from "./firebase";

export async function getSyncLogs(count = 20) {
  const snapshot = await getDocs(
    query(
      collection(db, "syncLog"),
      orderBy("createdAt", "desc"),
      limit(count)
    )
  );

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function getFailedSyncLogs(count = 50) {
  const logs = await getSyncLogs(count);

  return logs.filter(
    (log) => log.status === "failed"
  );
}
