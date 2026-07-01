import {
  useState,
} from "react";

import { usePendingSales }
from "../hooks/usePendingSales";

import {
  rejectPendingSale,
} from "../services/pendingSalesService";

import PageHeader
from "../components/ui/PageHeader";

import EmptyState
from "../components/ui/EmptyState";

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

export default function PendingSalesPage() {
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

  async function handleReject(id) {
    setRejectingId(id);

    try {
      await rejectPendingSale(id);
    } finally {
      setRejectingId(null);
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
                      onReject={handleReject}
                      rejecting={
                        rejectingId === sale.id
                      }
                    />

                  ))

                }

              </div>

            )

        }

      </section>

      <section>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">

          <h2 className="text-xl font-bold">

            Отправить коллеге

          </h2>

          {renderQuickSaleButton("text-sm")}

        </div>

        {pendingCreated.length === 0 ? (
          <EmptyState
            icon="⚡"
            title="Нет исходящих продаж"
            description="Зафиксируйте продажу за коллегу — она получит её на подтверждение."
            action={renderQuickSaleButton()}
          />
        ) : (
          <div className="grid gap-4">
            {pendingCreated.map((sale) => (
              <PendingSaleCard
                key={sale.id}
                sale={sale}
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

    </div>

  );
}
