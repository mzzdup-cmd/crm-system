import {
  useEffect,
  useState,
} from "react";

import {
  getClientById,
} from "../../services/clientService";

import {
  canEditPayment,
  canEditPaymentStartDate,
} from "../../domain/payment/paymentPermissions";

import {
  PAYMENT_SYSTEMS,
} from "../../constants/paymentSystems";

import { COURSES } from "../../constants/courses";
import { TARIFFS } from "../../constants/tariffs";

import {
  isOptionalStartDateDealType,
} from "../../constants/dealTypes";

import {
  formatMoney,
  parseMoneyNumber,
} from "../../utils/moneyFormat";

import MoneyInput
from "../ui/MoneyInput";

import ConfirmModal
from "../ui/ConfirmModal";

const inputClass =
  "mt-1 w-full bg-slate-800 p-3.5 rounded-xl";

export default function PaymentEditModal({
  open,
  payment,
  userData,
  isAdmin = false,
  saving = false,
  onSave,
  onClose,
}) {
  const [form, setForm] = useState({});
  const [confirmOpen, setConfirmOpen] =
    useState(false);

  useEffect(() => {
    if (!payment) {
      return;
    }

    setForm({
      amount: String(
        payment.amount ?? ""
      ),
      dealType:
        payment.dealType ?? "",
      paymentSystem:
        payment.paymentSystem ?? "",
      invoiceNumber:
        payment.invoiceNumber ?? "",
      comment: payment.comment ?? "",
      paymentDate:
        payment.paymentDate ?? "",
      startDate:
        payment.startDate ?? "",
      course: payment.course ?? "",
      tariff: payment.tariff ?? "",
      budget: "",
      vkLink: "",
    });

    if (payment.clientId) {
      getClientById(
        payment.clientId
      ).then((clientData) => {
        if (!clientData) {
          return;
        }

        setForm((current) => ({
          ...current,
          course:
            current.course ||
            clientData.course ||
            "",
          tariff:
            current.tariff ||
            clientData.tariff ||
            "",
          budget: String(
            clientData.budget ?? ""
          ),
          vkLink:
            clientData.vkLink ?? "",
        }));
      });
    }
  }, [payment]);

  if (!open || !payment) {
    return null;
  }

  const editable =
    canEditPayment(payment, userData);

  const canEditStartDate =
    canEditPaymentStartDate(
      payment,
      userData
    );

  const optionalStartDate =
    isOptionalStartDateDealType(
      payment.dealType
    );

  const formDisabled =
    !editable && !canEditStartDate;

  function handleChange(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function buildPayload() {
    return {
      paymentUpdates: {
        amount: parseMoneyNumber(
          form.amount
        ),
        dealType: form.dealType,
        paymentSystem:
          form.paymentSystem,
        invoiceNumber:
          form.invoiceNumber,
        comment: form.comment,
        paymentDate:
          form.paymentDate,
        startDate: form.startDate,
        course: form.course,
        tariff: form.tariff,
      },
      clientUpdates: {
        budget: parseMoneyNumber(
          form.budget
        ),
        course: form.course,
        tariff: form.tariff,
        vkLink: form.vkLink.trim(),
      },
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!editable && !canEditStartDate) {
      return;
    }

    if (canEditStartDate && !editable) {
      await onSave({
        paymentUpdates: {
          startDate: form.startDate,
        },
        clientUpdates: {},
      });
      return;
    }

    setConfirmOpen(true);
  }

  async function handleConfirmSave() {
    const payload = buildPayload();

    if (!editable && canEditStartDate) {
      await onSave({
        paymentUpdates: {
          startDate: form.startDate,
        },
        clientUpdates: {},
      });
      setConfirmOpen(false);
      return;
    }

    await onSave(payload);
    setConfirmOpen(false);
  }

  return (
    <>
      <div
        className="
          fixed inset-0 z-50
          flex items-center justify-center
          bg-black/60 p-4
        "
        role="dialog"
        aria-modal="true"
      >
        <form
          onSubmit={handleSubmit}
          className="
            bg-slate-900 border border-slate-700
            rounded-2xl p-6 max-w-lg w-full
            shadow-xl max-h-[90vh] overflow-y-auto
          "
        >
          <h2 className="text-xl font-bold mb-1">
            Редактировать оплату
          </h2>

          <p className="text-slate-400 text-sm mb-6">
            {payment.clientName}
            {!isAdmin && editable && (
              <span className="block mt-1 text-amber-400">
                Доступно 30 минут после
                создания
              </span>
            )}
            {!isAdmin &&
              canEditStartDate &&
              !editable && (
                <span className="block mt-1 text-cyan-400">
                  Можно изменить только дату
                  старта — строка в ТТ
                  обновится при следующей
                  выгрузке
                </span>
              )}
          </p>

          <div className="space-y-4">
            <label className="block">
              <span className="text-sm text-slate-400">
                Сумма оплаты
              </span>
              <MoneyInput
                required
                disabled={!editable}
                value={form.amount}
                onChange={(value) =>
                  handleChange(
                    "amount",
                    value
                  )
                }
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-400">
                Бюджет клиента
              </span>
              <MoneyInput
                value={form.budget}
                onChange={(value) =>
                  handleChange(
                    "budget",
                    value
                  )
                }
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-400">
                Курс
              </span>
              <select
                value={form.course}
                onChange={(e) =>
                  handleChange(
                    "course",
                    e.target.value
                  )
                }
                className={inputClass}
              >
                <option value="">
                  Не выбран
                </option>
                {COURSES.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm text-slate-400">
                Тариф
              </span>
              <select
                value={form.tariff}
                onChange={(e) =>
                  handleChange(
                    "tariff",
                    e.target.value
                  )
                }
                className={inputClass}
              >
                <option value="">
                  Не выбран
                </option>
                {TARIFFS.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm text-slate-400">
                VK ссылка
              </span>
              <input
                value={form.vkLink}
                onChange={(e) =>
                  handleChange(
                    "vkLink",
                    e.target.value
                  )
                }
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-400">
                Дата оплаты
              </span>
              <input
                type="date"
                required
                value={form.paymentDate}
                onChange={(e) =>
                  handleChange(
                    "paymentDate",
                    e.target.value
                  )
                }
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-400">
                Поток / startDate
              </span>
              <input
                type="date"
                required={
                  !optionalStartDate
                }
                disabled={
                  !editable &&
                  !canEditStartDate
                }
                value={form.startDate}
                onChange={(e) =>
                  handleChange(
                    "startDate",
                    e.target.value
                  )
                }
                className={`${inputClass} disabled:opacity-60`}
              />
              {optionalStartDate && (
                <p className="text-xs text-slate-500 mt-1">
                  Для ББ и Рассылки можно
                  указать позже
                </p>
              )}
            </label>

            <label className="block">
              <span className="text-sm text-slate-400">
                Тип сделки
              </span>
              <input
                required
                value={form.dealType}
                onChange={(e) =>
                  handleChange(
                    "dealType",
                    e.target.value
                  )
                }
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-400">
                Платежная система
              </span>
              <select
                value={form.paymentSystem}
                onChange={(e) =>
                  handleChange(
                    "paymentSystem",
                    e.target.value
                  )
                }
                className={inputClass}
              >
                <option value="">
                  Не выбрана
                </option>
                {PAYMENT_SYSTEMS.map(
                  (system) => (
                    <option
                      key={system}
                      value={system}
                    >
                      {system}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="block">
              <span className="text-sm text-slate-400">
                Номер счёта
              </span>
              <input
                value={form.invoiceNumber}
                onChange={(e) =>
                  handleChange(
                    "invoiceNumber",
                    e.target.value
                  )
                }
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-400">
                Комментарий
              </span>
              <textarea
                value={form.comment}
                onChange={(e) =>
                  handleChange(
                    "comment",
                    e.target.value
                  )
                }
                rows={3}
                className={inputClass}
              />
            </label>
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="
                px-4 py-2 rounded-xl
                bg-slate-800 hover:bg-slate-700
              "
            >
              Отмена
            </button>

            <button
              type="submit"
              disabled={
                saving || formDisabled
              }
              className="
                px-4 py-2 rounded-xl font-semibold
                bg-cyan-600 hover:bg-cyan-700
                disabled:opacity-50
              "
            >
              {saving
                ? "Сохранение..."
                : "Сохранить"}
            </button>
          </div>
        </form>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Проверьте сумму оплаты"
        message={`Сохранить изменения: ${formatMoney(
          parseMoneyNumber(
            form.amount
          )
        )}?`}
        confirmLabel="Подтвердить"
        variant="default"
        loading={saving}
        onConfirm={handleConfirmSave}
        onCancel={() =>
          setConfirmOpen(false)
        }
      />
    </>
  );
}
