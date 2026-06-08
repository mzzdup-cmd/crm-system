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

export default function SubscriptionsPage() {

  const [clients, setClients] =
    useState([]);

  useEffect(() => {

    loadClients();

  }, []);

  async function loadClients() {

    const snapshot =
      await getDocs(
        collection(db, "clients")
      );

    const clientsData = [];

    snapshot.forEach((doc) => {

      clientsData.push({
        id: doc.id,
        ...doc.data(),
      });

    });

    setClients(clientsData);

  }

  const subscriptions =

    clients.filter((client) => {

      const budget =
        Number(client.budget || 0);

      const amount =
        Number(client.amount || 0);

      return amount < budget;

    });

  function getDaysLeft(
    dateString
  ) {

    if (!dateString)
      return null;

    const today =
      new Date();

    const paymentDate =
      new Date(dateString);

    const diff =

      paymentDate - today;

    return Math.ceil(
      diff /
      (1000 * 60 * 60 * 24)
    );

  }

  return (

    <div>

      <h1 className="text-4xl font-bold mb-8">

        Подписки

      </h1>

      <div className="space-y-4">

        {

          subscriptions.map(
            (client) => {

              const budget =
                Number(
                  client.budget || 0
                );

              const amount =
                Number(
                  client.amount || 0
                );

              const remain =
                budget - amount;

              const daysLeft =
                getDaysLeft(
                  client.nextPaymentDate
                );

              const isOverdue =
                daysLeft < 0;

              return (

                <div
                  key={client.id}
                  className="bg-slate-900 p-6 rounded-2xl"
                >

                  <div className="flex justify-between items-center">

                    <div>

                      <div className="text-2xl font-bold">

                        {

                          client.name ||
                          "Без имени"

                        }

                      </div>

                      <div className="text-slate-400 mt-2">

                        {

                          client.course

                        }

                      </div>

                    </div>

                    <div className="text-right">

                      <div className="text-3xl font-bold text-yellow-400">

                        {remain} ₽

                      </div>

                      <div className="text-slate-400 mt-2">

                        Остаток

                      </div>

                    </div>

                  </div>

                  <div className="mt-6 flex justify-between">

                    <div>

                      <div className="text-slate-400">

                        Следующая оплата

                      </div>

                      <div className="mt-2 text-xl">

                        {

                          client.nextPaymentDate ||
                          "Не указана"

                        }

                      </div>

                    </div>

                    <div className="text-right">

                      <div className="text-slate-400">

                        Статус

                      </div>

                      <div className="mt-2 text-xl font-bold">

                        {

                          isOverdue

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

                </div>

              );

            }
          )

        }

      </div>

    </div>

  );

}