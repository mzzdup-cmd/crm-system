import { useMemo } from "react";

import EmptyState
from "../components/ui/EmptyState";

import RealtimeIndicator
from "../components/ui/RealtimeIndicator";

import BookingCard
from "../components/bookings/BookingCard";

import { useToast }
from "../context/ToastContext";

import { useBookingsRealtime }
from "../hooks/useRealtimeDashboard";

import LoadingState
from "../components/LoadingState";

export default function BookingsPage({
  embedded = false,
}) {
  const toast = useToast();

  const {
    bookings,
    initialLoading,
    connected,
  } = useBookingsRealtime();

  const sortedBookings = useMemo(
    () => bookings,
    [bookings]
  );

  function handleCopy(status) {
    if (status === "error") {
      toast.error(
        "Не удалось скопировать текст"
      );
      return;
    }

    toast.success(
      "Текст скопирован для БС"
    );
  }

  if (initialLoading) {
    return (
      <LoadingState message="Загрузка броней..." />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {!embedded && (
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">
              Бронь
            </h1>
            <p className="text-slate-400 mt-2 flex items-center gap-3">
              <span>
                Лиды с бронированием места (ББ).
                Подписка начинается после
                «Доплата ББ».
              </span>
              <RealtimeIndicator
                connected={connected}
              />
            </p>
          </div>
        )}

        {embedded && (
          <p className="text-slate-400 text-sm flex items-center gap-3">
            <span>
              {sortedBookings.length}{" "}
              {sortedBookings.length === 1
                ? "бронь"
                : "броней"}{" "}
              · только ББ, без доплаты
            </span>
            <RealtimeIndicator
              connected={connected}
            />
          </p>
        )}
      </div>

      {sortedBookings.length === 0 ? (
        <EmptyState
          icon="🎫"
          title="Броней пока нет"
          description="Здесь появятся клиенты после сделки «ББ» — до первой «Доплаты ББ»."
        />
      ) : (
        <div className="grid gap-4">
          {sortedBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onCopy={handleCopy}
            />
          ))}
        </div>
      )}
    </div>
  );
}
