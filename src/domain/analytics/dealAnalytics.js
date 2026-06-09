import {
  NEW_CLIENT_DEAL_TYPES,
} from "../../constants/dealTypes";

export const DEAL_CATEGORIES = {
  NEW: "new",
  TOPUP: "topup",
  UPSELL: "upsell",
  RETURN: "return",
  REFUSAL: "refusal",
  OTHER: "other",
};

export function getDealCategory(dealType) {
  if (!dealType) {
    return DEAL_CATEGORIES.OTHER;
  }

  if (dealType === "Возврат") {
    return DEAL_CATEGORIES.RETURN;
  }

  if (
    dealType.startsWith("Отказ")
  ) {
    return DEAL_CATEGORIES.REFUSAL;
  }

  if (
    dealType === "Апсэйл" ||
    dealType.startsWith("Доплата Апсэйл")
  ) {
    return DEAL_CATEGORIES.UPSELL;
  }

  if (
    dealType.startsWith("Доплата")
  ) {
    return DEAL_CATEGORIES.TOPUP;
  }

  if (
    NEW_CLIENT_DEAL_TYPES.includes(
      dealType
    )
  ) {
    return DEAL_CATEGORIES.NEW;
  }

  return DEAL_CATEGORIES.OTHER;
}

export function aggregateDealCategories(
  payments
) {
  const totals = {
    new: { count: 0, revenue: 0 },
    topup: { count: 0, revenue: 0 },
    upsell: { count: 0, revenue: 0 },
    return: { count: 0, revenue: 0 },
    refusal: { count: 0, revenue: 0 },
    other: { count: 0, revenue: 0 },
  };

  payments.forEach((payment) => {
    const category = getDealCategory(
      payment.dealType
    );

    totals[category].count += 1;
    totals[category].revenue += Number(
      payment.amount || 0
    );
  });

  return totals;
}

export function getDealPieData(dealTotals) {
  return [
    {
      name: "Новые",
      value: dealTotals.new.revenue,
      count: dealTotals.new.count,
    },
    {
      name: "Доплаты",
      value: dealTotals.topup.revenue,
      count: dealTotals.topup.count,
    },
    {
      name: "Апсэйлы",
      value: dealTotals.upsell.revenue,
      count: dealTotals.upsell.count,
    },
    {
      name: "Возвраты",
      value: dealTotals.return.revenue,
      count: dealTotals.return.count,
    },
  ].filter((item) => item.value > 0);
}
