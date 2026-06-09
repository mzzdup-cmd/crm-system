import {
  getDateRange,
  filterItemsByRange,
  parsePaymentDate,
  ANALYTICS_PERIODS,
} from "../domain/analytics/periodFilters";

import {
  getRemain,
  isOverdue,
  hasDebt,
  getClientStatus,
} from "../domain/client/clientStatus";

import {
  getManagerNameById,
} from "../constants/managers";

import {
  buildSyncExportTable,
  indexClientsById,
} from "../domain/export/syncExportBuilder";

import {
  getAllPayments,
} from "./paymentService";

import {
  getAllClients,
} from "./clientService";

import {
  getAllPendingSales,
} from "./pendingSalesService";

import {
  getAdminAnalytics,
} from "./analyticsService";

function formatExportDate(date = new Date()) {
  return date
    .toISOString()
    .split("T")[0];
}

function buildFilename(
  prefix,
  period,
  extension
) {
  return `crm-${prefix}_${formatExportDate()}_${period}.${extension}`;
}

function escapeCsvCell(value) {
  const text =
    value === null || value === undefined
      ? ""
      : String(value);

  if (
    /[",\n\r;]/.test(text)
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function rowsToCsv(
  headers,
  rows
) {
  const lines = [
    headers.map(escapeCsvCell).join(";"),
    ...rows.map((row) =>
      row.map(escapeCsvCell).join(";")
    ),
  ];

  return `\uFEFF${lines.join("\r\n")}`;
}

export function downloadTextFile(
  content,
  filename,
  mimeType
) {
  const blob = new Blob(
    [content],
    { type: mimeType }
  );

  downloadBlob(blob, filename);
}

export function downloadBlob(
  blob,
  filename
) {
  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();

  requestAnimationFrame(() => {
    document.body.removeChild(link);
    setTimeout(
      () => URL.revokeObjectURL(url),
      1500
    );
  });
}

async function loadXlsx() {
  const module = await import("xlsx");

  return module.default || module;
}

export async function downloadXlsxWorkbook(
  sheets,
  filename
) {
  const XLSX = await loadXlsx();
  const workbook =
    XLSX.utils.book_new();

  sheets.forEach(({ name, headers, rows }) => {
    const data = [
      headers,
      ...rows,
    ];

    const worksheet =
      XLSX.utils.aoa_to_sheet(data);

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      name.slice(0, 31)
    );
  });

  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const blob = new Blob(
    [buffer],
    {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
  );

  downloadBlob(blob, filename);
}

async function loadBaseData() {
  const [payments, clients, pendingSales] =
    await Promise.all([
      getAllPayments(),
      getAllClients(),
      getAllPendingSales(),
    ]);

  return {
    payments,
    clients,
    pendingSales,
    clientsById: indexClientsById(clients),
  };
}

function filterPaymentsByPeriod(
  payments,
  period,
  customRange
) {
  const range = getDateRange(
    period,
    customRange
  );

  return {
    range,
    items: filterItemsByRange(
      payments,
      range,
      parsePaymentDate
    ),
  };
}

export async function exportSalesCsv({
  period = ANALYTICS_PERIODS.MONTH,
  customRange = {},
}) {
  const { payments, clientsById } =
    await loadBaseData();

  const { range, items } =
    filterPaymentsByPeriod(
      payments,
      period,
      customRange
    );

  const { headers, rows } =
    buildSyncExportTable(
      items,
      clientsById
    );

  const csv = rowsToCsv(headers, rows);

  downloadTextFile(
    csv,
    buildFilename(
      "sales",
      period,
      "csv"
    ),
    "text/csv;charset=utf-8"
  );

  return {
    count: rows.length,
    range: range.label,
  };
}

export async function exportSalesXlsx({
  period = ANALYTICS_PERIODS.MONTH,
  customRange = {},
}) {
  const { payments, clientsById } =
    await loadBaseData();

  const { range, items } =
    filterPaymentsByPeriod(
      payments,
      period,
      customRange
    );

  const { headers, rows } =
    buildSyncExportTable(
      items,
      clientsById
    );

  await downloadXlsxWorkbook(
    [
      {
        name: "Sync",
        headers,
        rows,
      },
    ],
    buildFilename(
      "sales",
      period,
      "xlsx"
    )
  );

  return {
    count: rows.length,
    range: range.label,
  };
}

export async function exportSubscriptions({
  format = "csv",
}) {
  const { clients } = await loadBaseData();

  const headers = [
    "Клиент",
    "Менеджер",
    "Курс",
    "Бюджет",
    "Оплачено",
    "Остаток",
    "След. оплата",
    "Статус",
  ];

  const rows = clients
    .filter((client) => hasDebt(client))
    .map((client) => [
      client.name || "",
      client.manager ||
        getManagerNameById(client.managerId) ||
        "",
      client.course || "",
      Number(client.budget || 0),
      Number(client.amount || 0),
      getRemain(client),
      client.nextPaymentDate || "",
      isOverdue(client)
        ? "Просрочка"
        : "Активна",
    ]);

  if (format === "xlsx") {
    await downloadXlsxWorkbook(
      [
        {
          name: "Subscriptions",
          headers,
          rows,
        },
      ],
      buildFilename(
        "subscriptions",
        "all",
        "xlsx"
      )
    );
  } else {
    downloadTextFile(
      rowsToCsv(headers, rows),
      buildFilename(
        "subscriptions",
        "all",
        "csv"
      ),
      "text/csv;charset=utf-8"
    );
  }

  return { count: rows.length };
}

export async function exportPendingSales({
  format = "csv",
}) {
  const { pendingSales } =
    await loadBaseData();

  const headers = [
    "Создано",
    "Статус",
    "Владелец",
    "Внёс",
    "Ссылка на диалог",
    "Сумма",
    "Дата оплаты",
    "Комментарий",
    "Подтверждено",
  ];

  const rows = pendingSales.map((sale) => [
    sale.createdAt
      ? new Date(sale.createdAt)
          .toISOString()
          .split("T")[0]
      : "",
    sale.status || "",
    getManagerNameById(sale.ownerManagerId) ||
      sale.ownerManagerId ||
      "",
    getManagerNameById(sale.createdByManagerId) ||
      sale.createdByManagerId ||
      "",
    sale.dialogLink || "",
    Number(sale.amount || 0),
    sale.paymentDate || "",
    sale.comment || "",
    sale.confirmedAt
      ? new Date(sale.confirmedAt)
          .toISOString()
          .split("T")[0]
      : "",
  ]);

  if (format === "xlsx") {
    await downloadXlsxWorkbook(
      [
        {
          name: "PendingSales",
          headers,
          rows,
        },
      ],
      buildFilename(
        "pending-sales",
        "all",
        "xlsx"
      )
    );
  } else {
    downloadTextFile(
      rowsToCsv(headers, rows),
      buildFilename(
        "pending-sales",
        "all",
        "csv"
      ),
      "text/csv;charset=utf-8"
    );
  }

  return { count: rows.length };
}

export async function exportMmAnalytics({
  period = ANALYTICS_PERIODS.MONTH,
  customRange = {},
  format = "xlsx",
}) {
  const report = await getAdminAnalytics({
    period,
    customRange,
  });

  const summaryHeaders = [
    "Период",
    "Выручка",
    "Сделки",
    "Средний чек",
    "Подписки",
    "Просрочки",
    "Сумма просрочки",
    "Новые сделки",
    "Доплаты",
    "Upsell",
  ];

  const summaryRows = [
    [
      report.range.label,
      report.summary.totalRevenue,
      report.summary.totalDeals,
      report.summary.averageCheck,
      report.summary.subscriptions,
      report.summary.overdueCount,
      report.summary.overdueAmount,
      report.summary.newDeals,
      report.summary.topups,
      report.summary.upsells,
    ],
  ];

  const managerHeaders = [
    "Менеджер",
    "Выручка",
    "Сделки",
    "Средний чек",
  ];

  const managerRows = (
    report.managerStats || []
  ).map((item) => [
    item.name || item.managerKey,
    item.revenue,
    item.deals,
    item.deals
      ? Math.round(item.revenue / item.deals)
      : 0,
  ]);

  const rankingHeaders = [
    "Место",
    "Менеджер",
    "KPI выручка",
    "Сделки",
  ];

  const rankingRows = (
    report.managerRanking || []
  ).map((item, index) => [
    index + 1,
    item.name,
    item.revenue,
    item.deals,
  ]);

  const subscriptionHeaders = [
    "Клиент",
    "Менеджер",
    "Курс",
    "Остаток",
    "След. оплата",
    "Статус",
  ];

  const subscriptionRows = (
    report.subscriptionStats?.subscriptions ||
    []
  ).map((client) => [
    client.name || "",
    client.manager ||
      getManagerNameById(client.managerId) ||
      "",
    client.course || "",
    getRemain(client),
    client.nextPaymentDate || "",
    getClientStatus(client),
  ]);

  const overdueHeaders = [
    "Клиент",
    "Менеджер",
    "Курс",
    "Долг",
    "След. оплата",
  ];

  const overdueRows = (
    report.subscriptionStats?.overdue || []
  ).map((client) => [
    client.name || "",
    client.manager ||
      getManagerNameById(client.managerId) ||
      "",
    client.course || "",
    getRemain(client),
    client.nextPaymentDate || "",
  ]);

  if (format === "csv") {
    const sections = [
      ["MM Analytics Summary"],
      summaryHeaders,
      ...summaryRows,
      [],
      ["Managers KPI"],
      managerHeaders,
      ...managerRows,
      [],
      ["Overdue"],
      overdueHeaders,
      ...overdueRows,
    ];

    const lines = sections.map((row) =>
      row.map(escapeCsvCell).join(";")
    );

    downloadTextFile(
      `\uFEFF${lines.join("\r\n")}`,
      buildFilename(
        "mm-analytics",
        period,
        "csv"
      ),
      "text/csv;charset=utf-8"
    );
  } else {
    await downloadXlsxWorkbook(
      [
        {
          name: "Summary",
          headers: summaryHeaders,
          rows: summaryRows,
        },
        {
          name: "Managers",
          headers: managerHeaders,
          rows: managerRows,
        },
        {
          name: "Ranking",
          headers: rankingHeaders,
          rows: rankingRows,
        },
        {
          name: "Subscriptions",
          headers: subscriptionHeaders,
          rows: subscriptionRows,
        },
        {
          name: "Overdue",
          headers: overdueHeaders,
          rows: overdueRows,
        },
      ],
      buildFilename(
        "mm-analytics",
        period,
        "xlsx"
      )
    );
  }

  return {
    range: report.range.label,
    managers: managerRows.length,
  };
}

export { ANALYTICS_PERIODS };
