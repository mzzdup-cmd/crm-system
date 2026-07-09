import {
  pendingSaleHasTtExport,
} from "../domain/pendingSales/pendingSalesLogic";

import {
  queueTtRowDeletion,
} from "./ttRowDeletionQueueService";

export async function clearPendingSaleTtRowIfNeeded(
  pendingSale
) {
  if (!pendingSaleHasTtExport(pendingSale)) {
    return { skipped: true };
  }

  try {
    return await queueTtRowDeletion(
      pendingSale,
      {
        sourceType: "pendingSale",
        sourceId: pendingSale.id,
      }
    );
  } catch (error) {
    console.warn(
      "Pending sale TT row deletion queue failed:",
      error
    );

    return {
      skipped: true,
      error: error.message,
    };
  }
}
