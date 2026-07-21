import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth }
from "../context/AuthContext";

import {
  getClientsForUser,
} from "../services/clientService";

import {
  getRecentPaymentsForUser,
} from "../services/paymentService";

import { hasDebt } from "../domain/client/clientStatus";
import {
  clientMatchesSearch,
} from "../domain/client/recordDialogSearch";
import { MANAGERS } from "../constants/managers";

import LoadingState
from "../components/LoadingState";


export default function DealsPage({
  embedded = false,
}) {
  const { userData } = useAuth();

  const [clients, setClients] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [filterManager, setFilterManager] =
    useState("");

  const [payments, setPayments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadDeals();
    loadPayments();
  }, [userData]);

  async function loadPayments() {

    if (!userData) {
      return;
    }

    const paymentsData =
      await getRecentPaymentsForUser(
        userData,
        10
      );

    setPayments(paymentsData);

  }

  const loadDeals = async () => {

    if (!userData) {
      return;
    }

    setLoading(true);

    const clientsData =
      await getClientsForUser(userData);

    setClients(clientsData);
    setLoading(false);

  };

  const filteredClients = clients.filter(
    (client) => {

      const matchesSearch =
        clientMatchesSearch(
          client,
          search
        );

      const matchesManager =

        filterManager
          ? client.manager ===
            filterManager
          : true;

      return (
        matchesSearch &&
        matchesManager
      );

    }
  );

  if (loading) {

    return (
      <LoadingState message="Загрузка сделок..." />
    );

  }

  return (

    <div>

      {!embedded && (
        <h1 className="text-4xl font-bold mb-8">
          Сделки
        </h1>
      )}

      <div className="bg-surface rounded-2xl p-6 mb-8">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <input
            placeholder="Поиск"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="bg-surface-raised p-3 rounded-xl"
          />

          <select
            value={filterManager}
            onChange={(e) =>
              setFilterManager(
                e.target.value
              )
            }
            className="bg-surface-raised p-3 rounded-xl"
          >

            <option value="">
              Все менеджеры
            </option>

            {

              MANAGERS.map((manager) => (

                <option
                  key={manager.id}
                  value={manager.name}
                >
                  {manager.name}
                </option>

              ))

            }

          </select>

        </div>

      </div>

      <div className="grid gap-4">

        {filteredClients.map((client) => (

          <Link
            to={`/client/${client.id}`}
            key={client.id}
            className="bg-surface rounded-2xl p-6 block"
          >

            <div className="flex justify-between">

              <div>

                <div className="text-2xl font-bold">

                  {client.name ||
                    "Без имени"}

                </div>

                <div className="text-neutral-500 mt-1 text-sm">

                  {client.manager}

                </div>

                <div className="text-neutral-400 mt-2">

                  {client.dealType}

                </div>

                <div className="text-neutral-400">

                  {client.course}

                </div>

                <div className="text-neutral-400">

                  {client.tariff}

                </div>

                <div className="text-neutral-400 mt-4 break-all">

                  {client.dialogLink}

                </div>

              </div>

              <div className="text-right">

                <div className="text-3xl font-bold text-green-400">

                  {client.amount} ₽

                </div>

                <div className="text-neutral-400 mt-2">

                  Бюджет:

                  {" "}

                  {client.budget} ₽

                </div>

                <div className="mt-4">

                  {!hasDebt(client)

                    ? (
                      <div className="text-green-400 font-bold">
                        Оплачено
                      </div>
                    )

                    : (
                      <div className="text-yellow-400 font-bold">
                        Подписка
                      </div>

                    )}

                </div>

              </div>

            </div>

          </Link>

        ))}

      </div>

      <div className="mt-10">

        <h2 className="text-2xl font-bold mb-4">

          LIVE FEED

        </h2>

        <div className="space-y-4">

          {

            payments.map(
              (payment) => (

                <div
                  key={payment.id}
                  className="bg-surface p-4 rounded-2xl"
                >

                  <div className="font-bold">

                    {

                      payment.clientName

                    }

                  </div>

                  <div className="text-neutral-400 mt-2">

                    {

                      payment.dealType

                    }

                    {" — "}

                    {

                      payment.amount

                    }

                    ₽

                  </div>

                </div>

              )
            )

          }

        </div>

      </div>

    </div>

  );

}
