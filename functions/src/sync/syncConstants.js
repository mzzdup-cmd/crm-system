const SHEETS_SYNC_COLUMNS = [
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

const SYNC_LOG_STATUS = {
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
  SKIPPED: "skipped",
};

module.exports = {
  SHEETS_SYNC_COLUMNS,
  SYNC_LOG_STATUS,
};
