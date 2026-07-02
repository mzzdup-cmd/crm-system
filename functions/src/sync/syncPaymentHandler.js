const admin = require("firebase-admin");

const {
  getTtRowMetadataWithVk,
} = require("./ttRowMapper");

const {
  getTtSheetForManager,
} = require("./managerTtSheets");

const {
  appendTtRow,
} = require("./ttSheetsService");

const {
  SYNC_LOG_STATUS,
  getSyncLogByPaymentId,
  createSyncLog,
  markPaymentSynced,
} = require("./syncLogService");

function getDb() {
  return admin.firestore();
}

async function getClientData(clientId) {
  if (!clientId) {
    return {};
  }

  const snapshot = await getDb()
    .collection("clients")
    .doc(clientId)
    .get();

  if (!snapshot.exists) {
    return {};
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

async function getPaymentCycle(clientId, paymentId) {
  if (!clientId) {
    return 1;
  }

  const snapshot = await getDb()
    .collection("payments")
    .where("clientId", "==", clientId)
    .get();

  const paymentIds = snapshot.docs
    .map((doc) => doc.id)
    .sort();

  const index = paymentIds.indexOf(paymentId);

  return index >= 0 ? index + 1 : snapshot.size || 1;
}

async function syncPaymentToSheets(paymentId, paymentData) {
  const payment = {
    id: paymentId,
    ...paymentData,
  };

  if (payment.syncedToSheets === true) {
    await createSyncLog({
      paymentId,
      status: SYNC_LOG_STATUS.SKIPPED,
      reason: "already_synced_flag",
    });

    return {
      status: SYNC_LOG_STATUS.SKIPPED,
      paymentId,
    };
  }

  const existingSuccessLog =
    await getSyncLogByPaymentId(paymentId);

  if (existingSuccessLog) {
    await getDb()
      .collection("payments")
      .doc(paymentId)
      .update({
        syncedToSheets: true,
        syncedAt: Date.now(),
      });

    await createSyncLog({
      paymentId,
      status: SYNC_LOG_STATUS.SKIPPED,
      reason: "existing_success_log",
      logId: existingSuccessLog.id,
    });

    return {
      status: SYNC_LOG_STATUS.SKIPPED,
      paymentId,
    };
  }

  const logId = await createSyncLog({
    paymentId,
    status: SYNC_LOG_STATUS.PENDING,
    attempt: 1,
  });

  try {
    const client = await getClientData(
      payment.clientId
    );

    const cycle = await getPaymentCycle(
      payment.clientId,
      paymentId
    );

    const metadata =
      await getTtRowMetadataWithVk({
        payment,
        client,
        cycle,
      });

    const ttConfig = getTtSheetForManager(
      metadata.managerId
    );

    if (!ttConfig) {
      await getDb()
        .collection("syncLog")
        .doc(logId)
        .update({
          status: SYNC_LOG_STATUS.SKIPPED,
          reason: "manager_tt_not_configured",
          managerId: metadata.managerId,
          completedAt: Date.now(),
        });

      return {
        status: SYNC_LOG_STATUS.SKIPPED,
        paymentId,
        reason: "manager_tt_not_configured",
      };
    }

    const sheetsResult = await appendTtRow({
      spreadsheetId: ttConfig.spreadsheetId,
      sheetName: ttConfig.sheetName,
      row: metadata.row,
    });

    await markPaymentSynced(paymentId, sheetsResult);

    await getDb()
      .collection("syncLog")
      .doc(logId)
      .update({
        status: SYNC_LOG_STATUS.SUCCESS,
        cycle: metadata.cycle,
        clientId: metadata.clientId,
        managerId: metadata.managerId,
        spreadsheetId: ttConfig.spreadsheetId,
        sheetName: ttConfig.sheetName,
        sheetsUpdatedRange:
          sheetsResult.updatedRange,
        completedAt: Date.now(),
      });

    return {
      status: SYNC_LOG_STATUS.SUCCESS,
      paymentId,
      logId,
    };
  } catch (error) {
    await getDb()
      .collection("syncLog")
      .doc(logId)
      .update({
        status: SYNC_LOG_STATUS.FAILED,
        error: error.message || String(error),
        completedAt: Date.now(),
      });

    throw error;
  }
}

async function backfillUnsyncedPayments(limit = 200) {
  const snapshot = await getDb()
    .collection("payments")
    .where("syncedToSheets", "==", false)
    .limit(limit)
    .get();

  const results = {
    processed: 0,
    success: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const docSnap of snapshot.docs) {
    results.processed += 1;

    try {
      const result = await syncPaymentToSheets(
        docSnap.id,
        docSnap.data()
      );

      if (result.status === SYNC_LOG_STATUS.SUCCESS) {
        results.success += 1;
      } else {
        results.skipped += 1;
      }
    } catch (error) {
      results.failed += 1;
      results.errors.push({
        paymentId: docSnap.id,
        error: error.message || String(error),
      });
    }
  }

  return results;
}

module.exports = {
  syncPaymentToSheets,
  backfillUnsyncedPayments,
};
