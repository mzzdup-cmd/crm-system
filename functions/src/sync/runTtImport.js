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
} = require("./ttRowParser");

const WRITE_BATCH_LIMIT = 400;

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

async function importManagerTtSheet({
  managerId,
  importedAt,
}) {
  const ttConfig =
    getTtSheetForManager(managerId);

  if (!ttConfig?.spreadsheetId) {
    return {
      managerId,
      skipped: true,
      reason: "not_configured",
      rows: 0,
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
    .filter(Boolean);

  const operations = sales.map((sale) => {
    const ref = getDb()
      .collection("ttSales")
      .doc(sale.id);

    return (batch) => {
      batch.set(ref, sale, { merge: true });
    };
  });

  await commitInBatches(operations);

  return {
    managerId,
    skipped: false,
    rows: sales.length,
    spreadsheetId: sheetData.spreadsheetId,
    sheetName: sheetData.sheetName,
  };
}

async function runTtImport() {
  const startedAt = Date.now();
  const managers = listConfiguredManagers();
  const byManager = {};
  const errors = [];
  let totalRows = 0;

  for (const managerId of managers) {
    try {
      const result =
        await importManagerTtSheet({
          managerId,
          importedAt: startedAt,
        });

      byManager[managerId] = result;

      if (!result.skipped) {
        totalRows += result.rows;
      }
    } catch (error) {
      const message =
        error.message || String(error);

      byManager[managerId] = {
        managerId,
        skipped: true,
        reason: "error",
        rows: 0,
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
    byManager,
    errors,
  };
}

module.exports = {
  runTtImport,
  importManagerTtSheet,
};
