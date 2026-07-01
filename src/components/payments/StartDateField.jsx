import {
  generateStreamOptions,
  getDefaultStream,
  resolveStreamOptionWeeks,
} from "../../domain/client/clientDates";

import {
  isBbDealType,
  resolveDealTypeId,
} from "../../constants/dealTypes";

function formatDisplayDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("ru-RU");
}

const inputClass =
  "mt-1 w-full bg-slate-800 p-3.5 rounded-xl";

export default function StartDateField({
  dealTypeId,
  paymentDate,
  selectedStream,
  onSelectedStreamChange,
  manualStartDate,
  onManualStartDateChange,
  isLegacyClientMode = false,
}) {
  const isBb = isBbDealType(dealTypeId);
  const resolvedDealTypeId =
    resolveDealTypeId(dealTypeId);
  const isReturnAfterRefusal =
    resolvedDealTypeId === "topup_po";
  const useHistoricalStreams =
    isLegacyClientMode ||
    isReturnAfterRefusal;

  if (isBb) {
    return (
      <label className="block">
        <span className="text-sm text-slate-400">
          Дата старта *
        </span>
        <input
          type="date"
          required
          value={manualStartDate}
          onChange={(e) =>
            onManualStartDateChange(
              e.target.value
            )
          }
          className={inputClass}
        />
        <p className="text-xs text-slate-500 mt-1">
          Для ББ старт может быть любой датой,
          не только понедельником потока
        </p>
      </label>
    );
  }

  if (!paymentDate) {
    return (
      <p className="text-sm text-slate-500">
        Сначала укажите дату оплаты — поток
        подберётся автоматически
      </p>
    );
  }

  const { weeksBefore, weeksAfter } =
    resolveStreamOptionWeeks({
      dealTypeId: resolvedDealTypeId,
      isLegacyClientMode,
    });

  const streamOptions =
    generateStreamOptions(
      paymentDate,
      weeksBefore,
      weeksAfter
    );

  const suggestedStream =
    getDefaultStream(paymentDate);

  const activeStream =
    selectedStream || suggestedStream;

  return (
    <label className="block">
      <span className="text-sm text-slate-400">
        Поток *
      </span>

      <select
        required
        value={activeStream}
        onChange={(e) =>
          onSelectedStreamChange(
            e.target.value
          )
        }
        className={inputClass}
      >
        {streamOptions.map((streamDate) => (
          <option
            key={streamDate}
            value={streamDate}
          >
            {formatDisplayDate(streamDate)}
            {!useHistoricalStreams &&
              streamDate ===
                suggestedStream &&
              " · рекомендуемый"}
          </option>
        ))}
      </select>

      {activeStream && (
        <p className="text-sm text-cyan-400/90 mt-2">
          Клиент относится к потоку с{" "}
          {formatDisplayDate(activeStream)}
        </p>
      )}

      {useHistoricalStreams ? (
        <p className="text-xs text-amber-200/80 mt-1">
          {isReturnAfterRefusal
            ? "Вернулся после отказа: выберите исходный поток из Google ТТ (колонка «Когда старт»), например 06.04 — не рекомендуемый от даты оплаты."
            : "Для старого клиента из таблицы — поток из Google ТТ (колонка «Когда старт»), не от текущей даты оплаты."}
        </p>
      ) : (
        <p className="text-xs text-slate-500 mt-1">
          startDate = понедельник потока.
          Дата оплаты ({formatDisplayDate(
            paymentDate
          )}) и поток — разные поля
        </p>
      )}
    </label>
  );
}
