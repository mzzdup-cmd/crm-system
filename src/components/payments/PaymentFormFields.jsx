import {
  getStartDate,
} from "../../domain/client/clientDates";

import {
  PAYMENT_SYSTEMS,
  requiresInvoice,
} from "../../constants/paymentSystems";

import { MANAGERS } from "../../constants/managers";

const inputClass =
  "w-full bg-surface-raised p-3.5 rounded-xl";

export default function PaymentFormFields({
  paymentDate,
  onPaymentDateChange,
  paymentAmount,
  onPaymentAmountChange,
  paymentSystem,
  onPaymentSystemChange,
  invoiceNumber,
  onInvoiceNumberChange,
  manager,
  onManagerChange,
  comment,
  onCommentChange,
  managerDisabled = false,
  amountPlaceholder = "Сумма оплаты",
  submitLabel = "Добавить оплату",
  submitting = false,
  onSubmit,
}) {
  return (
    <div className="space-y-4">
      <input
        type="date"
        value={paymentDate}
        onChange={(e) =>
          onPaymentDateChange(
            e.target.value
          )
        }
        className={inputClass}
      />

      <input
        placeholder={amountPlaceholder}
        value={paymentAmount}
        onChange={(e) =>
          onPaymentAmountChange(
            e.target.value
          )
        }
        className={inputClass}
      />

      <select
        value={paymentSystem}
        onChange={(e) =>
          onPaymentSystemChange(
            e.target.value
          )
        }
        className={inputClass}
      >
        <option value="">
          Платежная система
        </option>

        {PAYMENT_SYSTEMS.map((system) => (
          <option
            key={system}
            value={system}
          >
            {system}
          </option>
        ))}
      </select>

      {requiresInvoice(paymentSystem) && (
        <input
          placeholder="Номер счета"
          value={invoiceNumber}
          onChange={(e) =>
            onInvoiceNumberChange(
              e.target.value
            )
          }
          className={inputClass}
        />
      )}

      {paymentDate && (
        <div className="bg-surface-raised/60 p-4 rounded-xl">
          <div className="text-neutral-400 mb-2 text-sm">
            Дата старта
          </div>
          <div className="text-lg font-bold text-brand">
            {getStartDate(paymentDate)}
          </div>
        </div>
      )}

      <select
        value={manager}
        onChange={(e) =>
          onManagerChange(e.target.value)
        }
        disabled={managerDisabled}
        className={`${inputClass} disabled:opacity-60`}
      >
        <option value="">
          Менеджер (владелец KPI)
        </option>

        {MANAGERS.map((item) => (
          <option
            key={item.id}
            value={item.name}
          >
            {item.name}
          </option>
        ))}
      </select>

      <textarea
        placeholder="Комментарий"
        value={comment}
        onChange={(e) =>
          onCommentChange(e.target.value)
        }
        className={`${inputClass} min-h-[80px]`}
      />

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="
          w-full crm-btn-primary hover:bg-green-600
          p-4 rounded-xl font-bold
          disabled:opacity-50
        "
      >
        {submitting
          ? "Сохранение..."
          : submitLabel}
      </button>
    </div>
  );
}
