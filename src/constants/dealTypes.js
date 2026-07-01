export const DEAL_TYPE_OPTIONS = [
  {
    id: "new",
    label: "Новая",
    flow: "new",
  },
  {
    id: "topup_new",
    label: "Доплата Новая",
    flow: "existing",
  },
  {
    id: "reject_new",
    label: "Отказ Новая",
    flow: "existing",
  },
  {
    id: "bb",
    label: "ББ",
    flow: "new",
  },
  {
    id: "topup_bb",
    label: "Доплата ББ",
    flow: "existing",
  },
  {
    id: "reject_bb",
    label: "Отказ ББ",
    flow: "existing",
  },
  {
    id: "upsell",
    label: "Апсэйл",
    flow: "existing",
  },
  {
    id: "topup_upsell",
    label: "Доплата Апсэйл",
    flow: "existing",
  },
  {
    id: "reject_upsell",
    label: "Отказ Апсэйл",
    flow: "existing",
  },
  {
    id: "mailing",
    label: "Рассылка",
    flow: "new",
  },
  {
    id: "topup_mailing",
    label: "Доплата Рассылка",
    flow: "existing",
  },
  {
    id: "reject_mailing",
    label: "Отказ Рассылка",
    flow: "existing",
  },
  {
    id: "topup_po",
    label: "Доплата ПО",
    flow: "existing",
  },
  {
    id: "refund",
    label: "Возврат",
    flow: "existing",
  },
  {
    id: "legacy_topup",
    label: "Июньский подписчик (из таблицы)",
    flow: "legacy",
  },
];

/** @deprecated use DEAL_TYPE_OPTIONS */
export const DEAL_TYPES = DEAL_TYPE_OPTIONS.map(
  (item) => item.label
);

export const NEW_CLIENT_DEAL_TYPES =
  DEAL_TYPE_OPTIONS.filter(
    (item) => item.flow === "new"
  ).map((item) => item.label);

export const EXISTING_CLIENT_DEAL_TYPES =
  DEAL_TYPE_OPTIONS.filter(
    (item) => item.flow === "existing"
  ).map((item) => item.label);

export function getDealTypeOption(value) {
  if (!value) {
    return null;
  }

  return (
    DEAL_TYPE_OPTIONS.find(
      (item) => item.id === value
    ) ||
    DEAL_TYPE_OPTIONS.find(
      (item) => item.label === value
    ) ||
    null
  );
}

export function resolveDealTypeId(value) {
  return (
    getDealTypeOption(value)?.id || ""
  );
}

export function getDealTypeLabel(value) {
  return (
    getDealTypeOption(value)?.label ||
    value ||
    ""
  );
}

export function isNewClientDealType(value) {
  return (
    getDealTypeOption(value)?.flow ===
    "new"
  );
}

export function isExistingClientDealType(
  value
) {
  return (
    getDealTypeOption(value)?.flow ===
    "existing"
  );
}

export function hasDealTypeSelected(value) {
  return Boolean(getDealTypeOption(value));
}

export function isBbDealType(value) {
  return resolveDealTypeId(value) === "bb";
}

export function isLegacyDealType(value) {
  return (
    getDealTypeOption(value)?.flow ===
    "legacy"
  );
}

export const LEGACY_DEAL_TYPE_ID =
  "legacy_topup";
