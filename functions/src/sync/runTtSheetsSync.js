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
  updateTtRow,
  writeTtSyncMeta,
  formatMsk,
} = require("./ttSheetsService");

const {
  canResyncStartDateInTt,
  parseTtRowNumber,
} = require("./dealTypeHelpers");

const {
  SYNC_LOG_STATUS,
} = require("./syncConstants");

function getDb() {
  return admin.firestore();
}

async function fetchUnsyncedPayments(limit = 500) {
  const snapshot = await getDb()
    .collection("payments")
    .get();

  return snapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))
    .filter(
      (payment) =>
        !payment.deletedAt &&
        payment.syncedToSheets !== true
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
      ttRowNumber:
        meta.rowNumber || null,
    });
}

async function fetchStartDateResyncPayments() {
  const snapshot = await getDb()
    .collection("payments")
    .where(
      "ttStartDateResyncPending",
      "==",
      true
    )
    .get();

  return snapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))
    .filter(
      (payment) =>
        !payment.deletedAt &&
        canResyncStartDateInTt(
          payment.dealType
        )
    );
}

async function processStartDateResyncs({
  clientsById,
  cycleMap,
  summary,
}) {
  const payments =
    await fetchStartDateResyncPayments();

  for (const payment of payments) {
    summary.processed += 1;

    const rowNumber =
      parseTtRowNumber(payment);

    if (!rowNumber) {
      summary.skipped += 1;
      summary.skipReasons.missing_tt_row =
        (summary.skipReasons
          .missing_tt_row || 0) + 1;
      continue;
    }

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
      continue;
    }

    try {
      const sheetsResult =
        await updateTtRow({
          spreadsheetId:
            ttConfig.spreadsheetId,
          sheetName: ttConfig.sheetName,
          rowNumber,
          row: metadata.row,
        });

      await getDb()
        .collection("payments")
        .doc(payment.id)
        .update({
          ttStartDateResyncPending: false,
          ttResyncedAt: Date.now(),
          ttUpdatedRange:
            sheetsResult.updatedRange,
          ttRowNumber: rowNumber,
        });

      summary.success += 1;

      await getDb()
        .collection("syncLog")
        .add({
          type: "tt_update",
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
      summary.errors.push({
        paymentId: payment.id,
        managerId: metadata.managerId,
        error:
          error.message ||
          String(error),
      });
    }
  }
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
    pendingBefore: 0,
    byManager: {},
    skipReasons: {},
    syncedRows: [],
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

    const resyncPayments =
      await fetchStartDateResyncPayments();

    const clientsById =
      await fetchClientsForPayments([
        ...payments,
        ...resyncPayments,
      ]);

    const cycleMap =
      buildPaymentCycleMap(allPayments);

    await processStartDateResyncs({
      clientsById,
      cycleMap,
      summary,
    });

    const sorted = sortPayments(payments);
    summary.pendingBefore = sorted.length;

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

        const skipReason = metadata.managerId
          ? "manager_tt_not_configured"
          : "manager_unresolved";

        summary.skipReasons[skipReason] =
          (summary.skipReasons[skipReason] || 0) +
          1;

        await getDb()
          .collection("syncLog")
          .add({
            type: "tt_append",
            paymentId: payment.id,
            managerId: metadata.managerId,
            managerName:
              payment.manager || null,
            status: SYNC_LOG_STATUS.SKIPPED,
            reason: skipReason,
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

        summary.syncedRows.push({
          paymentId: payment.id,
          managerId: metadata.managerId,
          sheetName: sheetsResult.sheetName,
          rowNumber: sheetsResult.rowNumber,
          updatedRange:
            sheetsResult.updatedRange,
        });

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
