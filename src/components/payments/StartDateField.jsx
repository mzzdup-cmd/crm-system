import {
  generateStreamOptions,
  getDefaultStream,
} from "../../domain/client/clientDates";

import { isBbDealType }
from "../../constants/dealTypes";

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
}) {
  const isBb = isBbDealType(dealTypeId);

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

  const streamOptions =
    generateStreamOptions(paymentDate);

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
            {streamDate ===
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

      <p className="text-xs text-slate-500 mt-1">
        startDate = понедельник потока.
        Дата оплаты ({formatDisplayDate(
          paymentDate
        )}) и поток — разные поля
      </p>
    </label>
  );
}
