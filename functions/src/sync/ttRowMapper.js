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

const {
  canonicalManagerId,
  LEGACY_MANAGER_ALIASES,
} = require("./canonicalManagerId");

const {
  isOptionalStartDateDeal,
  isTopupDeal,
} = require("./dealTypeHelpers");

const {
  formatCourseForTt,
} = require("./courseTtExport");

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
    return canonicalManagerId(
      payment.managerId
    );
  }

  if (client?.managerId) {
    return canonicalManagerId(
      client.managerId
    );
  }

  const name =
    payment?.manager || client?.manager || "";

  if (!name) {
    return null;
  }

  if (LEGACY_MANAGER_ALIASES[name]) {
    return canonicalManagerId(
      LEGACY_MANAGER_ALIASES[name]
    );
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

  const rawStartDate = isMinimalLegacy
    ? ""
    : isOptionalStartDateDeal(
          payment.dealType
        )
      ? payment.startDate || ""
      : payment.startDate ||
        getStartDate(payment.paymentDate);

  const budget =
    isMinimalLegacy ||
    isRejectDeal ||
    isTopupDeal(payment.dealType)
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
    formatDateRu(rawStartDate),
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
    formatCourseForTt(
      payment.course || client.course || ""
    ),
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

async function getTtRowMetadataWithVk({
  payment,
  client,
  cycle,
}) {
  const {
    resolveVkLink,
  } = require("../vk/vkLinkResolver");

  const rawVk =
    payment.vkLink ||
    client?.vkLink ||
    "";

  let vkLink = rawVk;

  if (rawVk) {
    try {
      const resolved =
        await resolveVkLink(rawVk);

      vkLink =
        resolved.normalized || rawVk;
    } catch (error) {
      console.warn(
        "VK resolve failed for TT:",
        rawVk,
        error.message
      );
    }
  }

  const enrichedPayment =
    vkLink &&
    vkLink !== payment.vkLink
      ? {
          ...payment,
          vkLink,
        }
      : payment;

  const enrichedClient =
    vkLink &&
    client &&
    vkLink !== client.vkLink
      ? {
          ...client,
          vkLink,
        }
      : client;

  return getTtRowMetadata({
    payment: enrichedPayment,
    client: enrichedClient,
    cycle,
  });
}

module.exports = {
  mapPaymentToTtRow,
  getTtRowMetadata,
  getTtRowMetadataWithVk,
  resolveManagerId,
  formatDateRu,
};
