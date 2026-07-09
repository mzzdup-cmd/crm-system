import {
  useState,
  useEffect,
  useMemo,
} from "react";

import {
  MANAGERS,
  getManagerNameById,
} from "../../constants/managers";

import { COURSES } from "../../constants/courses";

import {
  DEAL_TYPE_OPTIONS,
} from "../../constants/dealTypes";

import {
  getTodayDateString,
} from "../../domain/schedule/scheduleLogic";

import {
  canCreatePendingSale,
  validatePendingSaleInput,
  getQuickSaleModalTitle,
} from "../../domain/pendingSales/pendingSalesLogic";

import {
  getEffectiveOwnerManagerId,
} from "../../domain/auth/roleHelpers";

import {
  createPendingSale,
} from "../../services/pendingSalesService";

import { useToast }
from "../../context/ToastContext";

import MoneyInput
from "../ui/MoneyInput";

import { usePermissions } from "../../hooks/usePermissions";

import {
  formatMoney,
} from "../../utils/moneyFormat";

export default function QuickSaleModal({
  open,
  onClose,
  schedule,
  coveringTargets = [],
}) {
  const { userData, managerId, isLeadership, isManager } =
    usePermissions();

  const effectiveOwnerManagerId =
    getEffectiveOwnerManagerId(userData);

  const toast = useToast();

  const [ownerManagerId, setOwnerManagerId] =
    useState("");

  const [dialogLink, setDialogLink] =
    useState("");

  const [amount, setAmount] = useState("");

  const [paymentDate, setPaymentDate] =
    useState(getTodayDateString());

  const [comment, setComment] = useState("");

  const [course, setCourse] = useState("");

  const [dealTypeId, setDealTypeId] =
    useState("new");

  const [error, setError] = useState("");

  const [saving, setSaving] = useState(false);

  const availableTargets = useMemo(() => {
    if (isLeadership || isManager) {
      return MANAGERS.filter(
        (m) => m.id !== managerId
      ).map((m) => m.id);
    }

    return coveringTargets;
  }, [
    isLeadership,
    isManager,
    managerId,
    coveringTargets,
  ]);

  const singleTarget =
    availableTargets.length === 1;

  useEffect(() => {
    if (!open) {
      return;
    }

    setError("");

    if (singleTarget) {
      setOwnerManagerId(availableTargets[0]);
    } else {
      setOwnerManagerId("");
    }

    setDialogLink("");
    setAmount("");
    setPaymentDate(getTodayDateString());
    setComment("");
    setCourse("");
    setDealTypeId("new");
  }, [open, singleTarget, availableTargets]);

  if (!open) {
    return null;
  }

  const modalTitle =
    getQuickSaleModalTitle(ownerManagerId);

  async function handleSubmit(event) {
    event.preventDefault();

    if (isManager && !isLeadership && !effectiveOwnerManagerId) {
      setError(
        "Профиль не настроен: попросите администратора указать managerId в Firebase (users → ваш UID)."
      );
      return;
    }

    const validationError =
      validatePendingSaleInput({
        ownerManagerId,
        dialogLink,
        amount,
        paymentDate,
      });

    if (validationError) {
      setError(validationError);
      return;
    }

    if (
      !canCreatePendingSale(
        userData,
        schedule,
        ownerManagerId
      )
    ) {
      setError(
        "Нельзя создать продажу для этого менеджера"
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      await createPendingSale({
        createdByManagerId:
          effectiveOwnerManagerId || managerId,
        ownerManagerId,
        dialogLink,
        amount,
        paymentDate,
        comment,
        course: course.trim(),
        dealTypeId,
      });

      const ownerName =
        getManagerNameById(ownerManagerId) ||
        "коллегу";

      toast.success(
        `Быстрая продажа сохранена для ${ownerName}: ${formatMoney(amount)}`
      );

      onClose(true);
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError.message ||
        "Не удалось сохранить"
      );
    }

    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">

      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/70"
        onClick={() => onClose(false)}
      />

      <form
        onSubmit={handleSubmit}
        className="
          relative w-full sm:max-w-md
          bg-slate-900 border border-slate-700
          rounded-t-3xl sm:rounded-2xl
          p-5 sm:p-6 shadow-2xl
          animate-slide-in-right
          max-h-[90vh] overflow-y-auto
        "
      >

        <div className="flex items-center justify-between mb-5">

          <div>

            <div className="text-xl font-bold">

              {modalTitle}

            </div>

            <div className="text-slate-400 text-sm mt-1">

              {singleTarget
                ? "Продажа будет передана коллеге на подтверждение"
                : "Временная запись для коллеги"}

            </div>

          </div>

          <button
            type="button"
            onClick={() => onClose(false)}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400"
          >

            ✕

          </button>

        </div>

        <div className="space-y-4">

          {!singleTarget && (

            <div>

              <label className="text-slate-400 text-sm mb-1 block">

                Менеджер (владелец продажи)

              </label>

              <select
                value={ownerManagerId}
                onChange={(e) =>
                  setOwnerManagerId(e.target.value)
                }
                className="w-full bg-slate-800 p-3.5 rounded-xl"
                required
              >

                <option value="">

                  Выберите менеджера

                </option>

                {

                  availableTargets.map((id) => (

                    <option
                      key={id}
                      value={id}
                    >

                      {getManagerNameById(id)}

                    </option>

                  ))

                }

              </select>

            </div>

          )}

          <div>

            <label className="text-slate-400 text-sm mb-1 block">

              Ссылка на диалог

            </label>

            <input
              type="text"
              inputMode="url"
              autoComplete="off"
              value={dialogLink}
              onChange={(e) =>
                setDialogLink(e.target.value)
              }
              placeholder="https://..."
              className="w-full bg-slate-800 p-3.5 rounded-xl"
              required
            />

          </div>

          <div className="grid grid-cols-2 gap-3">

            <div>

              <label className="text-slate-400 text-sm mb-1 block">

                Сумма ₽

              </label>

              <MoneyInput
                value={amount}
                onChange={setAmount}
                placeholder="15 000"
                required
                className="w-full bg-slate-800 p-3.5 rounded-xl"
              />

            </div>

            <div>

              <label className="text-slate-400 text-sm mb-1 block">

                Дата оплаты

              </label>

              <input
                type="date"
                value={paymentDate}
                onChange={(e) =>
                  setPaymentDate(e.target.value)
                }
                className="w-full bg-slate-800 p-3.5 rounded-xl"
                required
              />

            </div>

          </div>

          <div className="grid grid-cols-2 gap-3">

            <div>

              <label className="text-slate-400 text-sm mb-1 block">

                Тип сделки

              </label>

              <select
                value={dealTypeId}
                onChange={(e) =>
                  setDealTypeId(e.target.value)
                }
                className="w-full bg-slate-800 p-3.5 rounded-xl"
                required
              >

                {

                  DEAL_TYPE_OPTIONS.map((item) => (

                    <option
                      key={item.id}
                      value={item.id}
                    >

                      {item.label}

                    </option>

                  ))

                }

              </select>

            </div>

            <div>

              <label className="text-slate-400 text-sm mb-1 block">

                Курс (необязательно)

              </label>

              <select
                value={course}
                onChange={(e) =>
                  setCourse(e.target.value)
                }
                className="w-full bg-slate-800 p-3.5 rounded-xl"
              >

                <option value="">

                  Не указан

                </option>

                {

                  COURSES.map((item) => (

                    <option
                      key={item}
                      value={item}
                    >

                      {item}

                    </option>

                  ))

                }

              </select>

            </div>

          </div>

          <div>

            <label className="text-slate-400 text-sm mb-1 block">

              Комментарий (необязательно)

            </label>

            <input
              type="text"
              value={comment}
              onChange={(e) =>
                setComment(e.target.value)
              }
              placeholder="Кратко о сделке"
              className="w-full bg-slate-800 p-3.5 rounded-xl"
            />

          </div>

          {

            error && (

              <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-xl">

                {error}

              </div>

            )

          }

          <button
            type="submit"
            disabled={saving}
            className="
              w-full py-3.5 rounded-xl font-bold
              bg-cyan-500 hover:bg-cyan-400
              disabled:opacity-50 transition-colors
            "
          >

            {saving ? "Сохранение..." : "Сохранить"}

          </button>

        </div>

      </form>

    </div>

  );

}
