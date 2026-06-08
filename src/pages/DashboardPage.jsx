import {
  useEffect,
  useState,
} from "react";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db }
from "../services/firebase";

import { useAuth }
from "../context/AuthContext";

export default function DashboardPage() {

  const { userData } =
    useAuth();

  const [clients, setClients] =
    useState([]);

  const [payments, setPayments] =
    useState([]);

  useEffect(() => {

    loadClients();
    loadPayments();

  }, []);

  async function loadClients() {

    const querySnapshot =
      await getDocs(
        collection(db, "clients")
      );

    const data = [];

    querySnapshot.forEach((doc) => {

      data.push({
        id: doc.id,
        ...doc.data(),
      });

    });

    setClients(data);

  }

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
      paymentsData
    );

  }

  const visibleClients =
    clients.filter((client) =>

      userData?.role === "admin"

        ? true

        : client.manager ===
          userData?.name
    );

  const totalRevenue =
    visibleClients.reduce(

      (sum, client) =>

        sum +
        Number(
          client.amount || 0
        ),

      0
    );

  const totalDeals =
    visibleClients.length;

  const subscriptions =
    visibleClients.filter(

      (client) =>

        Number(client.amount) <
        Number(client.budget)

    ).length;

  const averageCheck =
    totalDeals

      ? Math.round(
          totalRevenue /
          totalDeals
        )

      : 0;

  const overdueClients =
    visibleClients.filter(
      (client) => {

        if (
          !client.nextPaymentDate
        ) return false;

        const today =
          new Date();

        const paymentDate =
          new Date(
            client.nextPaymentDate
          );

        const isOverdue =

          today > paymentDate;

        const hasDebt =

          Number(client.amount)
          <
          Number(client.budget);

        return (
          isOverdue &&
          hasDebt
        );

      }
    );

  const managersStats = {};

  payments.forEach((payment) => {

    if (!payment.manager)
      return;

    if (
      !managersStats[
        payment.manager
      ]
    ) {

      managersStats[
        payment.manager
      ] = {

        revenue: 0,

        deals: 0,

      };

    }

    managersStats[
      payment.manager
    ].revenue +=

      Number(
        payment.amount || 0
      );

    managersStats[
      payment.manager
    ].deals += 1;

  });

  const leaderboard =

  Object.entries(
    managersStats
  )

  .sort(

    (a, b) =>

      b[1].revenue -
      a[1].revenue

  );

  return (

    <div>

      <h1 className="text-4xl font-bold mb-8">

        Dashboard

      </h1>

      <div className="grid grid-cols-4 gap-6">

        <div className="bg-slate-900 p-6 rounded-2xl">

          <div className="text-slate-400">

            Выручка

          </div>

          <div className="text-3xl font-bold text-green-400 mt-2">

            {totalRevenue} ₽

          </div>

        </div>

        <div className="bg-slate-900 p-6 rounded-2xl">

          <div className="text-slate-400">

            Сделки

          </div>

          <div className="text-3xl font-bold mt-2">

            {totalDeals}

          </div>

        </div>

        <div className="bg-slate-900 p-6 rounded-2xl">

          <div className="text-slate-400">

            Подписки

          </div>

          <div className="text-3xl font-bold text-yellow-400 mt-2">

            {subscriptions}

          </div>

        </div>

        <div className="bg-slate-900 p-6 rounded-2xl">

          <div className="text-slate-400">

            Средний чек

          </div>

          <div className="text-3xl font-bold text-cyan-400 mt-2">

            {averageCheck} ₽

          </div>

        </div>

      </div>

      <div className="mt-10">

        <h2 className="text-2xl font-bold mb-4 text-red-400">

          ⚠️ Просроченные подписки

        </h2>

        {

          overdueClients.length === 0

            ? (

              <div className="text-slate-400">

                Просрочек нет

              </div>

            )

            : (

              <div className="space-y-4">

                {

                  overdueClients.map(
                    (client) => (

                      <div
                        key={client.id}
                        className="bg-slate-900 p-4 rounded-2xl flex justify-between"
                      >

                        <div>

                          <div className="font-bold text-xl">

                            {

                              client.name ||
                              "Без имени"

                            }

                          </div>

                          <div className="text-slate-400">

                            Долг:

                            {" "}

                            {

                              Number(
                                client.budget
                              )

                              -

                              Number(
                                client.amount
                              )

                            }

                            ₽

                          </div>

                        </div>

                        <div className="text-red-400 font-bold">

                          Просрочка

                        </div>

                      </div>

                    )
                  )

                }

              </div>

            )

        }

      </div>

      <div className="mt-10">

        <h2 className="text-2xl font-bold mb-4">

          LIVE FEED

        </h2>

        <div className="space-y-4">

          {

            payments
              .slice(0, 10)
              .map(
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

      <div className="mt-10">

        <h2 className="text-2xl font-bold mb-4">

          KPI Менеджеров

        </h2>

        <div className="mt-10">

  <h2 className="text-2xl font-bold mb-4">

    🏆 Leaderboard

  </h2>

  <div className="space-y-4">

    {

      leaderboard.map(

        ([name, stats], index) => (

          <div
            key={name}
            className="bg-slate-900 p-6 rounded-2xl flex justify-between items-center"
          >

            <div className="flex items-center gap-4">

              <div className="text-4xl">

                {

                  index === 0

                    ? "🥇"

                    : index === 1

                    ? "🥈"

                    : index === 2

                    ? "🥉"

                    : "🏅"

                }

              </div>

              <div>

                <div className="text-2xl font-bold">

                  {name}

                </div>

                <div className="text-slate-400 mt-2">

                  Сделок:

                  {" "}

                  {stats.deals}

                </div>

              </div>

            </div>

            <div className="text-right">

              <div className="text-3xl font-bold text-yellow-400">

                {stats.revenue} ₽

              </div>

            </div>

          </div>

        )

      )

    }

  </div>

</div>

        <div className="space-y-4">

          {

            Object.entries(
              managersStats
            ).map(

              ([name, stats]) => (

                <div
                  key={name}
                  className="bg-slate-900 p-6 rounded-2xl flex justify-between items-center"
                >

                  <div>

                    <div className="text-2xl font-bold">

                      {name}

                    </div>

                    <div className="text-slate-400 mt-2">

                      Сделок:

                      {" "}

                      {stats.deals}

                    </div>

                  </div>

                  <div className="text-right">

                    <div className="text-3xl font-bold text-green-400">

                      {stats.revenue} ₽

                    </div>

                    <div className="text-slate-400 mt-2">

                      Средний чек:

                      {" "}

                      {

                        Math.round(

                          stats.revenue /

                          stats.deals

                        )

                      }

                      ₽

                    </div>

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