const admin = require("firebase-admin");

const {
  indexClientsById,
  buildPaymentCycleMap,
  parsePaymentDate,
} = require("./syncExportBuilder");

const {
  getTtRowMetadata,
} = require("./ttRowMapper");

const {
  getTtSheetForManager,
  listConfiguredManagers,
} = require("./managerTtSheets");

const {
  appendTtRow,
  writeTtSyncMeta,
  formatMsk,
} = require("./ttSheetsService");

const {
  SYNC_LOG_STATUS,
} = require("./syncConstants");

function getDb() {
  return admin.firestore();
}

async function fetchUnsyncedPayments(limit = 500) {
  const snapshot = await getDb()
    .collection("payments")
    .where("syncedToSheets", "==", false)
    .limit(limit)
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

async function fetchClientsForPayments(
  payments
) {
  const clientIds = [
    ...new Set(
      payments
        .map((payment) => payment.clientId)
        .filter(Boolean)
    ),
  ];

  if (!clientIds.length) {
    return {};
  }

  const chunks = [];

  for (
    let index = 0;
    index < clientIds.length;
    index += 10
  ) {
    chunks.push(
      clientIds.slice(index, index + 10)
    );
  }

  const clients = [];

  for (const chunk of chunks) {
    const snapshot = await getDb()
      .collection("clients")
      .where(
        admin.firestore.FieldPath.documentId(),
        "in",
        chunk
      )
      .get();

    snapshot.docs.forEach((docSnap) => {
      clients.push({
        id: docSnap.id,
        ...docSnap.data(),
      });
    });
  }

  return indexClientsById(clients);
}

async function createTtSyncLog(payload) {
  const docRef = await getDb()
    .collection("syncLog")
    .add({
      ...payload,
      type: "tt_append",
      createdAt: Date.now(),
    });

  return docRef.id;
}

async function markPaymentSynced(
  paymentId,
  meta = {}
) {
  await getDb()
    .collection("payments")
    .doc(paymentId)
    .update({
      syncedToSheets: true,
      syncedAt: Date.now(),
      syncedToTt: true,
      ttSpreadsheetId:
        meta.spreadsheetId || null,
      ttUpdatedRange:
        meta.updatedRange || null,
    });
}

function sortPayments(payments) {
  return [...payments].sort((a, b) => {
    const dateA =
      parsePaymentDate(a)?.getTime() || 0;
    const dateB =
      parsePaymentDate(b)?.getTime() || 0;

    if (dateA !== dateB) {
      return dateA - dateB;
    }

    return Number(a.createdAt || 0) -
      Number(b.createdAt || 0);
  });
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

async function runTtSheetsSync({
  source = "github_actions",
} = {}) {
  const startedAt = Date.now();
  let logId = null;

  const summary = {
    processed: 0,
    success: 0,
    skipped: 0,
    failed: 0,
    byManager: {},
    errors: [],
    configuredManagers:
      listConfiguredManagers(),
  };

  try {
    logId = await createTtSyncLog({
      status: SYNC_LOG_STATUS.PENDING,
      source,
    });

    const [payments, allPayments] =
      await Promise.all([
        fetchUnsyncedPayments(),
        fetchAllActivePayments(),
      ]);

    const clientsById =
      await fetchClientsForPayments(
        payments
      );

    const cycleMap =
      buildPaymentCycleMap(allPayments);

    const sorted = sortPayments(payments);

    for (const payment of sorted) {
      summary.processed += 1;

      const client =
        clientsById[payment.clientId] || {};

      const metadata = getTtRowMetadata({
        payment,
        client,
        cycle: cycleMap[payment.id] || 1,
      });

      const ttConfig = getTtSheetForManager(
        metadata.managerId
      );

      if (!ttConfig) {
        summary.skipped += 1;

        await getDb()
          .collection("syncLog")
          .add({
            type: "tt_append",
            paymentId: payment.id,
            managerId: metadata.managerId,
            status: SYNC_LOG_STATUS.SKIPPED,
            reason: "manager_tt_not_configured",
            createdAt: Date.now(),
          });

        continue;
      }

      if (!summary.byManager[metadata.managerId]) {
        summary.byManager[metadata.managerId] = {
          label: ttConfig.label,
          success: 0,
          failed: 0,
        };
      }

      try {
        const sheetsResult =
          await appendTtRow({
            spreadsheetId:
              ttConfig.spreadsheetId,
            sheetName: ttConfig.sheetName,
            row: metadata.row,
          });

        await markPaymentSynced(
          payment.id,
          sheetsResult
        );

        summary.success += 1;
        summary.byManager[
          metadata.managerId
        ].success += 1;

        await getDb()
          .collection("syncLog")
          .add({
            type: "tt_append",
            paymentId: payment.id,
            managerId: metadata.managerId,
            spreadsheetId:
              ttConfig.spreadsheetId,
            sheetName: ttConfig.sheetName,
            status: SYNC_LOG_STATUS.SUCCESS,
            sheetsUpdatedRange:
              sheetsResult.updatedRange,
            createdAt: Date.now(),
          });
      } catch (error) {
        summary.failed += 1;
        summary.byManager[
          metadata.managerId
        ].failed += 1;

        summary.errors.push({
          paymentId: payment.id,
          managerId: metadata.managerId,
          error:
            error.message ||
            String(error),
        });

        await getDb()
          .collection("syncLog")
          .add({
            type: "tt_append",
            paymentId: payment.id,
            managerId: metadata.managerId,
            status: SYNC_LOG_STATUS.FAILED,
            error:
              error.message ||
              String(error),
            createdAt: Date.now(),
          });
      }
    }

    const katyaConfig = getTtSheetForManager(
      "katya_bakaeva"
    );

    if (katyaConfig?.spreadsheetId) {
      try {
        await writeTtSyncMeta({
          spreadsheetId:
            katyaConfig.spreadsheetId,
          payload: {
            lastSyncAtIso: new Date(
              startedAt
            ).toISOString(),
            lastSyncAtMsk: formatMsk(startedAt),
            successCount: summary.success,
            skippedCount: summary.skipped,
            failedCount: summary.failed,
          },
        });
      } catch (error) {
        summary.errors.push({
          meta: true,
          error:
            error.message ||
            String(error),
        });
      }
    }

    if (logId) {
      await getDb()
        .collection("syncLog")
        .doc(logId)
        .update({
          status:
            summary.failed > 0
              ? SYNC_LOG_STATUS.FAILED
              : SYNC_LOG_STATUS.SUCCESS,
          processed: summary.processed,
          successCount: summary.success,
          skippedCount: summary.skipped,
          failedCount: summary.failed,
          byManager: summary.byManager,
          completedAt: Date.now(),
        });
    }

    return {
      status:
        summary.failed > 0
          ? SYNC_LOG_STATUS.FAILED
          : SYNC_LOG_STATUS.SUCCESS,
      logId,
      ...summary,
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
  runTtSheetsSync,
  fetchUnsyncedPayments,
};
