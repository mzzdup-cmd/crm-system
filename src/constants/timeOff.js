export const REQUEST_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export const REQUEST_STATUS_LABELS = {
  pending: "На рассмотрении",
  approved: "Одобрено",
  rejected: "Отклонено",
};

export function normalizeRequestStatus(
  status
) {
  if (!status) {
    return "";
  }

  const value = String(status).trim();

  if (
    value === REQUEST_STATUS.APPROVED ||
    value === "Одобрено"
  ) {
    return REQUEST_STATUS.APPROVED;
  }

  if (
    value === REQUEST_STATUS.PENDING ||
    value === "На рассмотрении"
  ) {
    return REQUEST_STATUS.PENDING;
  }

  if (
    value === REQUEST_STATUS.REJECTED ||
    value === "Отклонено"
  ) {
    return REQUEST_STATUS.REJECTED;
  }

  return value;
}
