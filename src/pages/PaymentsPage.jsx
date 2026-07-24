import { useState, useEffect, useMemo } from "react";

import { useSearchParams } from "react-router-dom";

import { useAuth }
from "../context/AuthContext";

import { useToast }
from "../context/ToastContext";

import { usePageLoad }
from "../hooks/usePageLoad";

import { usePermissions }
from "../hooks/usePermissions";

import {
  getClientsForUser,
} from "../services/clientService";

import {
  getPaymentsForUser,
  getPaymentById,
  updatePaymentStartDate,
  updatePaymentCuratorStartDate,
  updatePaymentWithClient,
  deletePayment,
} from "../services/paymentService";

import {
  canEditPayment,
  canDeletePayment,
  canEditPaymentStartDate,
  canEditPaymentCoreFields,
  getPaymentEditTimeLeft,
} from "../domain/payment/paymentPermissions";

import {
  paymentMatchesSearch,
  enrichPaymentForSearch,
  enrichPaymentForDisplay,
} from "../domain/payment/paymentSearch";

import {
  getPaymentTtSyncStatusLabel,
  isPaymentTtSynced,
} from "../domain/payment/paymentTtExportState";

import {
  formatMoney,
} from "../utils/moneyFormat";

import {
  isLegacyPayment,
} from "../domain/payment/legacyPayment";

import {
  canChangePaymentStreamDealType,
} from "../constants/dealTypes";

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

import PaymentContactLinks
from "../components/payments/PaymentContactLinks";

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
      <p className="text-sm text-neutral-400">
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

export default function PaymentsPage({
  embedded = false,
}) {
  const { user, userData } = useAuth();
  const toast = useToast();

  const {
    data: payments,
    loading,
    error,
    timedOut,
    reload,
  } = usePageLoad(getPaymentsForUser);

  const {
    data: clients,
  } = usePageLoad(getClientsForUser);

  const [editPayment, setEditPayment] =
    useState(null);

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  const [saving, setSaving] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const actor = userData
    ? {
        ...userData,
        uid: user?.uid,
      }
    : null;

  const { isLeadership } = usePermissions();
  const [searchParams, setSearchParams] =
    useSearchParams();

  const paymentList =
    payments || [];

  const clientsById = useMemo(() => {
    const map = new Map();

    (clients || []).forEach((client) => {
      map.set(client.id, client);
    });

    return map;
  }, [clients]);

  const filteredPayments = useMemo(
    () =>
      paymentList.filter((payment) => {
        const client = payment.clientId
          ? clientsById.get(
              payment.clientId
            )
          : null;

        return paymentMatchesSearch(
          enrichPaymentForSearch(
            payment,
            client
          ),
          search
        );
      }),
    [
      paymentList,
      clientsById,
      search,
    ]
  );

  const hasSearch =
    search.trim().length > 0;

  useEffect(() => {
    const editId =
      searchParams.get("edit");

    if (!editId || loading) {
      return;
    }

    let cancelled = false;

    async function openEditPayment() {
      const fromList =
        paymentList.find(
          (item) => item.id === editId
        );

      if (fromList) {
        if (!cancelled) {
          setEditPayment(fromList);
          setSearchParams({}, { replace: true });
        }
        return;
      }

      try {
        const payment =
          await getPaymentById(editId);

        if (cancelled) {
          return;
        }

        if (payment) {
          setEditPayment(payment);
          setSearchParams({}, { replace: true });
        } else {
          toast.error("Оплата не найдена");
          setSearchParams({}, { replace: true });
        }
      } catch (fetchError) {
        if (cancelled) {
          return;
        }

        console.error(fetchError);
        toast.error(
          "Не удалось открыть оплату"
        );
        setSearchParams({}, { replace: true });
      }
    }

    openEditPayment();

    return () => {
      cancelled = true;
    };
  }, [
    loading,
    paymentList,
    searchParams,
    setSearchParams,
    toast,
  ]);

  async function handleSaveEdit({
    paymentUpdates,
    clientUpdates,
  }) {
    if (!editPayment || !actor) {
      return;
    }

    setSaving(true);

    try {
      const hasStartDate =
        paymentUpdates.startDate !==
        undefined;
      const hasCuratorStartDate =
        paymentUpdates.curatorStartDate !==
        undefined;
      const hasAmount =
        paymentUpdates.amount !==
        undefined;
      const startDateOnly =
        hasStartDate &&
        !hasAmount &&
        !hasCuratorStartDate;
      const curatorStartDateOnly =
        hasCuratorStartDate &&
        !hasAmount &&
        !hasStartDate;
      const scheduleFieldsOnly =
        hasStartDate &&
        hasCuratorStartDate &&
        !hasAmount;

      if (startDateOnly) {
        await updatePaymentStartDate({
          paymentId: editPayment.id,
          startDate:
            paymentUpdates.startDate,
          userData: actor,
        });
      } else if (curatorStartDateOnly) {
        await updatePaymentCuratorStartDate({
          paymentId: editPayment.id,
          curatorStartDate:
            paymentUpdates.curatorStartDate,
          userData: actor,
        });
      } else if (scheduleFieldsOnly) {
        await updatePaymentStartDate({
          paymentId: editPayment.id,
          startDate:
            paymentUpdates.startDate,
          userData: actor,
        });
        await updatePaymentCuratorStartDate({
          paymentId: editPayment.id,
          curatorStartDate:
            paymentUpdates.curatorStartDate,
          userData: actor,
        });
      } else {
        await updatePaymentWithClient({
          paymentId: editPayment.id,
          paymentUpdates,
          clientUpdates,
          userData: actor,
        });
      }

      toast.success(
        startDateOnly ||
          curatorStartDateOnly ||
          scheduleFieldsOnly
          ? "Дата старта сохранена"
          : `Оплата обновлена: ${formatMoney(
              paymentUpdates.amount ??
                editPayment.amount
            )}`
      );

      setEditPayment(null);
      reload();
    } catch (saveError) {
      console.error(saveError);
      const code = saveError?.code || "";
      toast.error(
        code === "permission-denied"
          ? "Не удалось сохранить дату старта. Попробуйте ещё раз через минуту."
          : saveError.message ||
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
      {!embedded && (
        <PageHeader
          title="История оплат"
          subtitle={
            loading
              ? "Загрузка..."
              : hasSearch
                ? `${filteredPayments.length} из ${paymentList.length}`
                : `${paymentList.length} записей`
          }
        />
      )}

      {!loading && !error && (
        <input
          type="search"
          placeholder="Поиск по счёту, ссылке на диалог, клиенту, сумме..."
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          className="
            w-full bg-surface p-4 rounded-2xl
            border border-neutral-800
            focus:border-brand/50 outline-none
          "
        />
      )}

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
        paymentList.length > 0 &&
        filteredPayments.length === 0 && (
          <EmptyState
            icon="🔍"
            title="Ничего не найдено"
            description={
              hasSearch
                ? "Попробуйте другой номер счёта или имя клиента."
                : "Оформите первую оплату через «Новая оплата»."
            }
          />
        )}

      {!loading &&
        !error &&
        filteredPayments.length > 0 && (
          <div className="grid gap-4">
            {filteredPayments.map((payment) => {
              const editable =
                canEditPayment(
                  payment,
                  userData
                );

              const canEditStartDate =
                canEditPaymentStartDate(
                  payment,
                  userData
                );

              const canEditCoreFields =
                canEditPaymentCoreFields(
                  payment,
                  userData
                );

              const showEditActions =
                editable ||
                canEditStartDate ||
                canEditCoreFields;

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

              const client = payment.clientId
                ? clientsById.get(
                    payment.clientId
                  )
                : null;

              const display =
                enrichPaymentForDisplay(
                  payment,
                  client
                );

              return (
                <div
                  key={payment.id}
                  className="
                    bg-surface p-5 md:p-6 rounded-2xl
                    hover:bg-surface-raised/80 transition-colors
                  "
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
                    <div>
                      <div className="text-xl md:text-2xl font-bold">
                        {display.displayTitle}
                      </div>

                      {display.displaySubtitleName && (
                        <div className="text-neutral-500 mt-1 text-sm">
                          {display.displaySubtitleName}
                        </div>
                      )}

                      {display.dialogLink ||
                      display.vkLink ? (
                        <PaymentContactLinks
                          dialogLink={
                            display.dialogLink
                          }
                          vkLink={
                            display.vkLink
                          }
                          course={
                            display.displayCourse
                          }
                          onCopied={() =>
                            toast.success(
                              "Ссылка скопирована"
                            )
                          }
                        />
                      ) : (
                        <div className="text-neutral-400 mt-2 text-sm break-all">
                          {display.displayCourse ||
                            "—"}
                          {!legacy &&
                            payment.manager &&
                            ` · ${payment.manager}`}
                        </div>
                      )}

                      {!legacy &&
                        payment.manager &&
                        (display.dialogLink ||
                          display.vkLink) && (
                          <div className="text-neutral-500 mt-1 text-sm">
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

                      <div className="text-neutral-400 mt-1 text-sm">
                        {payment.paymentDate}
                      </div>

                      {isPaymentTtSynced(
                        payment
                      ) ? (
                        <div className="mt-2 inline-flex text-xs text-green-300 bg-green-500/10 border border-green-500/30 px-2 py-1 rounded-full">
                          {getPaymentTtSyncStatusLabel(
                            payment,
                            client
                          )}
                        </div>
                      ) : (
                        <div
                          className="mt-2 inline-flex text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-full"
                          title={
                            payment.lastTtSyncSkipReason ||
                            undefined
                          }
                        >
                          {getPaymentTtSyncStatusLabel(
                            payment,
                            client
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
                    <div className="bg-surface-raised/60 p-3 rounded-xl">
                      <div className="text-neutral-400">
                        Тип сделки
                      </div>
                      <div className="mt-1">
                        {payment.dealType}
                      </div>
                    </div>

                    <div className="bg-surface-raised/60 p-3 rounded-xl">
                      <div className="text-neutral-400">
                        Платежка
                      </div>
                      <div className="mt-1">
                        {payment.paymentSystem ||
                          "—"}
                      </div>
                    </div>

                    <div className="bg-surface-raised/60 p-3 rounded-xl">
                      <div className="text-neutral-400">
                        Счёт
                      </div>
                      <div className="mt-1 break-all">
                        {payment.invoiceNumber ||
                          "—"}
                      </div>
                    </div>

                    <div className="bg-surface-raised/60 p-3 rounded-xl">
                      <div className="text-neutral-400">
                        Поток
                      </div>
                      <div className="mt-1">
                        {legacy
                          ? "—"
                          : payment.startDate ||
                            (canChangePaymentStreamDealType(
                              payment.dealType
                            ) ||
                            canChangePaymentStreamDealType(
                              payment.dealTypeId
                            )
                              ? "не указан"
                              : "—")}
                      </div>
                    </div>
                  </div>

                  {payment.comment && (
                    <div className="mt-4 bg-surface-raised p-3 rounded-xl text-sm text-neutral-300">
                      {payment.comment}
                    </div>
                  )}

                  {(showEditActions ||
                    deletable) && (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {showEditActions && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditPayment(
                              payment
                            )
                          }
                          className="
                            px-4 py-2 rounded-xl
                            bg-brand-muted hover:bg-brand-dim
                            text-sm font-semibold
                          "
                        >
                          {canEditStartDate &&
                          !editable
                            ? "Указать поток"
                            : "Редактировать"}
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

                      {!isLeadership &&
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
        isAdmin={isLeadership}
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
