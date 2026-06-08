import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth }
from "../context/AuthContext";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../services/firebase";


export default function DealsPage() {
  const { userData } = useAuth();

  const [clients, setClients] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [filterManager, setFilterManager] =
    useState("");

    const [payments, setPayments] =
  useState([]);

  useEffect(() => {
    loadDeals();
    loadPayments();
  }, []);

  async function loadPayments() {

  const snapshot =
    await getDocs(
      collection(db, "payments")
    );

  const paymentsData = [];

  snapshot.forEach((doc) => {

    paymentsData.push({
      id: doc.id,
      ...doc.data(),
    });

  });

  paymentsData.sort(

    (a, b) =>

      b.createdAt -
      a.createdAt

  );

  setPayments(
    paymentsData.slice(0, 10)
  );

}

  const loadDeals = async () => {

    const querySnapshot = await getDocs(
      collection(db, "clients")
    );

    const deals = [];

    querySnapshot.forEach((doc) => {

      deals.push({
        id: doc.id,
        ...doc.data(),
      });

    });

    setClients(deals);

  };

  const filteredClients = clients.filter(
    (client) => {

      const matchesSearch =

        client.dialogLink
          ?.toLowerCase()
          .includes(
            search.toLowerCase()
          )

        ||

        client.vkLink
          ?.toLowerCase()
          .includes(
            search.toLowerCase()
          )

        ||

        client.manager
          ?.toLowerCase()
          .includes(
            search.toLowerCase()
          );

      const matchesManager =

        filterManager
          ? client.manager ===
            filterManager
          : true;

          const hasAccess =

  userData?.role === "admin"

    ? true

    : client.manager ===
      userData?.name;

      return (
  matchesSearch &&
  matchesManager &&
  hasAccess
);

    }
  );

  return (

    <div>

      <h1 className="text-4xl font-bold mb-8">
        Сделки
      </h1>

      <div className="bg-slate-900 rounded-2xl p-6 mb-8">

        <div className="grid grid-cols-2 gap-4">

          <input
            placeholder="Поиск"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="bg-slate-800 p-3 rounded-xl"
          />

          <select
            value={filterManager}
            onChange={(e) =>
              setFilterManager(
                e.target.value
              )
            }
            className="bg-slate-800 p-3 rounded-xl"
          >

            <option value="">
              Все менеджеры
            </option>

            <option>
              Сергей Г
            </option>

            <option>
              Денис М
            </option>

            <option>
              Андрей В
            </option>

            <option>
              Руслан Р
            </option>

            <option>
              Александр С
            </option>

            <option>
              Полина Пенькова
            </option>

            <option>
              Полина Пламадяла
            </option>

            <option>
              Катя Бакаева
            </option>

            <option>
              Виолетта П
            </option>

          </select>

        </div>

      </div>

      <div className="grid gap-4">

        {filteredClients.map((client) => (

          <Link
  to={`/client/${client.id}`}
  key={client.id}
  className="bg-slate-900 rounded-2xl p-6 block"
>

            <div className="flex justify-between">

              <div>

                <div className="text-2xl font-bold">

                  {client.manager}

                </div>

                <div className="text-slate-400 mt-2">

                  {client.dealType}

                </div>

                <div className="text-slate-400">

                  {client.course}

                </div>

                <div className="text-slate-400">

                  {client.tariff}

                </div>

                <div className="text-slate-400 mt-4 break-all">

                  {client.dialogLink}

                </div>

              </div>

              <div className="text-right">

                <div className="text-3xl font-bold text-green-400">

                  {client.amount} ₽

                </div>

                <div className="text-slate-400 mt-2">

                  Бюджет:

                  {" "}

                  {client.budget} ₽

                </div>

                <div className="mt-4">

                  {Number(client.amount) >=
                  Number(client.budget)

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
            className="bg-slate-900 p-4 rounded-2xl"
          >

            <div className="font-bold">

              {

                payment.clientName

              }

            </div>

            <div className="text-slate-400 mt-2">

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

              </div>

            </div>

          </Link>

        ))}

      </div>

    </div>

  );

}