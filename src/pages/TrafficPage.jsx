import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth }
from "../context/AuthContext";

import { useToast }
from "../context/ToastContext";

import { useTrafficSources }
from "../hooks/useTrafficSources";

import {
  getRecentPayments,
} from "../services/paymentService";

import {
  getAllClients,
} from "../services/clientService";

import {
  addTrafficSource,
} from "../services/trafficSourceService";

import {
  buildTrafficSourceAnalytics,
} from "../domain/traffic/trafficSourceAnalytics";

import {
  filterTrafficSourcesByQuery,
} from "../domain/traffic/trafficSourceSearch";

import PageHeader
from "../components/ui/PageHeader";

import RealtimeIndicator
from "../components/ui/RealtimeIndicator";

import LoadingState
from "../components/LoadingState";

import {
  formatMoney,
} from "../utils/moneyFormat";

function formatPeriod(from, to) {
  if (!from && !to) {
    return "Все даты";
  }

  const fromLabel =
    from || "…";
  const toLabel =
    to || "…";

  return `${fromLabel} – ${toLabel}`;
}

export default function TrafficPage({
  embedded = false,
}) {
  const { user } = useAuth();
  const toast = useToast();

  const {
    sources,
    loading: sourcesLoading,
    connected,
  } = useTrafficSources();

  const [payments, setPayments] =
    useState([]);

  const [clients, setClients] =
    useState([]);

  const [dataLoading, setDataLoading] =
    useState(true);

  const [listQuery, setListQuery] =
    useState("");

  const [newName, setNewName] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [filterSourceId, setFilterSourceId] =
    useState("");

  const [firstContactFrom, setFirstContactFrom] =
    useState("");

  const [firstContactTo, setFirstContactTo] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAnalyticsData() {
      setDataLoading(true);

      try {
        const [
          paymentItems,
          clientItems,
        ] = await Promise.all([
          getRecentPayments(2500),
          getAllClients(),
        ]);

        if (!cancelled) {
          setPayments(paymentItems);
          setClients(clientItems);
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          toast.error(
            "Не удалось загрузить аналитику"
          );
        }
      } finally {
        if (!cancelled) {
          setDataLoading(false);
        }
      }
    }

    loadAnalyticsData();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  const clientsById = useMemo(() => {
    return Object.fromEntries(
      clients.map((client) => [
        client.id,
        client,
      ])
    );
  }, [clients]);

  const filteredSources =
    filterTrafficSourcesByQuery(
      sources,
      listQuery
    );

  const analyticsRows =
    buildTrafficSourceAnalytics({
      payments,
      clientsById,
      filters: {
        sourceId: filterSourceId,
        firstContactFrom,
        firstContactTo,
      },
    });

  async function handleAddSource(event) {
    event.preventDefault();

    const name = newName.trim();

    if (!name) {
      return;
    }

    setSaving(true);

    try {
      await addTrafficSource({
        name,
        createdBy: user?.uid,
      });

      toast.success(
        `Traffic «${name}» добавлен`
      );
      setNewName("");
    } catch (error) {
      toast.error(
        error.message ||
          "Не удалось добавить"
      );
    } finally {
      setSaving(false);
    }
  }

  if (sourcesLoading) {
    return (
      <LoadingState message="Загрузка traffic..." />
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {!embedded && (
        <PageHeader
          title="Traffic"
          subtitle={
            <>
              {sources.length} источников
              <RealtimeIndicator
                connected={connected}
              />
            </>
          }
        />
      )}

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-surface p-5 md:p-6 rounded-2xl space-y-4">
          <h2 className="text-lg font-bold">
            Источники
          </h2>

          <input
            type="search"
            value={listQuery}
            onChange={(event) =>
              setListQuery(
                event.target.value
              )
            }
            placeholder="Поиск по названию..."
            className="w-full bg-surface-raised p-3.5 rounded-xl"
          />

          <form
            onSubmit={handleAddSource}
            className="flex gap-2"
          >
            <input
              value={newName}
              onChange={(event) =>
                setNewName(
                  event.target.value
                )
              }
              placeholder="Новый traffic..."
              className="flex-1 bg-surface-raised p-3.5 rounded-xl"
            />
            <button
              type="submit"
              disabled={saving}
              className="
                px-4 py-3 rounded-xl font-bold
                bg-brand hover:opacity-90
                disabled:opacity-50
              "
            >
              +
            </button>
          </form>

          <div className="max-h-80 overflow-y-auto space-y-1">
            {filteredSources.map(
              (source) => (
                <div
                  key={source.id}
                  className="
                    flex items-center justify-between
                    px-3 py-2 rounded-xl
                    hover:bg-surface-raised/80 text-sm
                  "
                >
                  <span>{source.name}</span>
                </div>
              )
            )}
          </div>
        </div>

        <div className="bg-surface p-5 md:p-6 rounded-2xl space-y-4">
          <h2 className="text-lg font-bold">
            Фильтры аналитики
          </h2>

          <label className="block text-sm">
            <span className="text-neutral-400">
              Traffic
            </span>
            <select
              value={filterSourceId}
              onChange={(event) =>
                setFilterSourceId(
                  event.target.value
                )
              }
              className="mt-1 w-full bg-surface-raised p-3.5 rounded-xl"
            >
              <option value="">
                Все traffic
              </option>
              {sources.map((source) => (
                <option
                  key={source.id}
                  value={source.id}
                >
                  {source.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-neutral-400">
                Первый контакт от
              </span>
              <input
                type="date"
                value={firstContactFrom}
                onChange={(event) =>
                  setFirstContactFrom(
                    event.target.value
                  )
                }
                className="mt-1 w-full bg-surface-raised p-3.5 rounded-xl"
              />
            </label>

            <label className="block text-sm">
              <span className="text-neutral-400">
                Первый контакт до
              </span>
              <input
                type="date"
                value={firstContactTo}
                onChange={(event) =>
                  setFirstContactTo(
                    event.target.value
                  )
                }
                className="mt-1 w-full bg-surface-raised p-3.5 rounded-xl"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="bg-surface p-5 md:p-6 rounded-2xl space-y-4">
        <h2 className="text-lg font-bold">
          Revenue by traffic
        </h2>

        {dataLoading ? (
          <LoadingState message="Считаем аналитику..." />
        ) : analyticsRows.length === 0 ? (
          <p className="text-neutral-400 text-sm">
            Нет продаж по выбранным фильтрам
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-neutral-400 text-left border-b border-neutral-800">
                  <th className="py-3 pr-4">
                    Traffic
                  </th>
                  <th className="py-3 pr-4">
                    Период
                  </th>
                  <th className="py-3 pr-4">
                    Продажи
                  </th>
                  <th className="py-3 pr-4">
                    Выручка
                  </th>
                  <th className="py-3 pr-4">
                    Ср. чек
                  </th>
                  <th className="py-3">
                    Менеджеры
                  </th>
                </tr>
              </thead>
              <tbody>
                {analyticsRows.map((row) => (
                  <tr
                    key={
                      row.sourceId ||
                      row.sourceName
                    }
                    className="border-b border-neutral-800/80"
                  >
                    <td className="py-3 pr-4 font-medium">
                      {row.sourceName}
                    </td>
                    <td className="py-3 pr-4 text-neutral-400">
                      {formatPeriod(
                        firstContactFrom,
                        firstContactTo
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {row.salesCount}
                    </td>
                    <td className="py-3 pr-4 text-green-400">
                      {formatMoney(
                        row.revenue
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {formatMoney(
                        row.averageCheck
                      )}
                    </td>
                    <td className="py-3 text-neutral-300">
                      {row.managers.join(
                        " / "
                      ) || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
