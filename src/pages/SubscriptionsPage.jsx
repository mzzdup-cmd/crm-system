import { Link } from "react-router-dom";

import EmptyState
from "../components/ui/EmptyState";

import RealtimeIndicator
from "../components/ui/RealtimeIndicator";

import { useSubscriptionsRealtime }
from "../hooks/useRealtimeDashboard";

import LoadingState
from "../components/LoadingState";

export default function SubscriptionsPage() {
  const {
    subscriptions,
    initialLoading,
    connected,
  } = useSubscriptionsRealtime();

  if (initialLoading) {
    return (
      <LoadingState message="Загрузка подписок..." />
    );
  }

  return (
    <div className="space-y-6">

      <div className="flex flex-wrap items-center justify-between gap-4">

        <div>

          <h1 className="text-3xl md:text-4xl font-bold">

            Подписки

          </h1>

          <p className="text-slate-400 mt-2 flex items-center gap-3">

            <span>{subscriptions.length} активных</span>

            <RealtimeIndicator connected={connected} />

          </p>

        </div>

      </div>

      {

        subscriptions.length === 0

          ? (

            <EmptyState
              icon="📋"
              title="Активных подписок нет"
              description="Подписки с остатком долга появятся здесь автоматически."
            />

          )

          : (

            <div className="grid gap-4">

              {

                subscriptions.map((client) => (

                  <Link
                    key={client.id}
                    to={`/client/${client.id}`}
                    className={`
                      block p-5 md:p-6 rounded-2xl
                      transition-all duration-200
                      hover:scale-[1.005] hover:bg-slate-800
                      ${
                        client.overdue
                          ? "bg-red-500/10 border border-red-500/40"
                          : "bg-slate-900"
                      }
                    `}
                  >

                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">

                      <div>

                        <div className="text-xl md:text-2xl font-bold">

                          {client.name || client.manager || "Клиент"}

                        </div>

                        <div className="text-slate-400 mt-2">

                          {client.course} · {client.manager}

                        </div>

                      </div>

                      <div className="text-left sm:text-right">

                        <div className="text-2xl md:text-3xl font-bold text-yellow-400">

                          {client.remain.toLocaleString("ru-RU")} ₽

                        </div>

                        <div className="text-slate-400 text-sm mt-1">

                          Остаток

                        </div>

                      </div>

                    </div>

                    <div className="mt-4 flex flex-wrap justify-between gap-4 text-sm">

                      <div>

                        <div className="text-slate-400">

                          Следующая оплата

                        </div>

                        <div className="mt-1 font-medium">

                          {client.nextPaymentDate || "Не указана"}

                        </div>

                      </div>

                      <div className="text-right">

                        <div className="text-slate-400">

                          Статус

                        </div>

                        <div className="mt-1 font-bold">

                          {

                            client.overdue

                              ? (
                                <span className="text-red-400">

                                  Просрочка

                                </span>
                              )

                              : (
                                <span className="text-green-400">

                                  Активна

                                </span>
                              )

                          }

                        </div>

                      </div>

                    </div>

                  </Link>

                ))

              }

            </div>

          )

      }

    </div>

  );
}
