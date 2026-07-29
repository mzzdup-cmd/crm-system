import {
  useEffect,
  useState,
} from "react";

import {
  subscribeTtImportMeta,
} from "../../services/ttSalesService";

const IMPORT_SLOTS_MSK = [
  "13:00",
  "17:00",
  "19:00",
  "22:00",
  "03:00",
];

function formatImportedAt(value) {
  if (!value) {
    return "ещё не было";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TtImportPanel() {
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    return subscribeTtImportMeta(setMeta);
  }, []);

  const rowsUpserted = Number(
    meta?.totalRows || 0
  );
  const managersTotal = Number(
    meta?.managerCount || 0
  );
  const managersFailed = Array.isArray(
    meta?.errors
  )
    ? meta.errors.length
    : 0;
  const managersOk = Math.max(
    0,
    managersTotal - managersFailed
  );

  return (
    <div className="bg-surface p-5 md:p-6 rounded-2xl border border-neutral-800">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold">
            Импорт из ТТ
          </h2>

          <p className="text-neutral-400 text-sm mt-2 max-w-2xl">
            KPI и аналитика берутся из таблиц
            менеджеров только за текущий месяц
            (МСК). CRM читает ТТ по расписанию —
            оплаты в CRM больше не выгружаются.
          </p>
        </div>

        <div className="text-sm text-neutral-300 bg-surface-raised px-4 py-2 rounded-xl border border-neutral-700">
          <div>
            Месяц:{" "}
            {meta?.monthStart ||
              "текущий (МСК)"}
          </div>
          <div className="mt-1">
            Последний импорт:{" "}
            {meta?.lastImportAtMsk ||
              formatImportedAt(
                meta?.lastImportAt
              )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {IMPORT_SLOTS_MSK.map((slot) => (
          <div
            key={slot}
            className="bg-surface-raised/80 p-4 rounded-xl border border-neutral-700/60"
          >
            <div className="text-neutral-500 text-xs uppercase tracking-wide">
              Автоимпорт
            </div>
            <div className="text-xl font-bold mt-1">
              {slot} МСК
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div className="bg-surface-raised/60 p-4 rounded-xl">
          <div className="text-neutral-500">
            Строк обновлено
          </div>
          <div className="text-2xl font-bold mt-1">
            {rowsUpserted}
          </div>
        </div>

        <div className="bg-surface-raised/60 p-4 rounded-xl">
          <div className="text-neutral-500">
            Менеджеров ОК
          </div>
          <div className="text-2xl font-bold mt-1 text-green-400">
            {managersOk}
          </div>
        </div>

        <div className="bg-surface-raised/60 p-4 rounded-xl">
          <div className="text-neutral-500">
            Ошибок
          </div>
          <div
            className={`text-2xl font-bold mt-1 ${
              managersFailed
                ? "text-amber-400"
                : "text-neutral-300"
            }`}
          >
            {managersFailed}
          </div>
        </div>
      </div>

      <p className="text-neutral-500 text-xs mt-4">
        Ручной запуск: GitHub → Actions →
        «TT → CRM Import» → Run workflow.
      </p>
    </div>
  );
}
