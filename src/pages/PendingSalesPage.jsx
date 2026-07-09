import {
  useState,
} from "react";

import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";

import { usePendingSales }
from "../hooks/usePendingSales";

import {
  rejectPendingSale,
  deletePendingSale,
} from "../services/pendingSalesService";

import PageHeader
from "../components/ui/PageHeader";

import EmptyState
from "../components/ui/EmptyState";

import ConfirmModal
from "../components/ui/ConfirmModal";

import RealtimeIndicator
from "../components/ui/RealtimeIndicator";

import QuickSaleModal
from "../components/pendingSales/QuickSaleModal";

import PendingSaleCard
from "../components/pendingSales/PendingSaleCard";

import LoadingState
from "../components/LoadingState";

import {
  PENDING_SALE_STATUS,
} from "../constants/pendingSales";

import {
  getQuickSaleButtonLabel,
} from "../domain/pendingSales/pendingSalesLogic";

import {
  formatMoney,
} from "../utils/moneyFormat";

import { useToast }
from "../context/ToastContext";

export default function PendingSalesPage() {
  const { userData } = useAuth();
  const { isLeadership } = usePermissions();
  const toast = useToast();
  const {
    incoming,
    created,
    pendingCount,
    canQuickSale,
    coveringTargets,
    schedule,
    connected,
    initialLoading,
  } = usePendingSales();

  const pendingCreated = created.filter(
    (sale) =>
      sale.status === PENDING_SALE_STATUS.PENDING
  );

  const [modalOpen, setModalOpen] =
    useState(false);

  const [rejectingId, setRejectingId] =
    useState(null);

  const [deletingId, setDeletingId] =
    useState(null);

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  async function handleReject(id) {
    setRejectingId(id);

    try {
      await rejectPendingSale(id);
    } finally {
      setRejectingId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget || !userData) {
      return;
    }

    setDeletingId(deleteTarget.id);

    try {
      await deletePendingSale(
        deleteTarget.id,
        { userData }
      );

      toast.success(
        `Продажа удалена: ${formatMoney(
          deleteTarget.amount
        )}`
      );

      setDeleteTarget(null);
    } catch (deleteError) {
      console.error(deleteError);
      toast.error(
        deleteError.message ||
          "Не удалось удалить"
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (initialLoading) {
    return (
      <LoadingState message="Загрузка продаж..." />
    );
  }

  const history = created.filter(
    (sale) =>
      sale.status !== PENDING_SALE_STATUS.PENDING
  );

  const quickSaleLabel =
    getQuickSaleButtonLabel(coveringTargets);

  function renderQuickSaleButton(className = "") {
    if (!canQuickSale) {
      return null;
    }

    return (
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={`
          px-4 py-2.5 rounded-xl font-bold
          bg-cyan-500 hover:bg-cyan-400 transition-colors
          ${className}
        `}
      >
        {quickSaleLabel}
      </button>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">

      <PageHeader
        title="Временные продажи"
        subtitle={
          <>
            {pendingCount > 0
              ? `${pendingCount} ожидают подтверждения`
              : "Нет ожидающих"}
            <RealtimeIndicator connected={connected} />
          </>
        }
        actions={renderQuickSaleButton()}
      />

      <section>

        <h2 className="text-xl font-bold mb-4">

          Ожидают вашего подтверждения

        </h2>

        {

          incoming.length === 0

            ? (

              <EmptyState
                icon="✅"
                title="Нет новых продаж"
                description="Когда коллега зафиксирует продажу за вас, она появится здесь."
              />

            )

            : (

              <div className="grid gap-4">

                {

                  incoming.map((sale) => (

                    <PendingSaleCard
                      key={sale.id}
                      sale={sale}
                      showActions
                      canDelete={isLeadership}
                      onReject={handleReject}
                      onDelete={setDeleteTarget}
                      rejecting={
                        rejectingId === sale.id
                      }
                      deleting={
                        deletingId === sale.id
                      }
                    />

                  ))

                }

              </div>

            )

        }

      </section>

      <section>

        <h2 className="text-xl font-bold mb-4">

          Отправить коллеге

        </h2>

        {pendingCreated.length === 0 ? (
          <EmptyState
            icon="⚡"
            title="Нет исходящих продаж"
            description="Зафиксируйте продажу за коллегу — она получит её на подтверждение."
          />
        ) : (
          <div className="grid gap-4">
            {pendingCreated.map((sale) => (
              <PendingSaleCard
                key={sale.id}
                sale={sale}
                canDelete={isLeadership}
                onDelete={setDeleteTarget}
                deleting={
                  deletingId === sale.id
                }
              />
            ))}
          </div>
        )}

      </section>

      {

        created.length > 0 && (

          <section>

            <h2 className="text-xl font-bold mb-4">

              История ваших продаж

            </h2>

            <div className="grid gap-4">

              {

                created.map((sale) => (

                  <PendingSaleCard
                    key={sale.id}
                    sale={sale}
                  />

                ))

              }

            </div>

          </section>

        )

      }

      {

        history.length > 0 && (

          <section>

            <h2 className="text-xl font-bold mb-4 text-slate-400">

              История

            </h2>

            <div className="grid gap-3 opacity-80">

              {

                history.slice(0, 10).map((sale) => (

                  <PendingSaleCard
                    key={sale.id}
                    sale={sale}
                  />

                ))

              }

            </div>

          </section>

        )

      }

      <QuickSaleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        schedule={schedule}
        coveringTargets={coveringTargets}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Удалить быструю продажу?"
        message={
          deleteTarget
            ? `${formatMoney(
                deleteTarget.amount
              )} · ${deleteTarget.paymentDate || "—"}. Запись будет удалена безвозвратно.`
            : ""
        }
        confirmLabel="Удалить"
        loading={Boolean(deletingId)}
        onConfirm={handleConfirmDelete}
        onCancel={() =>
          setDeleteTarget(null)
        }
      />

    </div>

  );
}
