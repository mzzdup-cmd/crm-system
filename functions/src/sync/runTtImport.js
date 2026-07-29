const admin = require("firebase-admin");

const {
  readTtSheetRows,
  formatMsk,
} = require("./ttSheetsService");

const {
  getTtSheetForManager,
  listConfiguredManagers,
} = require("./managerTtSheets");

const {
  cellsToTtSale,
  getCurrentMonthRangeIsoMsk,
  isPaymentDateInCurrentMonth,
} = require("./ttRowParser");

const WRITE_BATCH_LIMIT = 400;
const DELETE_QUERY_LIMIT = 400;

function getDb() {
  return admin.firestore();
}

async function commitInBatches(operations) {
  for (
    let index = 0;
    index < operations.length;
    index += WRITE_BATCH_LIMIT
  ) {
    const chunk = operations.slice(
      index,
      index + WRITE_BATCH_LIMIT
    );
    const batch = getDb().batch();

    chunk.forEach((operation) => {
      operation(batch);
    });

    await batch.commit();
  }
}

async function deleteQueryDocs(salesQuery) {
  let deleted = 0;

  while (true) {
    const snapshot = await salesQuery.get();

    if (snapshot.empty) {
      break;
    }

    const operations = snapshot.docs.map(
      (docSnap) => (batch) => {
        batch.delete(docSnap.ref);
      }
    );

    await commitInBatches(operations);
    deleted += snapshot.size;

    if (snapshot.size < DELETE_QUERY_LIMIT) {
      break;
    }
  }

  return deleted;
}

async function pruneOutOfMonthSales(
  managerId,
  { start, endExclusive }
) {
  const collectionRef = getDb().collection(
    "ttSales"
  );

  const before = await deleteQueryDocs(
    collectionRef
      .where("managerId", "==", managerId)
      .where("paymentDate", "<", start)
      .orderBy("paymentDate", "desc")
      .limit(DELETE_QUERY_LIMIT)
  );

  const after = await deleteQueryDocs(
    collectionRef
      .where("managerId", "==", managerId)
      .where("paymentDate", ">=", endExclusive)
      .orderBy("paymentDate", "desc")
      .limit(DELETE_QUERY_LIMIT)
  );

  return before + after;
}

async function importManagerTtSheet({
  managerId,
  importedAt,
  monthRange,
}) {
  const ttConfig =
    getTtSheetForManager(managerId);

  if (!ttConfig?.spreadsheetId) {
    return {
      managerId,
      skipped: true,
      reason: "not_configured",
      rows: 0,
      pruned: 0,
    };
  }

  const sheetData = await readTtSheetRows({
    spreadsheetId: ttConfig.spreadsheetId,
    sheetName: ttConfig.sheetName,
  });

  const sales = sheetData.rows
    .map((row) =>
      cellsToTtSale({
        cells: row.cells,
        rowNumber: row.rowNumber,
        managerId,
        spreadsheetId:
          sheetData.spreadsheetId,
        sheetName: sheetData.sheetName,
        importedAt,
      })
    )
    .filter(Boolean)
    .filter((sale) =>
      isPaymentDateInCurrentMonth(
        sale.paymentDate,
        new Date(importedAt)
      )
    );

  const operations = sales.map((sale) => {
    const ref = getDb()
      .collection("ttSales")
      .doc(sale.id);

    return (batch) => {
      batch.set(ref, sale, { merge: true });
    };
  });

  await commitInBatches(operations);

  const pruned = await pruneOutOfMonthSales(
    managerId,
    monthRange
  );

  return {
    managerId,
    skipped: false,
    rows: sales.length,
    pruned,
    monthStart: monthRange.start,
    monthEndExclusive: monthRange.endExclusive,
    spreadsheetId: sheetData.spreadsheetId,
    sheetName: sheetData.sheetName,
  };
}

async function runTtImport() {
  const startedAt = Date.now();
  const monthRange =
    getCurrentMonthRangeIsoMsk(
      new Date(startedAt)
    );
  const managers = listConfiguredManagers();
  const byManager = {};
  const errors = [];
  let totalRows = 0;
  let totalPruned = 0;

  console.log(
    "[tt-import] Current month MSK:",
    `${monthRange.start} .. < ${monthRange.endExclusive}`
  );

  for (const managerId of managers) {
    try {
      const result =
        await importManagerTtSheet({
          managerId,
          importedAt: startedAt,
          monthRange,
        });

      byManager[managerId] = result;

      if (!result.skipped) {
        totalRows += result.rows;
        totalPruned += result.pruned || 0;
      }
    } catch (error) {
      const message =
        error.message || String(error);

      byManager[managerId] = {
        managerId,
        skipped: true,
        reason: "error",
        rows: 0,
        pruned: 0,
        error: message,
      };

      errors.push({
        managerId,
        error: message,
      });

      console.warn(
        "[tt-import] Manager failed:",
        managerId,
        message
      );
    }
  }

  const finishedAt = Date.now();

  await getDb()
    .collection("ttImportMeta")
    .doc("latest")
    .set(
      {
        lastImportAt: finishedAt,
        lastImportAtIso: new Date(
          finishedAt
        ).toISOString(),
        lastImportAtMsk: formatMsk(finishedAt),
        startedAt,
        durationMs: finishedAt - startedAt,
        managerCount: managers.length,
        totalRows,
        totalPruned,
        monthStart: monthRange.start,
        monthEndExclusive:
          monthRange.endExclusive,
        byManager,
        errors,
      },
      { merge: true }
    );

  return {
    startedAt,
    finishedAt,
    durationMs: finishedAt - startedAt,
    managerCount: managers.length,
    totalRows,
    totalPruned,
    monthStart: monthRange.start,
    monthEndExclusive: monthRange.endExclusive,
    byManager,
    errors,
  };
}

module.exports = {
  runTtImport,
  importManagerTtSheet,
  getCurrentMonthRangeIsoMsk,
};
