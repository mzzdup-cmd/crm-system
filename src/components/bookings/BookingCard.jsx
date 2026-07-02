import { Link } from "react-router-dom";

import {
  formatBookingDate,
} from "../../domain/client/bbBookingLogic";

import {
  formatMoney,
} from "../../utils/moneyFormat";

async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

export default function BookingCard({
  booking,
  onCopy,
}) {
  async function handleCopy() {
    try {
      await copyText(booking.copyText);
      onCopy?.("success");
    } catch {
      onCopy?.("error");
    }
  }

  return (
    <div className="bg-slate-900 p-5 md:p-6 rounded-2xl border border-amber-500/20">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          {booking.clientId ? (
            <Link
              to={`/client/${booking.clientId}`}
              className="text-xl md:text-2xl font-bold hover:text-cyan-300 transition-colors"
            >
              {booking.clientName}
            </Link>
          ) : (
            <div className="text-xl md:text-2xl font-bold">
              {booking.clientName}
            </div>
          )}

          <div className="text-slate-400 text-sm">
            {booking.course
              ? `${booking.course} · `
              : ""}
            {booking.manager || "—"}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-2">
            <div>
              <div className="text-slate-500">
                Дата брони
              </div>
              <div className="font-medium mt-0.5">
                {formatBookingDate(
                  booking.paymentDate
                )}
              </div>
            </div>

            <div>
              <div className="text-slate-500">
                Планируемый старт
              </div>
              <div className="font-medium mt-0.5">
                {formatBookingDate(
                  booking.plannedStartDate
                )}
              </div>
            </div>

            <div>
              <div className="text-slate-500">
                Сумма ББ
              </div>
              <div className="font-medium text-amber-300 mt-0.5">
                {formatMoney(
                  booking.bookingAmount
                )}
              </div>
            </div>

            {booking.budget > 0 && (
              <div>
                <div className="text-slate-500">
                  Тариф
                </div>
                <div className="font-medium mt-0.5">
                  {formatMoney(
                    booking.budget
                  )}
                </div>
              </div>
            )}
          </div>

          {(booking.dialogLink ||
            booking.vkLink) && (
            <div className="flex flex-wrap gap-3 text-sm pt-1">
              {booking.dialogLink && (
                <a
                  href={booking.dialogLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline"
                >
                  Диалог
                </a>
              )}
              {booking.vkLink && (
                <a
                  href={booking.vkLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline"
                >
                  VK
                </a>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="
            shrink-0 px-4 py-2.5 rounded-xl
            bg-amber-500/20 text-amber-200
            hover:bg-amber-500/30 transition-colors
            text-sm font-semibold
          "
        >
          Скопировать для БС
        </button>
      </div>

      <pre className="mt-4 p-3 rounded-xl bg-slate-950/80 text-xs text-slate-300 whitespace-pre-wrap font-sans">
        {booking.copyText}
      </pre>
    </div>
  );
}
