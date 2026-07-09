const admin = require("firebase-admin");

const {
  parseTtRowNumber,
} = require("./dealTypeHelpers");

const {
  getTtSheetForManager,
} = require("./managerTtSheets");

const {
  clearTtRow,
} = require("./ttSheetsService");

function isLeadershipRole(userData) {
  return (
    userData?.role === "admin" ||
    userData?.role === "rop"
  );
}

function resolveSpreadsheetForRecord(
  record
) {
  if (record?.ttSpreadsheetId) {
    return {
      spreadsheetId: record.ttSpreadsheetId,
      sheetName: record.ttSheetName || "TT",
    };
  }

  const managerId =
    record?.ownerManagerId ||
    record?.managerId;

  const sheetConfig = getTtSheetForManager(
    managerId
  );

  if (!sheetConfig) {
    return null;
  }

  return {
    spreadsheetId:
      sheetConfig.spreadsheetId,
    sheetName:
      sheetConfig.sheetName || "TT",
  };
}

function shouldClearTtRow(record) {
  const rowNumber = parseTtRowNumber(record);

  if (!rowNumber) {
    return false;
  }

  return (
    record?.syncedToTt === true ||
    record?.syncedToSheets === true ||
    Boolean(record?.ttRowNumber) ||
    Boolean(record?.ttUpdatedRange)
  );
}

async function clearTtRowForRecord(
  record
) {
  if (!shouldClearTtRow(record)) {
    return {
      cleared: false,
      skipped: true,
      reason: "no_tt_row",
    };
  }

  const rowNumber = parseTtRowNumber(record);
  const sheetTarget =
    resolveSpreadsheetForRecord(record);

  if (!sheetTarget?.spreadsheetId) {
    return {
      cleared: false,
      skipped: true,
      reason: "no_spreadsheet",
    };
  }

  try {
    const result = await clearTtRow({
      spreadsheetId:
        sheetTarget.spreadsheetId,
      sheetName: sheetTarget.sheetName,
      rowNumber,
    });

    return {
      cleared: true,
      skipped: false,
      ...result,
    };
  } catch (error) {
    console.warn(
      "Pending sale TT row clear failed:",
      error.message
    );

    return {
      cleared: false,
      skipped: true,
      reason: "clear_failed",
      error: error.message,
    };
  }
}

async function clearPendingSaleTtRowHandler(
  request
) {
  const {
    HttpsError,
  } = require("firebase-functions/v2/https");

  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Authentication required"
    );
  }

  const pendingSaleId =
    request.data?.pendingSaleId;

  if (!pendingSaleId) {
    throw new HttpsError(
      "invalid-argument",
      "pendingSaleId is required"
    );
  }

  const userSnap = await admin
    .firestore()
    .collection("users")
    .doc(request.auth.uid)
    .get();

  const userData = userSnap.data();

  if (!isLeadershipRole(userData)) {
    throw new HttpsError(
      "permission-denied",
      "Leadership access required"
    );
  }

  const saleSnap = await admin
    .firestore()
    .collection("pendingSales")
    .doc(pendingSaleId)
    .get();

  if (!saleSnap.exists) {
    return {
      cleared: false,
      skipped: true,
      reason: "sale_not_found",
    };
  }

  return clearTtRowForRecord({
    id: saleSnap.id,
    ...saleSnap.data(),
  });
}

module.exports = {
  clearTtRowForRecord,
  clearPendingSaleTtRow: clearTtRowForRecord,
  clearPendingSaleTtRowHandler,
  shouldClearTtRow,
  shouldClearPendingSaleTtRow: shouldClearTtRow,
};
