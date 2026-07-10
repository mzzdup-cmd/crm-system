import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import app from "./firebase";

import {
  paymentNeedsTtAppend,
} from "../domain/payment/paymentTtExportState";

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
    paymentNeedsTtAppend
  ).length;
}
