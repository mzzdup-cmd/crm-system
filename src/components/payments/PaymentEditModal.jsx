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
  canEditCuratorStartDate,
  canEditDeferredPaymentProfile,
  canEditPaymentCoreFields,
} from "../../domain/payment/paymentPermissions";

import {
  PAYMENT_SYSTEMS,
} from "../../constants/paymentSystems";

import { COURSES } from "../../constants/courses";
import { TARIFFS } from "../../constants/tariffs";

import {
  canChangePaymentStreamDealType,
  needsBudgetFieldForExistingDeal,
  PAYMENT_STREAM_CHANGE_DEAL_TYPES_LABEL,
} from "../../constants/dealTypes";

import {
  formatMoney,
  parseMoneyNumber,
} from "../../utils/moneyFormat";

import MoneyInput
from "../ui/MoneyInput";

import ConfirmModal
from "../ui/ConfirmModal";

import { VkLinkInput }
from "../vk/VkLinkInput";

import CuratorStartDateField
from "./CuratorStartDateField";

import TrafficSourceSelect
from "../traffic/TrafficSourceSelect";

import { useTrafficSources }
from "../../hooks/useTrafficSources";

const inputClass =
  "mt-1 w-full bg-surface-raised p-3.5 rounded-xl";

function buildFormFromPayment(payment) {
  return {
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
    curatorStartDate:
      payment.curatorStartDate ?? "",
    course: payment.course ?? "",
    tariff: payment.tariff ?? "",
    budget: "",
    vkLink: payment.vkLink ?? "",
    sourceId: payment.sourceId ?? "",
    sourceName:
      payment.sourceName ??
      payment.source ??
      "",
  };
}

export default function PaymentEditModal({
  open,
  payment,
  userData,
  isAdmin = false,
  saving = false,
  onSave,
  onClose,
}) {
  const [form, setForm] = useState(null);
  const [formPaymentId, setFormPaymentId] =
    useState(null);
  const [confirmOpen, setConfirmOpen] =
    useState(false);

  const {
    sources: trafficSources,
    loading: trafficSourcesLoading,
    hasFirestoreSources,
  } = useTrafficSources();

  useEffect(() => {
    if (!payment) {
      setForm(null);
      setFormPaymentId(null);
      return;
    }

    setForm(buildFormFromPayment(payment));
    setFormPaymentId(payment.id);

    if (payment.clientId) {
      getClientById(
        payment.clientId
      ).then((clientData) => {
        if (!clientData) {
          return;
        }

        setForm((current) => {
          if (!current) {
            return current;
          }

          return {
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
              clientData.vkLink ??
              current.vkLink ??
              "",
            sourceId:
              current.sourceId ||
              clientData.sourceId ||
              "",
            sourceName:
              current.sourceName ||
              clientData.sourceName ||
              clientData.source ||
              "",
          };
        });
      });
    }
  }, [payment]);

  if (
    !open ||
    !payment ||
    !form ||
    formPaymentId !== payment.id
  ) {
    return null;
  }

  const editable =
    canEditPayment(payment, userData);

  const coreEditable =
    canEditPaymentCoreFields(
      payment,
      userData
    );

  const profileEditable =
    editable ||
    canEditDeferredPaymentProfile(
      payment,
      userData
    );

  const fieldEditable =
    editable || coreEditable;

  const canEditStartDate =
    fieldEditable ||
    canEditPaymentStartDate(
      payment,
      userData
    );

  const canEditCuratorDate =
    canEditCuratorStartDate(
      payment,
      userData
    );

  const canSave =
    editable ||
    coreEditable ||
    profileEditable ||
    canEditStartDate ||
    canEditCuratorDate;

  const storesBudgetOnPayment =
    needsBudgetFieldForExistingDeal(
      payment.dealType
    ) ||
    needsBudgetFieldForExistingDeal(
      payment.dealTypeId
    );

  const canChangeStream =
    canChangePaymentStreamDealType(
      payment.dealType
    ) ||
    canChangePaymentStreamDealType(
      payment.dealTypeId
    );

  const optionalStartDate =
    canChangeStream;

  function handleChange(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function buildPayload() {
    const parsedBudget = parseMoneyNumber(
      form.budget
    );

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
        curatorStartDate:
          form.curatorStartDate,
        course: form.course,
        tariff: form.tariff,
        sourceId: form.sourceId || null,
        sourceName:
          form.sourceName?.trim() || "",
        ...(storesBudgetOnPayment
          ? { budget: parsedBudget }
          : {}),
      },
      clientUpdates: {
        budget: parsedBudget,
        course: form.course,
        tariff: form.tariff,
        vkLink: (form.vkLink ?? "").trim(),
        sourceId: form.sourceId || null,
        sourceName:
          form.sourceName?.trim() || "",
      },
    };
  }

  function buildCoreFieldPayload() {
    const parsedBudget = parseMoneyNumber(
      form.budget
    );

    return {
      paymentUpdates: {
        amount: parseMoneyNumber(
          form.amount
        ),
        paymentDate:
          form.paymentDate,
        startDate: form.startDate,
        invoiceNumber:
          form.invoiceNumber,
        paymentSystem:
          form.paymentSystem,
        tariff: form.tariff,
        ...(storesBudgetOnPayment
          ? { budget: parsedBudget }
          : {}),
      },
      clientUpdates: {
        budget: parsedBudget,
        tariff: form.tariff,
      },
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canSave) {
      return;
    }

    if (!editable && coreEditable) {
      setConfirmOpen(true);
      return;
    }

    const startDateChanged =
      form.startDate !==
      (payment.startDate ?? "");
    const curatorStartDateChanged =
      form.curatorStartDate !==
      (payment.curatorStartDate ?? "");

    if (
      !editable &&
      canEditStartDate &&
      startDateChanged &&
      !curatorStartDateChanged
    ) {
      await onSave({
        paymentUpdates: {
          startDate: form.startDate,
        },
        clientUpdates: {},
      });

      if (
        profileEditable &&
        Object.keys(
          buildPayload().clientUpdates
        ).length
      ) {
        await onSave({
          paymentUpdates: {},
          clientUpdates:
            buildPayload().clientUpdates,
        });
      }

      return;
    }

    if (
      !editable &&
      canEditCuratorDate &&
      curatorStartDateChanged &&
      !startDateChanged
    ) {
      await onSave({
        paymentUpdates: {
          curatorStartDate:
            form.curatorStartDate,
        },
        clientUpdates: {},
      });
      return;
    }

    if (
      !editable &&
      canEditStartDate &&
      canEditCuratorDate &&
      startDateChanged &&
      curatorStartDateChanged
    ) {
      await onSave({
        paymentUpdates: {
          startDate: form.startDate,
          curatorStartDate:
            form.curatorStartDate,
        },
        clientUpdates: {},
      });
      return;
    }

    if (
      !editable &&
      profileEditable &&
      !startDateChanged &&
      !curatorStartDateChanged
    ) {
      await onSave({
        paymentUpdates: {},
        clientUpdates: buildPayload().clientUpdates,
      });
      return;
    }

    if (!editable) {
      return;
    }

    setConfirmOpen(true);
  }

  async function handleConfirmSave() {
    const payload = buildPayload();

    if (!editable && coreEditable) {
      await onSave(
        buildCoreFieldPayload()
      );
      setConfirmOpen(false);
      return;
    }

    if (!editable && canSave) {
      const paymentUpdates = {};

      if (
        canEditStartDate &&
        form.startDate !==
          (payment.startDate ?? "")
      ) {
        paymentUpdates.startDate =
          form.startDate;
      }

      if (
        canEditCuratorDate &&
        form.curatorStartDate !==
          (payment.curatorStartDate ?? "")
      ) {
        paymentUpdates.curatorStartDate =
          form.curatorStartDate;
      }

      if (Object.keys(paymentUpdates).length) {
        await onSave({
          paymentUpdates,
          clientUpdates: {},
        });
      } else if (profileEditable) {
        await onSave({
          paymentUpdates: {},
          clientUpdates: payload.clientUpdates,
        });
      }

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
            bg-surface border border-neutral-700
            rounded-2xl p-6 max-w-lg w-full
            shadow-xl max-h-[90vh] overflow-y-auto
          "
        >
          <h2 className="text-xl font-bold mb-1">
            Редактировать оплату
          </h2>

          <p className="text-neutral-400 text-sm mb-6">
            {payment.clientName}
            {!isAdmin && editable && (
              <span className="block mt-1 text-amber-400">
                Полная правка — 30 минут после
                создания. Сумма, дата, бюджет,
                счёт, платёжка, тариф и старт —
                всегда.
              </span>
            )}
            {!isAdmin &&
              coreEditable &&
              !editable && (
                <span className="block mt-1 text-brand">
                  Можно изменить сумму, дату
                  оплаты, бюджет, старт, счёт,
                  платёжку и тариф
                </span>
              )}
            {!isAdmin &&
              canEditStartDate &&
              !fieldEditable && (
                <span className="block mt-1 text-brand">
                  Можно изменить только дату
                  старта — строка в ТТ
                  обновится при следующей
                  выгрузке
                </span>
              )}
            {!isAdmin &&
              canEditCuratorDate &&
              !editable &&
              !canEditStartDate && (
                <span className="block mt-1 text-brand">
                  Можно изменить только
                  фактический старт для
                  куратора
                </span>
              )}
          </p>

          <div className="space-y-4">
            <label className="block">
              <span className="text-sm text-neutral-400">
                Сумма оплаты
              </span>
              <MoneyInput
                required
                disabled={!fieldEditable}
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
              <span className="text-sm text-neutral-400">
                Бюджет клиента
              </span>
              <MoneyInput
                disabled={!profileEditable && !coreEditable}
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
              <span className="text-sm text-neutral-400">
                Курс
              </span>
              <select
                value={form.course}
                disabled={!profileEditable}
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
              <span className="text-sm text-neutral-400">
                Тариф
              </span>
              <select
                value={form.tariff}
                disabled={
                  !profileEditable &&
                  !coreEditable
                }
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
              <span className="text-sm text-neutral-400">
                Тег (откуда пришёл)
              </span>
              <TrafficSourceSelect
                sources={trafficSources}
                sourceId={form.sourceId}
                sourceName={form.sourceName}
                loading={trafficSourcesLoading}
                hasFirestoreSources={
                  hasFirestoreSources
                }
                disabled={!editable}
                placeholder="Traffic / источник"
                onChange={({
                  sourceId,
                  sourceName,
                }) => {
                  setForm((current) => ({
                    ...current,
                    sourceId:
                      sourceId || "",
                    sourceName:
                      sourceName || "",
                  }));
                }}
              />
            </label>

            <label className="block">
              <span className="text-sm text-neutral-400">
                VK ссылка
              </span>
              <VkLinkInput
                value={form.vkLink}
                disabled={!editable}
                onChange={(value) =>
                  handleChange(
                    "vkLink",
                    value
                  )
                }
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="text-sm text-neutral-400">
                Дата оплаты
              </span>
              <input
                type="date"
                required
                disabled={!fieldEditable}
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
              <span className="text-sm text-neutral-400">
                Поток / startDate
              </span>
              <input
                type="date"
                required={
                  !optionalStartDate
                }
                disabled={
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
                <p className="text-xs text-neutral-500 mt-1">
                  Для {PAYMENT_STREAM_CHANGE_DEAL_TYPES_LABEL}{" "}
                  можно указать позже
                </p>
              )}
            </label>

            <CuratorStartDateField
              value={form.curatorStartDate}
              disabled={
                !editable &&
                !canEditCuratorDate
              }
              onChange={(value) =>
                handleChange(
                  "curatorStartDate",
                  value
                )
              }
              inputClass={inputClass}
            />

            <label className="block">
              <span className="text-sm text-neutral-400">
                Тип сделки
              </span>
              <input
                required
                disabled={!editable}
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
              <span className="text-sm text-neutral-400">
                Платежная система
              </span>
              <select
                value={form.paymentSystem}
                disabled={!fieldEditable}
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
              <span className="text-sm text-neutral-400">
                Номер счёта
              </span>
              <input
                disabled={!fieldEditable}
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
              <span className="text-sm text-neutral-400">
                Комментарий
              </span>
              <textarea
                disabled={!editable}
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
                bg-surface-raised hover:bg-surface-hover
              "
            >
              Отмена
            </button>

            <button
              type="submit"
              disabled={
                saving || !canSave
              }
              className="
                px-4 py-2 rounded-xl font-semibold
                bg-brand-muted hover:bg-brand-dim
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
