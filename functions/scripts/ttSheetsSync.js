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

  const result =
    await runTtSheetsSync({
      source: "github_actions",
    });

  console.log(
    "[tt-sync] Finished:",
    JSON.stringify(result, null, 2)
  );

  if (result.failed > 0) {
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
