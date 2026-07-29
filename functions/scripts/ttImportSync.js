/**
 * Import manager TT Google Sheets → Firestore ttSales.
 *
 * Required env:
 *   GOOGLE_SERVICE_ACCOUNT_JSON
 *   FIREBASE_PROJECT_ID (optional)
 *
 * Optional:
 *   TT_SHEET_TAB=TT
 *   MANAGER_TT_SPREADSHEETS_JSON
 */

const admin = require("firebase-admin");

const {
  runTtImport,
} = require("../src/sync/runTtImport");

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
    "[tt-import] Starting TT → CRM import..."
  );
  console.log(
    "[tt-import] Configured managers:",
    listConfiguredManagers().join(", ")
  );

  const result = await runTtImport();

  console.log(
    "[tt-import] Finished:",
    `managers=${result.managerCount}`,
    `rows=${result.totalRows}`,
    `durationMs=${result.durationMs}`,
    `errors=${result.errors.length}`
  );

  for (const [
    managerId,
    managerResult,
  ] of Object.entries(result.byManager)) {
    if (managerResult.skipped) {
      console.log(
        `[tt-import] ${managerId}: skipped (${managerResult.reason || "unknown"})`
      );
      continue;
    }

    console.log(
      `[tt-import] ${managerId}: ${managerResult.rows} row(s)`
    );
  }

  if (result.errors.length) {
    console.error(
      "[tt-import] Errors:",
      result.errors
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    "[tt-import] Failed:",
    error.message || error
  );
  process.exit(1);
});
