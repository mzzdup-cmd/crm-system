const admin = require("firebase-admin");

const {
  indexClientsById,
  buildSyncExportTable,
} = require("./syncExportBuilder");

const {
  replaceSyncSheet,
  replaceScheduleSheet,
  writeMetaTab,
} = require("./sheetsSyncService");

const {
  buildScheduleExportTable,
} = require("./scheduleExportBuilder");

const {
  SYNC_LOG_STATUS,
} = require("./syncConstants");

function getDb() {
  return admin.firestore();
}

async function fetchAllClients() {
  const snapshot = await getDb()
    .collection("clients")
    .get();

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
}

async function fetchAllActivePayments() {
  const snapshot = await getDb()
    .collection("payments")
    .get();

  return snapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))
    .filter(
      (payment) => !payment.deletedAt
    );
}

async function createNightlySyncLog(payload) {
  const docRef = await getDb()
    .collection("syncLog")
    .add({
      ...payload,
      type: "nightly_full",
      createdAt: Date.now(),
    });

  return docRef.id;
}

async function runFullSheetsSync() {
  const startedAt = Date.now();
  let logId = null;

  try {
    logId = await createNightlySyncLog({
      status: SYNC_LOG_STATUS.PENDING,
      source: "github_actions",
    });

    const [clients, payments] =
      await Promise.all([
        fetchAllClients(),
        fetchAllActivePayments(),
      ]);

    const clientsById =
      indexClientsById(clients);

    const table = buildSyncExportTable(
      payments,
      clientsById
    );

    const sheetsResult =
      await replaceSyncSheet({
        headers: table.headers,
        rows: table.rows,
      });

    const scheduleTable =
      await buildScheduleExportTable(getDb());

    const scheduleResult =
      await replaceScheduleSheet({
        headers: scheduleTable.headers,
        rows: scheduleTable.rows,
      });

    await writeMetaTab({
      lastSyncAt: startedAt,
      rowCount: table.rows.length,
      paymentCount: payments.length,
      scheduleRowCount: scheduleTable.rows.length,
    });

    await getDb()
      .collection("syncLog")
      .doc(logId)
      .update({
        status: SYNC_LOG_STATUS.SUCCESS,
        paymentCount: payments.length,
        rowCount: table.rows.length,
        scheduleRowCount: scheduleTable.rows.length,
        sheetsUpdatedRange:
          sheetsResult.updatedRange,
        scheduleUpdatedRange:
          scheduleResult.updatedRange,
        completedAt: Date.now(),
      });

    return {
      status: SYNC_LOG_STATUS.SUCCESS,
      logId,
      paymentCount: payments.length,
      rowCount: table.rows.length,
      scheduleRowCount: scheduleTable.rows.length,
      sheetsResult,
      scheduleResult,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    if (logId) {
      await getDb()
        .collection("syncLog")
        .doc(logId)
        .update({
          status: SYNC_LOG_STATUS.FAILED,
          error:
            error.message ||
            String(error),
          completedAt: Date.now(),
        });
    }

    throw error;
  }
}

module.exports = {
  runFullSheetsSync,
  fetchAllActivePayments,
  fetchAllClients,
};
