const DEFAULT_TT_SHEET_TAB = "TT";

const TEST_KATYA_SPREADSHEET_ID =
  "1B1IBqS3hdpBSv6Ge8l8poWqS-YIHTv_UF4yFIoBPDCc";

function buildDefaultTestConfig() {
  const sheetName =
    process.env.TT_SHEET_TAB ||
    DEFAULT_TT_SHEET_TAB;

  const katyaSpreadsheetId =
    process.env.TT_KATYA_BAKAEVA_SPREADSHEET_ID ||
    TEST_KATYA_SPREADSHEET_ID;

  return {
    katya_bakaeva: {
      spreadsheetId: katyaSpreadsheetId,
      sheetName,
      label: "Копия ТТ Академия Катя Б",
    },
  };
}

function getManagerTtSheetsConfig() {
  const rawJson =
    process.env.MANAGER_TT_SPREADSHEETS_JSON;

  if (rawJson) {
    const parsed = JSON.parse(rawJson);

    return Object.fromEntries(
      Object.entries(parsed).map(
        ([managerId, config]) => [
          managerId,
          {
            spreadsheetId:
              config.spreadsheetId,
            sheetName:
              config.sheetName ||
              DEFAULT_TT_SHEET_TAB,
            label: config.label || managerId,
          },
        ]
      )
    );
  }

  return buildDefaultTestConfig();
}

function getTtSheetForManager(managerId) {
  if (!managerId) {
    return null;
  }

  const config =
    getManagerTtSheetsConfig()[managerId];

  if (
    !config?.spreadsheetId
  ) {
    return null;
  }

  return config;
}

function listConfiguredManagers() {
  return Object.keys(
    getManagerTtSheetsConfig()
  );
}

module.exports = {
  DEFAULT_TT_SHEET_TAB,
  getManagerTtSheetsConfig,
  getTtSheetForManager,
  listConfiguredManagers,
};
