import { Link } from "react-router-dom";

import BluesalesScheduleBlock
from "./BluesalesScheduleBlock";

import {
  SUBSCRIPTION_OUTCOMES,
} from "../../domain/client/subscriptionOutcome";

function StatusBadge({
  variant,
  overdue,
}) {
  if (variant === SUBSCRIPTION_OUTCOMES.COMPLETED) {
    return (
      <span className="text-green-400">
        Оплачена
      </span>
    );
  }

  if (variant === SUBSCRIPTION_OUTCOMES.CHURNED) {
    return (
      <span className="text-slate-400">
        Слив
      </span>
    );
  }

  if (overdue) {
    return (
      <span className="text-red-400">
        Просрочка
      </span>
    );
  }

  return (
    <span className="text-green-400">
      Активна
    </span>
  );
}

export default function SubscriptionCard({
  client,
  variant = SUBSCRIPTION_OUTCOMES.ACTIVE,
  onMarkChurned,
  onCopy,
}) {
  const isActive =
    variant === SUBSCRIPTION_OUTCOMES.ACTIVE;

  const isCompleted =
    variant === SUBSCRIPTION_OUTCOMES.COMPLETED;

  const cardClass = client.overdue && isActive
    ? "bg-red-500/10 border border-red-500/40"
    : variant === SUBSCRIPTION_OUTCOMES.CHURNED
      ? "bg-slate-900/80 border border-slate-700"
      : isCompleted
        ? "bg-green-500/5 border border-green-500/20"
        : "bg-slate-900";

  return (
    <div
      className={`
        p-5 md:p-6 rounded-2xl
        transition-all duration-200
        ${cardClass}
      `}
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">

        <div className="flex-1 min-w-0">

          <Link
            to={`/client/${client.id}`}
            className="text-xl md:text-2xl font-bold hover:text-cyan-300 transition-colors"
          >

            {client.name || client.manager || "Клиент"}

          </Link>

          <div className="text-slate-400 mt-2">

            {client.course} · {client.manager}

          </div>

        </div>

        <div className="text-left sm:text-right shrink-0">

          <div
            className={`text-2xl md:text-3xl font-bold ${
              isCompleted
                ? "text-green-400"
                : "text-yellow-400"
            }`}
          >

            {isCompleted
              ? `${Number(client.budget || 0).toLocaleString("ru-RU")} ₽`
              : `${client.remain.toLocaleString("ru-RU")} ₽`}

          </div>

          <div className="text-slate-400 text-sm mt-1">

            {isCompleted ? "Бюджет закрыт" : "Остаток"}

          </div>

        </div>

      </div>

      <div className="mt-4 flex flex-wrap justify-between gap-4 text-sm">

        <div>

          <div className="text-slate-400">

            {isCompleted
              ? "Оплачено"
              : isActive
                ? "Следующая оплата"
                : "Было к оплате"}

          </div>

          <div className="mt-1 font-medium">

            {isCompleted
              ? `${Number(client.amount || 0).toLocaleString("ru-RU")} ₽`
              : client.nextPaymentDate || "Не указана"}

          </div>

        </div>

        <div className="text-right">

          <div className="text-slate-400">

            Статус

          </div>

          <div className="mt-1 font-bold">

            <StatusBadge
              variant={variant}
              overdue={client.overdue}
            />

          </div>

        </div>

      </div>

      {isActive && (
        <>
          <BluesalesScheduleBlock
            client={client}
            onCopy={onCopy}
          />

          {onMarkChurned && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  onMarkChurned(client)
                }
                className="
                  px-3 py-1.5 rounded-lg text-sm
                  bg-slate-800 text-slate-300
                  hover:bg-slate-700 transition-colors
                "
              >
                Перенести в слив
              </button>
            </div>
          )}
        </>
      )}

      {variant === SUBSCRIPTION_OUTCOMES.CHURNED && (
        <p className="mt-4 text-sm text-slate-500">
          Ученик отказался продолжать оплату.
          {client.remain > 0 && (
            <>
              {" "}
              Неоплаченный остаток:{" "}
              {client.remain.toLocaleString("ru-RU")} ₽
            </>
          )}
        </p>
      )}
    </div>
  );
}
