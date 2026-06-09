import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import app from "./firebase";
import {
  getSyncLogs,
  getFailedSyncLogs,
} from "./syncLogService";

const functions = getFunctions(app);

export async function triggerBackfillPaymentsSync() {
  const backfill = httpsCallable(
    functions,
    "backfillPaymentsSync"
  );

  const result = await backfill();

  return result.data;
}

export async function getSheetsSyncStatus(limit = 20) {
  const [logs, failed] = await Promise.all([
    getSyncLogs(limit),
    getFailedSyncLogs(limit),
  ]);

  return {
    recentLogs: logs,
    failedCount: failed.length,
    failedLogs: failed,
  };
}

export {
  getSyncLogs,
  getFailedSyncLogs,
};
