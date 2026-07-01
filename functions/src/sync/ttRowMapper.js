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

const LEGACY_MANAGER_ALIASES = {
  Катя: "katya_bakaeva",
  Руслан: "ruslan_romanyuk",
  "Руслан Р": "ruslan_romanyuk",
  Полина: "polina_penkova",
  "Сергей Г": "sergey_grebenshchikov",
  "Денис М": "denis_manuilov",
  "Андрей В": "andrey_volkov",
  "Александр С": "alexander_simanov",
  "Виолетта П": "violeta_petrova",
  "Полина Пламадяла": "polina_plamadya",
  polina_plamadyala: "polina_plamadya",
  vilu_petrova: "violeta_petrova",
};

function getStartDate(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(`${dateString}T12:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + diff);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "number") {
    return new Date(value);
  }

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T12:00:00`);
    }

    return new Date(value);
  }

  if (value?.toDate) {
    return value.toDate();
  }

  return null;
}

function formatDateRu(value) {
  const date = parseDateValue(value);

  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
}

function resolveManagerId(payment, client) {
  if (payment?.managerId) {
    const id = payment.managerId;

    return (
      LEGACY_MANAGER_ALIASES[id] || id
    );
  }

  if (client?.managerId) {
    const id = client.managerId;

    return (
      LEGACY_MANAGER_ALIASES[id] || id
    );
  }

  const name =
    payment?.manager || client?.manager || "";

  if (!name) {
    return null;
  }

  if (LEGACY_MANAGER_ALIASES[name]) {
    return LEGACY_MANAGER_ALIASES[name];
  }

  const exactMatch = Object.entries(
    MANAGER_NAMES
  ).find(
    ([, managerName]) =>
      managerName === name
  );

  if (exactMatch) {
    return exactMatch[0];
  }

  const partialMatch = Object.entries(
    MANAGER_NAMES
  ).find(([, managerName]) =>
    name.startsWith(
      managerName.split(" ")[0]
    )
  );

  return partialMatch?.[0] || null;
}

function mapPaymentToTtRow({
  payment,
  client = {},
  cycle = 1,
}) {
  const isLegacyClient =
    payment.isLegacyClient === true;
  const isMinimalLegacy =
    payment.isLegacy === true &&
    !isLegacyClient;

  const isRejectDeal = String(
    payment.dealType || ""
  ).startsWith("Отказ");

  const startDate = isMinimalLegacy
    ? ""
    : isRejectDeal
      ? ""
      : payment.startDate ||
        getStartDate(payment.paymentDate);

  const budget = isMinimalLegacy
    ? ""
    : isLegacyClient
      ? Number(payment.budget ?? 0)
      : Number(client.budget || 0);

  return [
    formatDateRu(payment.paymentDate),
    payment.dealType || "",
    payment.dialogLink ||
      client.dialogLink ||
      "",
    payment.vkLink ||
      client.vkLink ||
      "",
    isRejectDeal
      ? ""
      : Number(payment.amount || 0),
    isRejectDeal ? "" : budget,
    formatDateRu(startDate),
    formatDateRu(
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
  ];
}

function getTtRowMetadata({
  payment,
  client,
  cycle,
}) {
  return {
    paymentId: payment.id,
    clientId:
      payment.isLegacyClient
        ? null
        : payment.clientId ||
          client?.id ||
          null,
    managerId: resolveManagerId(
      payment,
      client
    ),
    cycle: Number(cycle || 1),
    row: mapPaymentToTtRow({
      payment,
      client,
      cycle,
    }),
  };
}

module.exports = {
  mapPaymentToTtRow,
  getTtRowMetadata,
  resolveManagerId,
  formatDateRu,
};
