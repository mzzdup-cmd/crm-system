const DEFAULT_TT_SHEET_TAB = "TT";

const {
  canonicalManagerId,
} = require("./canonicalManagerId");

const PRODUCTION_MANAGER_TT_SHEETS = require(
  "./managerTtSpreadsheets.json"
);

/** Firestore typos → canonical managerId in config */
const MANAGER_ID_ALIASES = {
  polina_plamadyala: "polina_plamadya",
  vilu_petrova: "violeta_petrova",
  vilu: "violeta_petrova",
  violeta: "violeta_petrova",
  denis: "denis_manuilov",
  ruslan: "ruslan_romanyuk",
  alexander: "alexander_simanov",
  sergey: "sergey_grebenshchikov",
  andrey: "andrey_volkov",
  katya: "katya_bakaeva",
};

function normalizeSheetConfig(
  managerId,
  config
) {
  return {
    spreadsheetId: config.spreadsheetId,
    sheetName:
      config.sheetName ||
      DEFAULT_TT_SHEET_TAB,
    label:
      config.label || managerId,
  };
}

function buildProductionConfig() {
  return Object.fromEntries(
    Object.entries(
      PRODUCTION_MANAGER_TT_SHEETS
    ).map(([managerId, config]) => [
      managerId,
      normalizeSheetConfig(
        managerId,
        config
      ),
    ])
  );
}

function getManagerTtSheetsConfig() {
  const rawJson =
    process.env.MANAGER_TT_SPREADSHEETS_JSON;

  if (rawJson?.trim()) {
    const parsed = JSON.parse(rawJson);

    return Object.fromEntries(
      Object.entries(parsed).map(
        ([managerId, config]) => [
          managerId,
          normalizeSheetConfig(
            managerId,
            config
          ),
        ]
      )
    );
  }

  return buildProductionConfig();
}

function resolveManagerConfigKey(managerId) {
  const canonicalId =
    canonicalManagerId(managerId);

  if (!canonicalId) {
    return null;
  }

  const config =
    getManagerTtSheetsConfig();

  if (config[canonicalId]) {
    return canonicalId;
  }

  const alias =
    MANAGER_ID_ALIASES[canonicalId];

  if (alias && config[alias]) {
    return alias;
  }

  return null;
}

function getTtSheetForManager(managerId) {
  const configKey =
    resolveManagerConfigKey(managerId);

  if (!configKey) {
    return null;
  }

  return getManagerTtSheetsConfig()[
    configKey
  ];
}

function listConfiguredManagers() {
  return Object.keys(
    getManagerTtSheetsConfig()
  );
}

module.exports = {
  DEFAULT_TT_SHEET_TAB,
  PRODUCTION_MANAGER_TT_SHEETS,
  getManagerTtSheetsConfig,
  getTtSheetForManager,
  listConfiguredManagers,
};
