/**
 * Show recent payments and TT sync flags.
 *
 * Usage:
 *   node scripts/ttSyncStatus.js
 *   node scripts/ttSyncStatus.js katya_bakaeva
 */

const admin = require("firebase-admin");

const {
  resolveManagerId,
} = require("../src/sync/ttRowMapper");

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

function formatPaymentDate(value) {
  if (!value) {
    return "—";
  }

  return String(value);
}

async function main() {
  initializeFirebase();

  const filterManagerId =
    process.argv[2] || null;

  const snapshot = await admin
    .firestore()
    .collection("payments")
    .get();

  const payments = snapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))
    .filter(
      (payment) => !payment.deletedAt
    )
    .map((payment) => ({
      ...payment,
      resolvedManagerId: resolveManagerId(
        payment,
        {}
      ),
    }))
    .filter((payment) => {
      if (!filterManagerId) {
        return true;
      }

      return (
        payment.resolvedManagerId ===
        filterManagerId
      );
    })
    .sort(
      (a, b) =>
        Number(b.createdAt || 0) -
        Number(a.createdAt || 0)
    );

  const unsynced = payments.filter(
    (payment) =>
      payment.syncedToSheets !== true
  );

  const synced = payments.filter(
    (payment) =>
      payment.syncedToSheets === true
  );

  console.log(
    `[tt-status] Total active: ${payments.length}`
  );
  console.log(
    `[tt-status] Synced: ${synced.length}, unsynced: ${unsynced.length}`
  );

  if (filterManagerId) {
    console.log(
      `[tt-status] Filter: ${filterManagerId}`
    );
  }

  console.log("\n--- Last 10 payments ---");

  payments.slice(0, 10).forEach((payment) => {
    const syncedFlag =
      payment.syncedToSheets === true
        ? "SYNCED"
        : "PENDING";

    console.log(
      [
        syncedFlag,
        payment.id,
        payment.resolvedManagerId || "?",
        formatPaymentDate(
          payment.paymentDate
        ),
        payment.dealType || "—",
        payment.amount || 0,
      ].join(" | ")
    );
  });

  if (unsynced.length) {
    console.log("\n--- Unsynced (will export on next tt-sync) ---");

    unsynced.forEach((payment) => {
      console.log(
        [
          payment.id,
          payment.resolvedManagerId || "?",
          formatPaymentDate(
            payment.paymentDate
          ),
          payment.amount || 0,
        ].join(" | ")
      );
    });
  } else {
    console.log(
      "\n[tt-status] No unsynced payments — tt-sync will export 0 rows."
    );
    console.log(
      "[tt-status] Create a new payment in CRM, or reset syncedToSheets=false in Firestore for a test row."
    );
  }
}

main().catch((error) => {
  console.error("[tt-status] Failed:", error);
  process.exit(1);
});
