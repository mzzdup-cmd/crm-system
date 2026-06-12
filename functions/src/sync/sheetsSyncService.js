const { google } = require("googleapis");

function getSheetsConfig() {
  const spreadsheetId =
    process.env.SHEETS_SPREADSHEET_ID ||
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  const sheetName =
    process.env.SHEETS_SYNC_TAB || "Sync";

  const credentialsJson =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!spreadsheetId) {
    throw new Error(
      "SHEETS_SPREADSHEET_ID is not configured"
    );
  }

  if (!credentialsJson) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON is not configured"
    );
  }

  return {
    spreadsheetId,
    sheetName,
    credentials: JSON.parse(credentialsJson),
  };
}

async function getSheetsClient() {
  const { credentials } = getSheetsConfig();

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

async function appendSyncRow(row) {
  const { spreadsheetId, sheetName } =
    getSheetsConfig();

  const sheets = await getSheetsClient();

  const response =
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:Q`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [row],
      },
    });

  return {
    spreadsheetId,
    updatedRange:
      response.data.updates?.updatedRange || null,
    updatedRows:
      response.data.updates?.updatedRows || 1,
  };
}

async function replaceSyncSheet({
  headers,
  rows,
}) {
  const { spreadsheetId, sheetName } =
    getSheetsConfig();

  const sheets = await getSheetsClient();
  const range = `${sheetName}!A:Q`;

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range,
  });

  const values = [
    headers,
    ...rows,
  ];

  const response =
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values,
      },
    });

  return {
    spreadsheetId,
    sheetName,
    updatedRange:
      response.data.updatedRange || null,
    updatedRows: values.length,
  };
}

async function ensureSheetTab(
  sheets,
  spreadsheetId,
  sheetName
) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });

  const exists = (meta.data.sheets || []).some(
    (sheet) =>
      sheet.properties?.title === sheetName
  );

  if (exists) {
    return;
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: sheetName,
            },
          },
        },
      ],
    },
  });
}

async function replaceScheduleSheet({
  headers,
  rows,
}) {
  const { spreadsheetId } = getSheetsConfig();
  const sheetName =
    process.env.SHEETS_SCHEDULE_TAB || "Schedule";

  const sheets = await getSheetsClient();
  await ensureSheetTab(
    sheets,
    spreadsheetId,
    sheetName
  );
  const range = `${sheetName}!A:E`;

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range,
  });

  const values = [headers, ...rows];

  const response =
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values,
      },
    });

  return {
    spreadsheetId,
    sheetName,
    updatedRange:
      response.data.updatedRange || null,
    updatedRows: values.length,
  };
}

async function writeMetaTab({
  lastSyncAt,
  rowCount,
  paymentCount,
  scheduleRowCount = 0,
}) {
  const { spreadsheetId } =
    getSheetsConfig();

  const metaTab =
    process.env.SHEETS_META_TAB || "_Meta";

  const sheets = await getSheetsClient();

  const values = [
    ["CRM Nightly Sync"],
    ["lastSyncAt", new Date(lastSyncAt).toISOString()],
    ["lastSyncAtMsk", formatMsk(lastSyncAt)],
    ["rowCount", rowCount],
    ["paymentCount", paymentCount],
    ["scheduleRowCount", scheduleRowCount],
    ["mode", "nightly_full_replace"],
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
  appendSyncRow,
  replaceSyncSheet,
  replaceScheduleSheet,
  writeMetaTab,
  getSheetsConfig,
};
