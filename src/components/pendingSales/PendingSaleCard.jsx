import { Link } from "react-router-dom";

import {
  getDealTypeLabel,
} from "../../constants/dealTypes";

import {
  getManagerNameById,
} from "../../constants/managers";

import {
  PENDING_SALE_STATUS,
} from "../../constants/pendingSales";

function statusBadge(status) {
  if (status === PENDING_SALE_STATUS.PENDING) {
    return (
      <span className="text-yellow-400 text-xs font-bold uppercase">

        Ожидает

      </span>
    );
  }

  if (status === PENDING_SALE_STATUS.CONFIRMED) {
    return (
      <span className="text-green-400 text-xs font-bold uppercase">

        Подтверждено

      </span>
    );
  }

  return (
    <span className="text-neutral-500 text-xs font-bold uppercase">

      Отклонено

    </span>
  );
}

export default function PendingSaleCard({
  sale,
  showActions = false,
  canDelete = false,
  onReject,
  onDelete,
  rejecting = false,
  deleting = false,
}) {
  const creatorName =
    getManagerNameById(sale.createdByManagerId) ||
    "—";

  const ownerName =
    getManagerNameById(sale.ownerManagerId) ||
    "—";

  return (
    <div
      className="
        bg-surface border border-neutral-800
        p-4 md:p-5 rounded-2xl
        hover:border-neutral-700 transition-colors
      "
    >

      <div className="flex flex-wrap justify-between gap-3 mb-3">

        <div>

          <div className="text-xl font-bold text-green-400">

            {sale.amount.toLocaleString("ru-RU")} ₽

          </div>

          <div className="text-neutral-400 text-sm mt-1">

            {sale.paymentDate}

          </div>

        </div>

        {statusBadge(sale.status)}

      </div>

      <div className="space-y-2 text-sm">

        <div className="flex justify-between gap-4">

          <span className="text-neutral-400">

            Владелец

          </span>

          <span className="font-medium">

            {ownerName}

          </span>

        </div>

        <div className="flex justify-between gap-4">

          <span className="text-neutral-400">

            Внёс

          </span>

          <span>{creatorName}</span>

        </div>

        {

          (sale.dealTypeId || sale.course) && (

            <div className="flex flex-wrap gap-x-4 gap-y-1">

              {

                sale.dealTypeId && (

                  <div className="flex justify-between gap-4 flex-1 min-w-[140px]">

                    <span className="text-neutral-400">

                      Тип

                    </span>

                    <span>

                      {getDealTypeLabel(sale.dealTypeId)}

                    </span>

                  </div>

                )

              }

              {

                sale.course && (

                  <div className="flex justify-between gap-4 flex-1 min-w-[140px]">

                    <span className="text-neutral-400">

                      Курс

                    </span>

                    <span>{sale.course}</span>

                  </div>

                )

              }

            </div>

          )

        }

        <div>

          <div className="text-neutral-400 mb-1">

            Диалог

          </div>

          <a
            href={sale.dialogLink}
            target="_blank"
            rel="noreferrer"
            className="text-brand break-all hover:underline"
          >

            {sale.dialogLink}

          </a>

        </div>

        {

          sale.comment && (

            <div className="bg-surface-raised/80 p-3 rounded-xl text-neutral-300">

              {sale.comment}

            </div>

          )

        }

      </div>

      {

        (showActions || canDelete) &&
        sale.status === PENDING_SALE_STATUS.PENDING && (

          <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-neutral-800">

            {showActions && (
              <Link
                to={`/new-payment?pendingSale=${sale.id}`}
                className="
                  flex-1 text-center py-3 rounded-xl font-bold
                  crm-btn-primary hover:opacity-90 transition-colors
                "
              >

                Подтвердить и заполнить

              </Link>
            )}

            {showActions && (
              <button
                type="button"
                onClick={() => onReject?.(sale.id)}
                disabled={rejecting || deleting}
                className="
                  flex-1 py-3 rounded-xl font-bold
                  bg-surface-raised hover:bg-surface-hover
                  text-neutral-300 disabled:opacity-50
                "
              >

                Отклонить

              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete?.(sale)}
                disabled={rejecting || deleting}
                className="
                  flex-1 py-3 rounded-xl font-bold
                  bg-red-600/80 hover:bg-red-600
                  text-white disabled:opacity-50
                "
              >

                {deleting ? "Удаление..." : "Удалить"}

              </button>
            )}

          </div>

        )

      }

    </div>

  );
}
