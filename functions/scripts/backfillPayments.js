/**
 * Manual backfill script for Google Sheets sync.
 *
 * Usage:
 *   cd functions
 *   set GOOGLE_SERVICE_ACCOUNT_JSON={...}
 *   set SHEETS_SPREADSHEET_ID=your_sheet_id
 *   set GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
 *   npm run backfill
 */

const admin = require("firebase-admin");
const {
  backfillUnsyncedPayments,
} = require("./src/sync/syncPaymentHandler");

if (!admin.apps.length) {
  admin.initializeApp();
}

async function main() {
  const limit =
    Number(process.env.BACKFILL_LIMIT) || 500;

  console.log(
    `Starting backfill for up to ${limit} payments...`
  );

  const result =
    await backfillUnsyncedPayments(limit);

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
