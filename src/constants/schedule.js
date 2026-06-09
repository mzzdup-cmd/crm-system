/**
 * Shared schedule constants for CRM School.
 * Used by frontend domain/services and Cloud Functions logic mirror.
 */

export const SHIFT_START = "11:00";
export const SHIFT_END = "21:00";
export const SHIFT_TIMEZONE = "Europe/Moscow";

export const PERMANENT_SUBSTITUTION_PAIRS = [
  ["katya_bakaeva", "violeta_petrova"],
  ["polina_penkova", "andrey_volkov"],
];

export const GROUP_OFFDAY_MANAGER_IDS = [
  "denis_manuilov",
  "ruslan_romanyuk",
  "alexander_simanov",
  "sergey_grebenshchikov",
  "polina_plamadya",
];

export const SHEETS_SYNC_COLUMNS = [
  "Дата",
  "Тип сделки",
  "Ссылка на диалог",
  "Ссылка VK клиента",
  "Сумма",
  "Бюджет",
  "Когда старт",
  "Дата первого контакта",
  "Номер счета",
  "Откуда",
  "Цикл",
  "Курс",
  "Платежная система",
  "Email",
  "Тариф",
  "Примечания",
  "Менеджер",
];

export const SYNC_LOG_STATUS = {
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
  SKIPPED: "skipped",
};
