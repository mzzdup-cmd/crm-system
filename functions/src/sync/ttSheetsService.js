const { google } = require("googleapis");

function getCredentials() {
  const credentialsJson =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!credentialsJson) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON is not configured"
    );
  }

  return JSON.parse(credentialsJson);
}

async function getSheetsClient() {
  const credentials = getCredentials();

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });

  return google.sheets({
    version: "v4",
    auth,
  });
}

async function appendTtRow({
  spreadsheetId,
  sheetName,
  row,
}) {
  const sheets = await getSheetsClient();

  const response =
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:P`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [row],
      },
    });

  return {
    spreadsheetId,
    sheetName,
    updatedRange:
      response.data.updates?.updatedRange ||
      null,
    updatedRows:
      response.data.updates?.updatedRows || 1,
  };
}

async function writeTtSyncMeta({
  spreadsheetId,
  metaTab = "_CRM_Sync",
  payload,
}) {
  const sheets = await getSheetsClient();

  const values = [
    ["CRM TT Sync"],
    ["lastSyncAt", payload.lastSyncAtIso],
    ["lastSyncAtMsk", payload.lastSyncAtMsk],
    ["successCount", payload.successCount],
    ["skippedCount", payload.skippedCount],
    ["failedCount", payload.failedCount],
    ["mode", "tt_append"],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${metaTab}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values,
    },
  });

  return { metaTab };
}

function formatMsk(timestamp) {
  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      timeZone: "Europe/Moscow",
      dateStyle: "short",
      timeStyle: "medium",
    }
  ).format(new Date(timestamp));
}

module.exports = {
  appendTtRow,
  writeTtSyncMeta,
  formatMsk,
};
