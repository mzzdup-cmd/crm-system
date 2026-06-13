/**
 * Reset syncedToSheets for one payment (test re-export).
 *
 * Usage:
 *   node scripts/resetPaymentSync.js PAYMENT_ID
 */

const admin = require("firebase-admin");

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
  const paymentId = process.argv[2];

  if (!paymentId) {
    throw new Error(
      "Usage: node scripts/resetPaymentSync.js PAYMENT_ID"
    );
  }

  initializeFirebase();

  const ref = admin
    .firestore()
    .collection("payments")
    .doc(paymentId);

  const snapshot = await ref.get();

  if (!snapshot.exists) {
    throw new Error(
      `Payment not found: ${paymentId}`
    );
  }

  await ref.update({
    syncedToSheets: false,
    syncedToTt: false,
    syncedAt: admin.firestore.FieldValue.delete(),
    ttSpreadsheetId:
      admin.firestore.FieldValue.delete(),
    ttUpdatedRange:
      admin.firestore.FieldValue.delete(),
  });

  console.log(
    `[reset-sync] Payment ${paymentId} marked as unsynced. Run tt-sync again.`
  );
}

main().catch((error) => {
  console.error("[reset-sync] Failed:", error);
  process.exit(1);
});
