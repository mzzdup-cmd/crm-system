import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import app from "./firebase";

import {
  pendingSaleHasTtExport,
} from "../domain/pendingSales/pendingSalesLogic";

const functions = getFunctions(app);

export async function clearPendingSaleTtRowIfNeeded(
  pendingSale
) {
  if (!pendingSaleHasTtExport(pendingSale)) {
    return { skipped: true };
  }

  const clearTtRow = httpsCallable(
    functions,
    "clearPendingSaleTtRow"
  );

  try {
    const response = await clearTtRow({
      pendingSaleId: pendingSale.id,
    });

    return response.data || { skipped: true };
  } catch (error) {
    console.warn(
      "Pending sale TT row cleanup failed:",
      error
    );

    return {
      skipped: true,
      error: error.message,
    };
  }
}
