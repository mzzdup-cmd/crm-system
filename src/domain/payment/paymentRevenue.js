import {
  isRefundDealType,
  isRejectDealType,
} from "../../constants/dealTypes.js";

export function getPaymentRevenueContribution(
  payment
) {
  const dealType =
    payment?.dealType ||
    payment?.dealTypeId ||
    "";

  if (isRejectDealType(dealType)) {
    return 0;
  }

  const amount = Number(
    payment?.amount || 0
  );

  if (isRefundDealType(dealType)) {
    return 0;
  }

  return amount;
}

export function countsAsKpiSale(payment) {
  const dealType =
    payment?.dealType ||
    payment?.dealTypeId ||
    "";

  return (
    !isRejectDealType(dealType) &&
    !isRefundDealType(dealType)
  );
}
