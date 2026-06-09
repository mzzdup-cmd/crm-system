export const PAYMENT_SYSTEMS = [
  "Продамус",
  "Юкасса",
  "CloudPayments",
  "Робокасса",
  "Крипта",
];

export const CRYPTO_PAYMENT_SYSTEM = "Крипта";

export function requiresInvoice(paymentSystem) {
  return paymentSystem !== CRYPTO_PAYMENT_SYSTEM;
}
