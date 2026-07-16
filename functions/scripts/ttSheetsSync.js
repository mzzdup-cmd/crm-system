/**
 * Append unsynced CRM payments → manager TT Google Sheets.
 *
 * Required env:
 *   GOOGLE_SERVICE_ACCOUNT_JSON
 *   FIREBASE_PROJECT_ID (optional)
 *
 * Optional:
 *   TT_SHEET_TAB=TT
 *   TT_KATYA_BAKAEVA_SPREADSHEET_ID
 *   MANAGER_TT_SPREADSHEETS_JSON
 */

const admin = require("firebase-admin");

const {
  runTtSheetsSync,
} = require("../src/sync/runTtSheetsSync");

const {
  listConfiguredManagers,
} = require("../src/sync/managerTtSheets");

function initializeFirebase() {
  if (admin.apps.length) {
    return;
  }

  const credentialsJson =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!credentialsJson) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON is not configured"
    );
  }

  const credentials =
    JSON.parse(credentialsJson);

  admin.initializeApp({
    credential:
      admin.credential.cert(credentials),
    projectId:
      process.env.FIREBASE_PROJECT_ID ||
      credentials.project_id,
  });
}

async function main() {
  initializeFirebase();

  console.log(
    "[tt-sync] Starting TT append sync..."
  );
  console.log(
    "[tt-sync] Configured managers:",
    listConfiguredManagers().join(", ")
  );

  const {
    resolveSheetTabName,
  } = require("../src/sync/ttSheetsService");

  const katyaConfig = require("../src/sync/managerTtSheets")
    .getTtSheetForManager("katya_bakaeva");

  if (katyaConfig?.spreadsheetId) {
    try {
      const resolvedTab =
        await resolveSheetTabName(
          katyaConfig.spreadsheetId,
          katyaConfig.sheetName
        );

      console.log(
        `[tt-sync] TT tab resolved: "${resolvedTab}"`
      );
    } catch (error) {
      console.warn(
        "[tt-sync] TT tab resolve skipped (non-fatal):",
        error.message || error
      );
    }
  }

  const result =
    await runTtSheetsSync({
      source: "github_actions",
    });

  console.log(
    "[tt-sync] Finished:",
    JSON.stringify(result, null, 2)
  );

  console.log(
    `[tt-sync] Summary: pending=${result.pendingBefore}, ` +
      `appended=${result.appendSuccess ?? result.success}, ` +
      `skipped=${result.skipped}, appendFailed=${result.appendFailed ?? result.failed}, ` +
      `resyncOk=${result.success - (result.appendSuccess ?? 0)}, ` +
      `resyncFailed=${result.resyncFailed || 0}`
  );

  if (result.syncedRows?.length) {
    result.syncedRows.forEach((row) => {
      console.log(
        `[tt-sync] Row written: payment ${row.paymentId} → ` +
          `${row.sheetName}!A${row.rowNumber}`
      );
    });
  }

  const appendSuccess =
    result.appendSuccess ?? 0;
  const appendFailed =
    result.appendFailed ?? result.failed ?? 0;

  const pendingAppendStuck =
    result.pendingBefore > 0 &&
    appendSuccess === 0 &&
    appendFailed === 0;

  if (pendingAppendStuck) {
    console.warn(
      "[tt-sync] WARNING: pending payments exist but none were appended.",
      result.skipReasons || {}
    );
  }

  if (result.resyncFailed > 0) {
    console.warn(
      "[tt-sync] WARNING: resync errors (non-fatal):",
      result.resyncErrors
    );
  }

  if (appendFailed > 0) {
    console.error(
      "[tt-sync] Append failures:",
      result.errors
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(
    "[tt-sync] Failed:",
    error
  );
  process.exit(1);
});
