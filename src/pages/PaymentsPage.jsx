import { useState } from "react";

import { useAuth }
from "../context/AuthContext";

import { useToast }
from "../context/ToastContext";

import { usePageLoad }
from "../hooks/usePageLoad";

import {
  getPaymentsForUser,
  updatePaymentWithClient,
  deletePayment,
} from "../services/paymentService";

import {
  canEditPayment,
  canDeletePayment,
  getPaymentEditTimeLeft,
} from "../domain/payment/paymentPermissions";

import {
  formatMoney,
} from "../utils/moneyFormat";

import {
  isLegacyPayment,
} from "../domain/payment/legacyPayment";

import PageHeader
from "../components/ui/PageHeader";

import EmptyState
from "../components/ui/EmptyState";

import ListPageSkeleton
from "../components/ui/ListPageSkeleton";

import ConfirmModal
from "../components/ui/ConfirmModal";

import PaymentEditModal
from "../components/payments/PaymentEditModal";

function formatTimeLeft(ms) {
  const minutes = Math.ceil(ms / 60000);

  return `${minutes} мин`;
}

function LoadErrorState({
  message,
  timedOut,
  onRetry,
}) {
  return (
    <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-2xl space-y-4">
      <div className="text-red-300 font-semibold">
        {timedOut
          ? "Загрузка занимает слишком много времени"
          : "Не удалось загрузить платежи"}
      </div>
      <p className="text-sm text-slate-400">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="
          px-4 py-2 rounded-xl
          bg-red-600 hover:bg-red-700
          font-semibold text-sm
        "
      >
        Повторить
      </button>
    </div>
  );
}

export default function PaymentsPage() {
  const { user, userData } = useAuth();
  const toast = useToast();

  const {
    data: payments,
    loading,
    error,
    timedOut,
    reload,
  } = usePageLoad(getPaymentsForUser);

  const [editPayment, setEditPayment] =
    useState(null);

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  const [saving, setSaving] =
    useState(false);

  const actor = userData
    ? {
        ...userData,
        uid: user?.uid,
      }
    : null;

  const isAdmin =
    userData?.role === "admin";

  const paymentList =
    payments || [];

  async function handleSaveEdit({
    paymentUpdates,
    clientUpdates,
  }) {
    if (!editPayment || !actor) {
      return;
    }

    setSaving(true);

    try {
      await updatePaymentWithClient({
        paymentId: editPayment.id,
        paymentUpdates,
        clientUpdates,
        userData: actor,
      });

      toast.success(
        `Оплата обновлена: ${formatMoney(
          paymentUpdates.amount
        )}`
      );

      setEditPayment(null);
      reload();
    } catch (saveError) {
      console.error(saveError);
      toast.error(
        saveError.message ||
          "Не удалось сохранить"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget || !actor) {
      return;
    }

    setSaving(true);

    try {
      await deletePayment({
        paymentId: deleteTarget.id,
        userData: actor,
      });

      toast.success(
        `Оплата удалена: ${formatMoney(
          deleteTarget.amount
        )}`
      );

      setDeleteTarget(null);
      reload();
    } catch (deleteError) {
      console.error(deleteError);
      toast.error(
        deleteError.message ||
          "Не удалось удалить"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="История оплат"
        subtitle={
          loading
            ? "Загрузка..."
            : `${paymentList.length} записей`
        }
      />

      {loading && (
        <ListPageSkeleton rows={5} />
      )}

      {!loading && error && (
        <LoadErrorState
          message={error}
          timedOut={timedOut}
          onRetry={reload}
        />
      )}

      {!loading &&
        !error &&
        paymentList.length === 0 && (
          <EmptyState
            icon="💳"
            title="Платежей пока нет"
            description="Оформите первую оплату через «Новая оплата»."
          />
        )}

      {!loading &&
        !error &&
        paymentList.length > 0 && (
          <div className="grid gap-4">
            {paymentList.map((payment) => {
              const editable =
                canEditPayment(
                  payment,
                  userData
                );

              const deletable =
                canDeletePayment(
                  payment,
                  userData
                );

              const timeLeft =
                getPaymentEditTimeLeft(
                  payment
                );

              const legacy =
                isLegacyPayment(payment);

              return (
                <div
                  key={payment.id}
                  className="
                    bg-slate-900 p-5 md:p-6 rounded-2xl
                    hover:bg-slate-800/80 transition-colors
                  "
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
                    <div>
                      <div className="text-xl md:text-2xl font-bold">
                        {legacy
                          ? payment.legacyClientName ||
                            payment.clientName ||
                            "Legacy подписчик"
                          : payment.clientName ||
                            "Без имени"}
                      </div>

                      <div className="text-slate-400 mt-2 text-sm break-all">
                        {legacy
                          ? `${payment.course || "—"} · ${payment.dialogLink || "—"}`
                          : `${payment.course} · ${payment.manager}`}
                      </div>

                      {!legacy && (
                        <div className="text-slate-500 mt-1 text-sm">
                          {payment.manager}
                        </div>
                      )}
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-2xl md:text-3xl font-bold text-green-400">
                        {formatMoney(
                          payment.amount
                        )}
                      </div>

                      <div className="text-slate-400 mt-1 text-sm">
                        {payment.paymentDate}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="bg-slate-800/60 p-3 rounded-xl">
                      <div className="text-slate-400">
                        Тип сделки
                      </div>
                      <div className="mt-1">
                        {payment.dealType}
                      </div>
                    </div>

                    <div className="bg-slate-800/60 p-3 rounded-xl">
                      <div className="text-slate-400">
                        Платежка
                      </div>
                      <div className="mt-1">
                        {payment.paymentSystem ||
                          "—"}
                      </div>
                    </div>

                    <div className="bg-slate-800/60 p-3 rounded-xl">
                      <div className="text-slate-400">
                        Поток
                      </div>
                      <div className="mt-1">
                        {legacy
                          ? "—"
                          : payment.startDate ||
                            "—"}
                      </div>
                    </div>
                  </div>

                  {payment.comment && (
                    <div className="mt-4 bg-slate-800 p-3 rounded-xl text-sm text-slate-300">
                      {payment.comment}
                    </div>
                  )}

                  {(editable || deletable) && (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {editable && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditPayment(
                              payment
                            )
                          }
                          className="
                            px-4 py-2 rounded-xl
                            bg-cyan-600 hover:bg-cyan-700
                            text-sm font-semibold
                          "
                        >
                          Редактировать
                        </button>
                      )}

                      {deletable && (
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget(
                              payment
                            )
                          }
                          className="
                            px-4 py-2 rounded-xl
                            bg-red-600/80 hover:bg-red-600
                            text-sm font-semibold
                          "
                        >
                          Удалить
                        </button>
                      )}

                      {!isAdmin &&
                        editable &&
                        timeLeft > 0 && (
                          <span className="text-xs text-amber-400">
                            Редактирование:{" "}
                            {formatTimeLeft(
                              timeLeft
                            )}
                          </span>
                        )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      <PaymentEditModal
        open={Boolean(editPayment)}
        payment={editPayment}
        userData={userData}
        isAdmin={isAdmin}
        saving={saving}
        onSave={handleSaveEdit}
        onClose={() =>
          setEditPayment(null)
        }
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Удалить оплату?"
        message={
          deleteTarget
            ? `${deleteTarget.clientName} — ${formatMoney(
                deleteTarget.amount
              )}. Сумма клиента будет пересчитана.`
            : ""
        }
        confirmLabel="Удалить"
        loading={saving}
        onConfirm={handleConfirmDelete}
        onCancel={() =>
          setDeleteTarget(null)
        }
      />
    </div>
  );
}
