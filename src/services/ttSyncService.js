import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import app from "./firebase";

const functions = getFunctions(app);

export async function triggerTtSheetsSyncNow() {
  const triggerSync = httpsCallable(
    functions,
    "triggerTtSheetsSync"
  );

  const response = await triggerSync();

  return response.data;
}

export function countUnsyncedPayments(
  payments = []
) {
  return payments.filter(
    (payment) =>
      !payment.deletedAt &&
      payment.syncedToSheets !== true
  ).length;
}
