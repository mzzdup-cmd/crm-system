/**
 * Nightly full replace sync: Firestore → Google Sheets (CRM Sync tab).
 *
 * Designed for GitHub Actions (free) + service account.
 *
 * Required env:
 *   GOOGLE_SERVICE_ACCOUNT_JSON  — full service account JSON
 *   SHEETS_SPREADSHEET_ID        — CRM Sync spreadsheet id
 *   FIREBASE_PROJECT_ID          — optional, defaults to SA project_id
 *
 * Optional:
 *   SHEETS_SYNC_TAB=Sync
 *   SHEETS_META_TAB=_Meta
 */

const admin = require("firebase-admin");

const {
  runFullSheetsSync,
} = require("../src/sync/fullSheetsSync");

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
    "[nightly-sync] Starting full CRM Sync export..."
  );

  const result =
    await runFullSheetsSync();

  console.log(
    "[nightly-sync] Success:",
    JSON.stringify(result, null, 2)
  );
}

main().catch((error) => {
  console.error(
    "[nightly-sync] Failed:",
    error
  );
  process.exit(1);
});
