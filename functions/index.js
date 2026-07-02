const admin = require("firebase-admin");

const {
  onDocumentCreated,
} = require("firebase-functions/v2/firestore");

const {
  onCall,
  HttpsError,
} = require("firebase-functions/v2/https");

const {
  syncPaymentToSheets,
  backfillUnsyncedPayments,
} = require("./src/sync/syncPaymentHandler");

const {
  runTtSheetsSync,
} = require("./src/sync/runTtSheetsSync");

const {
  notifyPaymentCreated,
  notifySyncFailed,
} = require("./src/notifications/notificationHelper");

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.onPaymentCreatedSyncToSheets =
  onDocumentCreated(
    {
      document: "payments/{paymentId}",
      region: "europe-west1",
      retry: true,
    },
    async (event) => {
      const paymentId = event.params.paymentId;
      const paymentData = event.data?.data();

      if (!paymentData) {
        return null;
      }

      try {
        await notifyPaymentCreated(
          paymentId,
          paymentData
        );
      } catch (error) {
        console.error(
          "Payment notification error:",
          error
        );
      }

      try {
        return await syncPaymentToSheets(
          paymentId,
          paymentData
        );
      } catch (error) {
        try {
          await notifySyncFailed(
            paymentId,
            error.message
          );
        } catch (notifyError) {
          console.error(
            "Sync failure notification error:",
            notifyError
          );
        }

        throw error;
      }
    }
  );

exports.backfillPaymentsSync = onCall(
  {
    region: "europe-west1",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Authentication required"
      );
    }

    const userSnap = await admin
      .firestore()
      .collection("users")
      .doc(request.auth.uid)
      .get();

    const userData = userSnap.data();

    if (!userData || userData.role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Admin access required"
      );
    }

    const limit =
      Number(request.data?.limit) || 200;

    return backfillUnsyncedPayments(limit);
  }
);

exports.triggerTtSheetsSync = onCall(
  {
    region: "europe-west1",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Authentication required"
      );
    }

    const userSnap = await admin
      .firestore()
      .collection("users")
      .doc(request.auth.uid)
      .get();

    const userData = userSnap.data();

    if (!userData || userData.role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Admin access required"
      );
    }

    return runTtSheetsSync({
      source: "crm_manual",
    });
  }
);


const {
  updatePaymentStartDateHandler,
} = require("./src/payments/updatePaymentStartDateHandler");

exports.updatePaymentStartDate = onCall(
  {
    region: "europe-west1",
  },
  updatePaymentStartDateHandler
);
