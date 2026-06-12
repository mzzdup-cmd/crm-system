const admin = require("firebase-admin");

const SYNC_LOG_STATUS = {
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
  SKIPPED: "skipped",
};

function getDb() {
  return admin.firestore();
}

async function getSyncLogByPaymentId(paymentId) {
  const snapshot = await getDb()
    .collection("syncLog")
    .where("paymentId", "==", paymentId)
    .where("status", "==", SYNC_LOG_STATUS.SUCCESS)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  };
}

async function createSyncLog(payload) {
  const docRef = await getDb()
    .collection("syncLog")
    .add({
      ...payload,
      createdAt: Date.now(),
    });

  return docRef.id;
}

async function markPaymentSynced(paymentId, meta = {}) {
  await getDb()
    .collection("payments")
    .doc(paymentId)
    .update({
      syncedToSheets: true,
      syncedAt: Date.now(),
      syncedToTt: true,
      ttSpreadsheetId:
        meta.spreadsheetId || null,
      sheetsUpdatedRange:
        meta.updatedRange || null,
      ttUpdatedRange:
        meta.updatedRange || null,
    });
}

module.exports = {
  SYNC_LOG_STATUS,
  getSyncLogByPaymentId,
  createSyncLog,
  markPaymentSynced,
};
