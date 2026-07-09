const { google } = require("googleapis");

const sheetTabCache = new Map();

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

function normalizeTabName(name) {
  return String(name || "")
    .trim()
    .toUpperCase()
    .replace(/\u0422/g, "T")
    .replace(/\u0442/g, "T");
}

function toSheetRange(sheetName, cellRange) {
  const escaped = String(sheetName).replace(
    /'/g,
    "''"
  );

  return `'${escaped}'!${cellRange}`;
}

async function listSpreadsheetTabs(
  spreadsheetId
) {
  const sheets = await getSheetsClient();

  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });

  return (meta.data.sheets || []).map(
    (sheet) => sheet.properties?.title
  ).filter(Boolean);
}

async function resolveSheetTabName(
  spreadsheetId,
  preferredName = "TT"
) {
  const cacheKey = `${spreadsheetId}:${preferredName}`;

  if (sheetTabCache.has(cacheKey)) {
    return sheetTabCache.get(cacheKey);
  }

  const titles =
    await listSpreadsheetTabs(spreadsheetId);

  if (!titles.length) {
    throw new Error(
      `Spreadsheet ${spreadsheetId} has no tabs`
    );
  }

  let match = titles.find(
    (title) => title === preferredName
  );

  if (!match) {
    const target =
      normalizeTabName(preferredName);

    match = titles.find(
      (title) =>
        normalizeTabName(title) === target
    );
  }

  if (!match) {
    match = titles.find((title) =>
      /tt|тт/i.test(title)
    );
  }

  if (!match) {
    match = titles[0];
  }

  sheetTabCache.set(cacheKey, match);

  return match;
}

async function findLastTtDataRow(
  spreadsheetId,
  resolvedTab
) {
  const sheets = await getSheetsClient();

  const result =
    await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: toSheetRange(resolvedTab, "A2:A"),
    });

  const values = result.data.values || [];

  for (
    let index = values.length - 1;
    index >= 0;
    index -= 1
  ) {
    const cell = values[index]?.[0];

    if (
      cell === undefined ||
      cell === null
    ) {
      continue;
    }

    const text = String(cell).trim();

    if (text !== "") {
      return index + 2;
    }
  }

  return 1;
}

async function appendTtRow({
  spreadsheetId,
  sheetName,
  row,
}) {
  if (!Array.isArray(row) || row.length !== 16) {
    throw new Error(
      `TT row must have 16 columns (A:P), got ${row?.length}`
    );
  }

  const sheets = await getSheetsClient();

  const resolvedTab =
    await resolveSheetTabName(
      spreadsheetId,
      sheetName
    );

  const lastRow = await findLastTtDataRow(
    spreadsheetId,
    resolvedTab
  );

  const nextRow = lastRow + 1;
  const targetRange = toSheetRange(
    resolvedTab,
    `A${nextRow}:P${nextRow}`
  );

  const response =
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: targetRange,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });

  const updatedRange =
    response.data.updatedRange ||
    targetRange;

  if (
    !updatedRange.includes(
      `A${nextRow}`
    )
  ) {
    throw new Error(
      `TT row was not written to column A (got ${updatedRange})`
    );
  }

  return {
    spreadsheetId,
    sheetName: resolvedTab,
    rowNumber: nextRow,
    updatedRange,
    updatedRows: 1,
  };
}

async function updateTtRow({
  spreadsheetId,
  sheetName,
  rowNumber,
  row,
}) {
  if (!Array.isArray(row) || row.length !== 16) {
    throw new Error(
      `TT row must have 16 columns (A:P), got ${row?.length}`
    );
  }

  if (!rowNumber || rowNumber < 2) {
    throw new Error(
      `Invalid TT row number: ${rowNumber}`
    );
  }

  const sheets = await getSheetsClient();

  const resolvedTab =
    await resolveSheetTabName(
      spreadsheetId,
      sheetName
    );

  const targetRange = toSheetRange(
    resolvedTab,
    `A${rowNumber}:P${rowNumber}`
  );

  const response =
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: targetRange,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });

  return {
    spreadsheetId,
    sheetName: resolvedTab,
    rowNumber,
    updatedRange:
      response.data.updatedRange ||
      targetRange,
    updatedRows: 1,
  };
}

async function clearTtRow({
  spreadsheetId,
  sheetName,
  rowNumber,
}) {
  if (!spreadsheetId) {
    return {
      skipped: true,
      reason: "no_spreadsheet",
    };
  }

  if (!rowNumber || rowNumber < 2) {
    return {
      skipped: true,
      reason: "invalid_row",
    };
  }

  const emptyRow = Array(16).fill("");

  try {
    const result = await updateTtRow({
      spreadsheetId,
      sheetName,
      rowNumber,
      row: emptyRow,
    });

    return {
      skipped: false,
      ...result,
    };
  } catch (error) {
    const message = String(
      error?.message || error
    );

    if (
      /not found|404|unable to parse range/i.test(
        message
      )
    ) {
      return {
        skipped: true,
        reason: "row_not_found",
        error: message,
      };
    }

    throw error;
  }
}

async function writeTtSyncMeta({
  spreadsheetId,
  metaTab = "_CRM_Sync",
  payload,
}) {
  const sheets = await getSheetsClient();

  const titles =
    await listSpreadsheetTabs(spreadsheetId);

  let resolvedMetaTab = titles.find(
    (title) => title === metaTab
  );

  if (!resolvedMetaTab) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: metaTab,
              },
            },
          },
        ],
      },
    });
    resolvedMetaTab = metaTab;
  }

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
    range: toSheetRange(resolvedMetaTab, "A1"),
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values,
    },
  });

  return { metaTab: resolvedMetaTab };
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
  updateTtRow,
  clearTtRow,
  writeTtSyncMeta,
  formatMsk,
  resolveSheetTabName,
  listSpreadsheetTabs,
  toSheetRange,
};
