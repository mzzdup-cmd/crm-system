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
    id: "legacy_table",
    label: "Клиент из таблицы (без карточки CRM)",
    flow: "legacy",
  },
];

/** @deprecated use legacy_table */
export const LEGACY_ENTRY_ALIASES = [
  "legacy_topup",
  "Июньский подписчик (из таблицы)",
];

export const LEGACY_TABLE_TT_DEAL_TYPE_IDS = [
  "topup_new",
  "reject_new",
  "topup_bb",
  "reject_bb",
  "upsell",
  "topup_upsell",
  "reject_upsell",
  "topup_mailing",
  "reject_mailing",
  "topup_po",
  "refund",
];

export const DEFAULT_LEGACY_TT_DEAL_TYPE_ID =
  "topup_new";

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

export const LEGACY_TABLE_TT_DEAL_TYPE_OPTIONS =
  DEAL_TYPE_OPTIONS.filter((item) =>
    LEGACY_TABLE_TT_DEAL_TYPE_IDS.includes(
      item.id
    )
  );

export function getDealTypeOption(value) {
  if (!value) {
    return null;
  }

  if (
    value === "legacy_topup" ||
    value ===
      "Июньский подписчик (из таблицы)"
  ) {
    return (
      DEAL_TYPE_OPTIONS.find(
        (item) => item.id === "legacy_table"
      ) || null
    );
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

export function isTopupBbDealType(value) {
  return (
    resolveDealTypeId(value) === "topup_bb"
  );
}

export function isMailingDealType(value) {
  return (
    resolveDealTypeId(value) === "mailing"
  );
}

/** ББ / Рассылка — дату старта можно указать позже (как VK). */
export function isOptionalStartDateDealType(
  value
) {
  const id = resolveDealTypeId(value);

  return id === "bb" || id === "mailing";
}

export function isLegacyDealType(value) {
  return (
    getDealTypeOption(value)?.flow ===
      "legacy" ||
    value === "legacy_topup" ||
    value ===
      "Июньский подписчик (из таблицы)"
  );
}

export function isLegacyTableTtDealType(
  value
) {
  return LEGACY_TABLE_TT_DEAL_TYPE_IDS.includes(
    resolveDealTypeId(value)
  );
}

const REJECT_DEAL_TYPE_IDS = [
  "reject_new",
  "reject_bb",
  "reject_upsell",
  "reject_mailing",
];

export function isRejectDealType(value) {
  const id = resolveDealTypeId(value);

  if (REJECT_DEAL_TYPE_IDS.includes(id)) {
    return true;
  }

  const label = getDealTypeLabel(value);

  return (
    typeof label === "string" &&
    label.startsWith("Отказ")
  );
}

export function isTopupDealType(value) {
  const id = resolveDealTypeId(value);

  return (
    typeof id === "string" &&
    id.startsWith("topup_")
  );
}

export function isRefundDealType(value) {
  return (
    resolveDealTypeId(value) === "refund"
  );
}

/** Бюджет (сумма тарифа) при оплате существующего клиента — только апсэйл. */
export function needsBudgetFieldForExistingDeal(
  value
) {
  return resolveDealTypeId(value) === "upsell";
}

/** «Фактический старт (для куратора)» — только для новых стартов, не доплаты/отказы/возвраты. */
export function showCuratorStartDateField(
  value
) {
  const id = resolveDealTypeId(value);

  if (!id) {
    return true;
  }

  if (
    isRejectDealType(id) ||
    isTopupDealType(id) ||
    isRefundDealType(id)
  ) {
    return false;
  }

  return true;
}

export function resolveLegacyTtDealTypeId(
  value
) {
  if (isLegacyTableTtDealType(value)) {
    return resolveDealTypeId(value);
  }

  return DEFAULT_LEGACY_TT_DEAL_TYPE_ID;
}

export const LEGACY_DEAL_TYPE_ID =
  "legacy_table";
