import {
  getDefaultStream,
  getStartDate,
} from "../../domain/client/clientDates";

import {
  isBbDealType,
  isOptionalStartDateDealType,
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
  "mt-1 w-full bg-surface-raised p-3.5 rounded-xl";

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
  const isOptionalStartDate =
    isOptionalStartDateDealType(
      dealTypeId
    );
  const isReturnAfterRefusal =
    resolvedDealTypeId === "topup_po";
  const useHistoricalStreams =
    isLegacyClientMode ||
    isReturnAfterRefusal;

  if (isBb) {
    return (
      <label className="block">
        <span className="text-sm text-neutral-400">
          Дата старта
          {!isOptionalStartDate && " *"}
        </span>
        <input
          type="date"
          required={!isOptionalStartDate}
          value={manualStartDate}
          onChange={(e) =>
            onManualStartDateChange(
              e.target.value
            )
          }
          className={inputClass}
        />
        <p className="text-xs text-neutral-500 mt-1">
          {isOptionalStartDate
            ? "Можно заполнить позже"
            : "Для ББ старт может быть любой датой, не только понедельником потока"}
        </p>
      </label>
    );
  }

  if (!paymentDate) {
    return (
      <p className="text-sm text-neutral-500">
        Сначала укажите дату оплаты — поток
        подберётся автоматически
      </p>
    );
  }

  const suggestedStream =
    getDefaultStream(paymentDate);

  const activeStream =
    selectedStream ||
    (isOptionalStartDate
      ? ""
      : suggestedStream);

  function handleStreamDateChange(
    value
  ) {
    if (!value) {
      onSelectedStreamChange("");
      return;
    }

    onSelectedStreamChange(
      getStartDate(value)
    );
  }

  return (
    <label className="block">
      <span className="text-sm text-neutral-400">
        Поток
        {!isOptionalStartDate && " *"}
      </span>

      <input
        type="date"
        required={!isOptionalStartDate}
        value={activeStream}
        onChange={(e) =>
          handleStreamDateChange(
            e.target.value
          )
        }
        className={inputClass}
      />

      {activeStream && (
        <p className="text-sm text-brand/90 mt-2">
          Клиент относится к потоку с{" "}
          {formatDisplayDate(activeStream)}
          {!useHistoricalStreams &&
            activeStream ===
              suggestedStream &&
            " · рекомендуемый"}
        </p>
      )}

      {isOptionalStartDate &&
        !activeStream && (
          <p className="text-xs text-neutral-500 mt-1">
            Можно оставить пустым и указать
            позже
          </p>
        )}

      {useHistoricalStreams ? (
        <p className="text-xs text-amber-200/80 mt-1">
          {isReturnAfterRefusal
            ? "Вернулся после отказа: в календаре выберите исходный поток из Google ТТ (колонка «Когда старт»), например 06.04."
            : "Для клиента из таблицы откройте календарь и выберите поток из Google ТТ (колонка «Когда старт»), например май — не от текущей даты оплаты."}
        </p>
      ) : !isOptionalStartDate && (
        <p className="text-xs text-neutral-500 mt-1">
          {activeStream &&
          suggestedStream &&
          activeStream !== suggestedStream
            ? "Поток подтянут из карточки клиента. "
            : "Любая дата в календаре — сохранится понедельник этой недели. "}
          Дата оплаты (
          {formatDisplayDate(paymentDate)}) и
          поток — разные поля.
        </p>
      )}
    </label>
  );
}
