const MANAGER_NAMES = {
  denis_manuilov: "Денис Мануйлов",
  ruslan_romanyuk: "Руслан Романюк",
  alexander_simanov: "Александр Симанов",
  sergey_grebenshchikov: "Сергей Гребенщиков",
  andrey_volkov: "Андрей Волков",
  polina_penkova: "Полина Пенькова",
  katya_bakaeva: "Катя Бакаева",
  polina_plamadya: "Полина Пламадяла",
  violeta_petrova: "Виолетта Петрова",
};

function getStartDate(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + diff);

  return date.toISOString().split("T")[0];
}

function formatDateValue(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value?.toDate) {
    return value.toDate().toISOString().split("T")[0];
  }

  return String(value);
}

function resolveManagerName(payment, client) {
  if (payment?.manager) {
    return payment.manager;
  }

  if (payment?.managerId) {
    return MANAGER_NAMES[payment.managerId] || payment.managerId;
  }

  return client?.manager || "";
}

function mapPaymentToSyncRow({ payment, client = {}, cycle = 1 }) {
  const isLegacyClient =
    payment.isLegacyClient === true;
  const isMinimalLegacy =
    payment.isLegacy === true &&
    !isLegacyClient;

  const startDate = isMinimalLegacy
    ? ""
    : payment.startDate ||
      getStartDate(payment.paymentDate);

  const budget = isMinimalLegacy
    ? ""
    : isLegacyClient
      ? Number(payment.budget ?? 0)
      : Number(client.budget || 0);

  return [
    formatDateValue(payment.paymentDate),
    payment.dealType || "",
    payment.dialogLink ||
      client.dialogLink ||
      "",
    payment.vkLink ||
      client.vkLink ||
      "",
    Number(payment.amount || 0),
    budget,
    formatDateValue(startDate),
    formatDateValue(
      payment.firstContact ||
        client.firstContact
    ),
    payment.invoiceNumber || "",
    payment.sourceName ||
      client.sourceName ||
      client.source ||
      "",
    Number(cycle || 1),
    payment.course || client.course || "",
    payment.paymentSystem || "",
    client.email || "",
    payment.tariff || client.tariff || "",
    payment.clientNote ||
      client.clientNote ||
      payment.comment ||
      "",
    resolveManagerName(payment, client),
  ];
}

function getSyncRowMetadata({ payment, client, cycle }) {
  return {
    paymentId: payment.id,
    clientId:
      payment.isLegacyClient
        ? null
        : payment.clientId ||
          client?.id ||
          null,
    managerId: payment.managerId || client?.managerId || null,
    cycle: Number(cycle || 1),
    row: mapPaymentToSyncRow({ payment, client, cycle }),
  };
}

module.exports = {
  mapPaymentToSyncRow,
  getSyncRowMetadata,
};
