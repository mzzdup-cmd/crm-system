import {
  useState,
} from "react";

import {
  triggerTtSheetsSyncNow,
} from "../../services/ttSyncService";

const SYNC_SLOTS = [
  "00:00",
  "10:00",
  "16:00",
];

export default function TtSyncPanel({
  pendingCount = 0,
}) {
  const [loading, setLoading] =
    useState(false);

  const [result, setResult] =
    useState(null);

  const [error, setError] =
    useState(null);

  async function handleSyncNow() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data =
        await triggerTtSheetsSyncNow();

      setResult(data);
    } catch (syncError) {
      setError(
        syncError.message ||
          "Не удалось запустить выгрузку"
      );
    }

    setLoading(false);
  }

  return (
    <div className="bg-surface p-5 md:p-6 rounded-2xl border border-neutral-800">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold">
            Выгрузка в ТТ
          </h2>

          <p className="text-neutral-400 text-sm mt-2 max-w-2xl">
            Новые оплаты из CRM автоматически добавляются
            в ТТ-таблицу каждого менеджера в{" "}
            {SYNC_SLOTS.join(", ")} МСК (3 раза в день).
            Уже выгруженные оплаты не дублируются.
          </p>
        </div>

        {pendingCount > 0 && (
          <div className="text-sm text-amber-300 bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/30">
            Ожидает выгрузки: {pendingCount}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {SYNC_SLOTS.map((slot) => (
          <div
            key={slot}
            className="bg-surface-raised/80 p-4 rounded-xl border border-neutral-700/60"
          >
            <div className="text-neutral-500 text-xs uppercase tracking-wide">
              Автовыгрузка
            </div>
            <div className="text-xl font-bold mt-1">
              {slot} МСК
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-400 bg-red-500/10 px-4 py-3 rounded-xl border border-red-500/30">
          {error}
          <p className="mt-2 text-neutral-400">
            Если Cloud Functions не задеплоены —
            запустите вручную: GitHub → Actions →
            «CRM → TT Sheets Sync» → Run workflow.
          </p>
        </div>
      )}

      {result && (
        <div className="mb-4 text-sm text-green-400 bg-green-500/10 px-4 py-3 rounded-xl border border-green-500/30">
          Выгружено: {result.success || 0},
          пропущено: {result.skipped || 0},
          ошибок: {result.failed || 0}
        </div>
      )}

      <button
        type="button"
        onClick={handleSyncNow}
        disabled={loading}
        className="
          w-full sm:w-auto px-6 py-3 rounded-xl
          bg-brand hover:opacity-90
          text-white font-semibold
          disabled:opacity-50 transition-colors
        "
      >
        {loading
          ? "Выгрузка..."
          : "Выгрузить в ТТ сейчас (ручная)"}
      </button>

      <p className="text-neutral-500 text-xs mt-3">
        Экстренная выгрузка добавляет только оплаты
        с syncedToSheets = false. Повторно уже
        выгруженные строки не создаются.
      </p>
    </div>
  );
}
