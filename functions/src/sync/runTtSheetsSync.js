const admin = require("firebase-admin");

const {
  indexClientsById,
  buildPaymentCycleMap,
  parsePaymentDate,
} = require("./syncExportBuilder");

const {
  getTtRowMetadataWithVk,
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
  isUpsellDeal,
  parseTtRowNumber,
} = require("./dealTypeHelpers");

const {
  SYNC_LOG_STATUS,
} = require("./syncConstants");

const {
  clearTtRowForRecord,
} = require("./deleteTtRowHandler");

const {
  buildPaymentsByClient,
  paymentCanProcessTtResync,
  paymentNeedsTtAppend,
  shouldRecoverMisroutedTopup,
} = require("./paymentTtExportState");

const STALE_VK_BATCH_LIMIT = 50;
const TT_ROW_DELETION_BATCH_LIMIT = 30;
const APPEND_RETRY_ATTEMPTS = 2;

function isTransientSheetsError(error) {
  const message = String(
    error?.message || error
  );

  return /429|503|502|500|timeout|ECONNRESET|ETIMEDOUT|rate limit|backend error/i.test(
    message
  );
}

async function appendTtRowWithRetry(options) {
  let lastError = null;

  for (
    let attempt = 1;
    attempt <= APPEND_RETRY_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await appendTtRow(options);
    } catch (error) {
      lastError = error;

      if (
        !isTransientSheetsError(error) ||
        attempt >= APPEND_RETRY_ATTEMPTS
      ) {
        throw error;
      }

      console.warn(
        "[tt-sync] Transient append error, retrying:",
        error.message || error
      );
    }
  }

  throw lastError;
}

function getDb() {
  return admin.firestore();
}

async function fetchUnsyncedPayments(
  paymentsByClient = null,
  limit = 500
) {
  const snapshot = await getDb()
    .collection("payments")
    .get();

  return snapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))
    .filter((payment) =>
      paymentNeedsTtAppend(
        payment,
        paymentsByClient
      )
    )
    .slice(0, limit);
}

async function recoverMisroutedTopupPayments(
  allPayments = []
) {
  const paymentsByClient =
    buildPaymentsByClient(allPayments);
  const recoveredIds = [];

  for (const payment of allPayments) {
    if (
      !shouldRecoverMisroutedTopup(
        payment,
        paymentsByClient
      )
    ) {
      continue;
    }

    try {
      await getDb()
        .collection("payments")
        .doc(payment.id)
        .update({
          syncedToSheets: false,
          syncedToTt: false,
          ttRowResyncPending: false,
          ttRowNumber:
            admin.firestore.FieldValue.delete(),
          ttUpdatedRange:
            admin.firestore.FieldValue.delete(),
          sheetsUpdatedRange:
            admin.firestore.FieldValue.delete(),
          ttSpreadsheetId:
            admin.firestore.FieldValue.delete(),
          syncedAt:
            admin.firestore.FieldValue.delete(),
          lastTtSyncSkipReason:
            admin.firestore.FieldValue.delete(),
          lastTtSyncSkippedAt:
            admin.firestore.FieldValue.delete(),
        });

      recoveredIds.push(payment.id);
    } catch (error) {
      console.warn(
        "[tt-sync] Top-up recovery failed:",
        payment.id,
        error.message || error
      );
    }
  }

  return recoveredIds;
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
      lastTtSyncSkipReason:
        admin.firestore.FieldValue.delete(),
      lastTtSyncSkippedAt:
        admin.firestore.FieldValue.delete(),
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

async function fetchVkResyncPayments() {
  const snapshot = await getDb()
    .collection("payments")
    .where(
      "ttVkResyncPending",
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
        parseTtRowNumber(payment)
    );
}

function findStaleVkTtRows(
  payments = [],
  clientsById = {}
) {
  return payments.filter((payment) => {
    if (
      payment.deletedAt ||
      payment.syncedToSheets !== true ||
      payment.ttVkResyncPending === true
    ) {
      return false;
    }

    if (!parseTtRowNumber(payment)) {
      return false;
    }

    const client =
      clientsById[payment.clientId] || {};
    const clientVk = (
      client.vkLink || ""
    ).trim();

    if (!clientVk) {
      return false;
    }

    const paymentVk = (
      payment.vkLink || ""
    ).trim();

    return clientVk !== paymentVk;
  });
}

async function processVkResyncs({
  clientsById,
  cycleMap,
  summary,
  extraPayments = [],
}) {
  const flagged =
    await fetchVkResyncPayments();

  const seen = new Set();
  const payments = [];

  for (const payment of [
    ...flagged,
    ...extraPayments,
  ]) {
    if (seen.has(payment.id)) {
      continue;
    }

    seen.add(payment.id);
    payments.push(payment);
  }

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

    const metadata =
      await getTtRowMetadataWithVk({
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

      const syncedVk = (
        client.vkLink ||
        payment.vkLink ||
        ""
      ).trim();

      await getDb()
        .collection("payments")
        .doc(payment.id)
        .update({
          ttVkResyncPending: false,
          ttVkResyncedAt: Date.now(),
          ttUpdatedRange:
            sheetsResult.updatedRange,
          ttRowNumber: rowNumber,
          ...(syncedVk
            ? { vkLink: syncedVk }
            : {}),
        });

      summary.success += 1;

      await getDb()
        .collection("syncLog")
        .add({
          type: "tt_update",
          updateKind: "vk_link",
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
      summary.resyncFailed += 1;
      summary.resyncErrors.push({
        paymentId: payment.id,
        managerId: metadata.managerId,
        kind: "vk_link",
        error:
          error.message ||
          String(error),
      });
      console.warn(
        "[tt-sync] VK resync failed:",
        payment.id,
        error.message || error
      );
    }
  }
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

    const metadata =
      await getTtRowMetadataWithVk({
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
      summary.resyncFailed += 1;
      summary.resyncErrors.push({
        paymentId: payment.id,
        managerId: metadata.managerId,
        kind: "start_date",
        error:
          error.message ||
          String(error),
      });
      console.warn(
        "[tt-sync] Start-date resync failed:",
        payment.id,
        error.message || error
      );
    }
  }
}

async function fetchTtRowResyncPayments(
  paymentsByClient = {}
) {
  const snapshot = await getDb()
    .collection("payments")
    .where(
      "ttRowResyncPending",
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
        paymentCanProcessTtResync(
          payment,
          paymentsByClient
        )
    );
}

async function processTtRowResyncs({
  clientsById,
  cycleMap,
  summary,
  paymentsByClient = {},
}) {
  const payments =
    await fetchTtRowResyncPayments(
      paymentsByClient
    );

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

    const metadata =
      await getTtRowMetadataWithVk({
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

      const syncedVk = (
        client.vkLink ||
        payment.vkLink ||
        ""
      ).trim();

      await getDb()
        .collection("payments")
        .doc(payment.id)
        .update({
          ttRowResyncPending: false,
          ttResyncedAt: Date.now(),
          ttUpdatedRange:
            sheetsResult.updatedRange,
          ttRowNumber: rowNumber,
          ...(syncedVk
            ? { vkLink: syncedVk }
            : {}),
        });

      summary.success += 1;

      await getDb()
        .collection("syncLog")
        .add({
          type: "tt_update",
          updateKind: "payment_edit",
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
      summary.resyncFailed += 1;
      summary.resyncErrors.push({
        paymentId: payment.id,
        managerId: metadata.managerId,
        kind: "payment_edit",
        error:
          error.message ||
          String(error),
      });
      console.warn(
        "[tt-sync] Payment row resync failed:",
        payment.id,
        error.message || error
      );
    }
  }
}

async function processTtRowDeletions(
  summary
) {
  const snapshot = await getDb()
    .collection("ttRowDeletions")
    .where("status", "==", "pending")
    .limit(TT_ROW_DELETION_BATCH_LIMIT)
    .get();

  for (const docSnap of snapshot.docs) {
    const record = {
      id: docSnap.id,
      ...docSnap.data(),
    };

    try {
      const result =
        await clearTtRowForRecord(record);

      await docSnap.ref.update({
        status: result.cleared
          ? "done"
          : "skipped",
        processedAt: Date.now(),
        result,
      });

      if (
        !result.cleared &&
        !result.skipped
      ) {
        summary.resyncFailed += 1;
        summary.resyncErrors.push({
          type: "tt_row_deletion",
          sourceId: record.sourceId || record.id,
          error:
            result.error ||
            result.reason ||
            "clear_failed",
        });
      }
    } catch (error) {
      summary.resyncFailed += 1;
      summary.resyncErrors.push({
        type: "tt_row_deletion",
        sourceId: record.sourceId || record.id,
        error:
          error.message ||
          String(error),
      });

      await docSnap.ref.update({
        status: "failed",
        processedAt: Date.now(),
        error:
          error.message ||
          String(error),
      });

      console.warn(
        "[tt-sync] TT row deletion failed:",
        record.sourceId || record.id,
        error.message || error
      );
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

async function queueBudgetRepairResyncs({
  allPayments = [],
  clientsById = {},
}) {
  const repairedIds = [];

  for (const payment of allPayments) {
    if (
      payment.deletedAt ||
      payment.syncedToSheets !== true ||
      payment.ttBudgetRepairQueued === true ||
      payment.ttRowResyncPending === true
    ) {
      continue;
    }

    if (!parseTtRowNumber(payment)) {
      continue;
    }

    if (!isUpsellDeal(payment.dealType)) {
      continue;
    }

    const paymentBudget = Number(
      payment.budget || 0
    );

    if (paymentBudget <= 0) {
      continue;
    }

    try {
      await getDb()
        .collection("payments")
        .doc(payment.id)
        .update({
          ttRowResyncPending: true,
          ttBudgetRepairQueued: true,
        });

      repairedIds.push(payment.id);
    } catch (error) {
      console.warn(
        "[tt-sync] Budget repair queue failed:",
        payment.id,
        error.message || error
      );
    }
  }

  return repairedIds;
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
    appendSuccess: 0,
    appendFailed: 0,
    skipped: 0,
    failed: 0,
    resyncFailed: 0,
    pendingBefore: 0,
    byManager: {},
    skipReasons: {},
    syncedRows: [],
    errors: [],
    resyncErrors: [],
    configuredManagers:
      listConfiguredManagers(),
  };

  try {
    logId = await createTtSyncLog({
      status: SYNC_LOG_STATUS.PENDING,
      source,
    });

    await processTtRowDeletions(summary);

    const allPayments =
      await fetchAllActivePayments();

    await recoverMisroutedTopupPayments(
      allPayments
    );

    const activePayments =
      await fetchAllActivePayments();

    const paymentsByClient =
      buildPaymentsByClient(activePayments);

    const payments =
      await fetchUnsyncedPayments(
        paymentsByClient
      );

    const resyncPayments =
      await fetchStartDateResyncPayments();

    const vkResyncPayments =
      await fetchVkResyncPayments();

    const syncedForVkCheck =
      activePayments.filter(
        (payment) =>
          payment.syncedToSheets === true &&
          payment.clientId &&
          parseTtRowNumber(payment)
      );

    const clientsById =
      await fetchClientsForPayments([
        ...payments,
        ...resyncPayments,
        ...vkResyncPayments,
        ...syncedForVkCheck,
        ...activePayments.filter(
          (payment) =>
            isUpsellDeal(payment.dealType) &&
            payment.budget > 0
        ),
      ]);

    const budgetRepairIds =
      await queueBudgetRepairResyncs({
        allPayments: activePayments,
        clientsById,
      });

    if (budgetRepairIds.length) {
      console.log(
        "[tt-sync] Queued budget repair resync:",
        budgetRepairIds.length,
        "payment(s)"
      );
    }

    const cycleMap =
      buildPaymentCycleMap(activePayments);

    const staleVkRows =
      findStaleVkTtRows(
        syncedForVkCheck,
        clientsById
      );

    await processStartDateResyncs({
      clientsById,
      cycleMap,
      summary,
    });

    await processTtRowResyncs({
      clientsById,
      cycleMap,
      summary,
      paymentsByClient,
    });

    await processVkResyncs({
      clientsById,
      cycleMap,
      summary,
      extraPayments: staleVkRows.slice(
        0,
        STALE_VK_BATCH_LIMIT
      ),
    });

    const sorted = sortPayments(payments);
    summary.pendingBefore = sorted.length;

    for (const payment of sorted) {
      summary.processed += 1;

      const client =
        clientsById[payment.clientId] || {};

      let metadata;

      try {
        metadata =
          await getTtRowMetadataWithVk({
            payment,
            client,
            cycle: cycleMap[payment.id] || 1,
          });
      } catch (error) {
        const skipReason =
          "row_metadata_error";

        summary.skipped += 1;
        summary.skipReasons[skipReason] =
          (summary.skipReasons[skipReason] ||
            0) + 1;

        await getDb()
          .collection("syncLog")
          .add({
            type: "tt_append",
            paymentId: payment.id,
            status: SYNC_LOG_STATUS.SKIPPED,
            reason: skipReason,
            error:
              error.message ||
              String(error),
            createdAt: Date.now(),
          });

        await getDb()
          .collection("payments")
          .doc(payment.id)
          .update({
            lastTtSyncSkipReason: skipReason,
            lastTtSyncSkippedAt: Date.now(),
          });

        console.warn(
          "[tt-sync] Row metadata failed:",
          payment.id,
          error.message || error
        );

        continue;
      }

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

        await getDb()
          .collection("payments")
          .doc(payment.id)
          .update({
            lastTtSyncSkipReason: skipReason,
            lastTtSyncSkippedAt: Date.now(),
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
          await appendTtRowWithRetry({
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
        summary.appendSuccess += 1;
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
        summary.appendFailed += 1;
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
            summary.appendFailed > 0
              ? SYNC_LOG_STATUS.FAILED
              : SYNC_LOG_STATUS.SUCCESS,
          processed: summary.processed,
          successCount: summary.success,
          appendSuccessCount:
            summary.appendSuccess,
          skippedCount: summary.skipped,
          failedCount: summary.failed,
          appendFailedCount:
            summary.appendFailed,
          resyncFailedCount:
            summary.resyncFailed,
          byManager: summary.byManager,
          completedAt: Date.now(),
        });
    }

    if (summary.resyncFailed > 0) {
      console.warn(
        "[tt-sync] Resync warnings:",
        summary.resyncFailed,
        "payment(s) — new appends still ran"
      );
    }

    return {
      status:
        summary.appendFailed > 0
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
  recoverMisroutedTopupPayments,
  queueBudgetRepairResyncs,
};
