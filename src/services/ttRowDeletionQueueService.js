import {
  doc,
  setDoc,
} from "firebase/firestore";

import { db } from "./firebase";

function buildTtRowDeletionPayload(
  record,
  {
    sourceType,
    sourceId,
  }
) {
  return {
    sourceType,
    sourceId,
    ownerManagerId:
      record.ownerManagerId ||
      record.managerId ||
      "",
    managerId:
      record.managerId ||
      record.ownerManagerId ||
      "",
    ttRowNumber: record.ttRowNumber ?? null,
    ttUpdatedRange: record.ttUpdatedRange ?? "",
    ttSpreadsheetId:
      record.ttSpreadsheetId ?? "",
    ttSheetName: record.ttSheetName ?? "TT",
    syncedToTt: record.syncedToTt === true,
    syncedToSheets:
      record.syncedToSheets === true,
    status: "pending",
    queuedAt: Date.now(),
  };
}

export async function queueTtRowDeletion(
  record,
  {
    sourceType,
    sourceId,
  }
) {
  if (!record || !sourceId) {
    return { skipped: true };
  }

  const hasTtExport =
    record.syncedToTt === true ||
    record.syncedToSheets === true ||
    Boolean(record.ttRowNumber) ||
    Boolean(record.ttUpdatedRange);

  if (!hasTtExport) {
    return { skipped: true };
  }

  const payload = buildTtRowDeletionPayload(
    record,
    { sourceType, sourceId }
  );

  await setDoc(
    doc(db, "ttRowDeletions", sourceId),
    payload
  );

  return { queued: true, sourceId };
}
