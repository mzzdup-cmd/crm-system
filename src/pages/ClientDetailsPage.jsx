import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

import {
  doc,
  getDoc,
  collection,
  getDocs,
} from "firebase/firestore";

import { db }
from "../services/firebase";

import {
  Link,
} from "react-router-dom";


export default function ClientDetailsPage() {

  const { id } =
    useParams();

  const [client, setClient] =
    useState(null);

  const [payments, setPayments] =
    useState([]);

  useEffect(() => {

    loadClient();
    loadPayments();

  }, []);

  async function loadClient() {

    const ref = doc(
      db,
      "clients",
      id
    );

    const snapshot =
      await getDoc(ref);

    if (
      snapshot.exists()
    ) {

      setClient({

        id:
          snapshot.id,

        ...snapshot.data(),

      });

    }

  }

  async function loadPayments() {

    const snapshot =
      await getDocs(
        collection(db, "payments")
      );

    const data = [];

    snapshot.forEach((doc) => {

      const payment = {

        id: doc.id,
        ...doc.data(),

      };

      if (
        payment.clientId === id
      ) {

        data.push(payment);

      }

    });

    data.sort(

      (a, b) =>

        b.createdAt -
        a.createdAt

    );

    setPayments(data);

  }

  if (!client) {

    return (
      <div>
        Загрузка...
      </div>
    );

  }

  const remain =

    Number(
      client.budget || 0
    )

    -

    Number(
      client.amount || 0
    );

  return (

    <div>

      <div className="flex justify-between items-start">

        <div>

          <h1 className="text-5xl font-bold">

            {

              client.name ||
              "Без имени"

            }

          </h1>

          <div className="text-slate-400 mt-4 text-xl">

            {

              client.course

            }

          </div>

          <div className="flex gap-4 mt-6">

            <Link

  to={

    `/new-payment?client=${client.id}`

  }

  className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-xl font-bold"

>

  + Добавить оплату

</Link>

  {

    client.dialogLink && (

      <a

        href={client.dialogLink}

        target="_blank"

        rel="noreferrer"

        className="bg-cyan-500 hover:bg-cyan-600 px-6 py-3 rounded-xl font-bold"

      >

        Открыть диалог

      </a>

    )

  }

  {

    client.vkLink && (

      <a

        href={client.vkLink}

        target="_blank"

        rel="noreferrer"

        className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-xl font-bold"

      >

        VK клиента

      </a>

    )

  }

</div>

        </div>

        <div className="text-right">

          <div className="text-slate-400">

            Остаток

          </div>

          <div className="text-4xl font-bold text-yellow-400 mt-2">

            {remain} ₽

          </div>

        </div>

      </div>

      <div className="grid grid-cols-4 gap-6 mt-10">

        <div className="bg-slate-900 p-6 rounded-2xl">

          <div className="text-slate-400">

            Бюджет

          </div>

          <div className="text-3xl font-bold mt-2">

            {

              client.budget || 0

            }

            ₽

          </div>

        </div>

        <div className="bg-slate-900 p-6 rounded-2xl">

          <div className="text-slate-400">

            Оплачено

          </div>

          <div className="text-3xl font-bold text-green-400 mt-2">

            {

              client.amount || 0

            }

            ₽

          </div>

        </div>

        <div className="bg-slate-900 p-6 rounded-2xl">

          <div className="text-slate-400">

            Следующая оплата

          </div>

          <div className="text-2xl font-bold text-cyan-400 mt-2">

            {

              client.nextPaymentDate ||

              "Нет"

            }

          </div>

        </div>

        <div className="bg-slate-900 p-6 rounded-2xl">

          <div className="text-slate-400">

            Тариф

          </div>

          <div className="text-2xl font-bold mt-2">

            {

              client.tariff ||

              "—"

            }

          </div>

        </div>

      </div>

      <div className="mt-12">

        <h2 className="text-3xl font-bold mb-6">

          История оплат

        </h2>

        <div className="space-y-4">

          {

            payments.map(
              (payment) => (

                <div
                  key={payment.id}
                  className="bg-slate-900 p-6 rounded-2xl"
                >

                  <div className="flex justify-between items-center">

                    <div>

                      <div className="text-xl font-bold">

                        {

                          payment.dealType

                        }

                      </div>

                      <div className="text-slate-400 mt-2">

                        {

                          payment.paymentSystem

                        }

                      </div>

                    </div>

                    <div className="text-right">

                      <div className="text-3xl font-bold text-green-400">

                        {

                          payment.amount

                        }

                        ₽

                      </div>

                      <div className="text-slate-400 mt-2">

                        {

                          payment.paymentDate

                        }

                      </div>

                    </div>

                  </div>

                  {

                    payment.comment && (

                      <div className="mt-4 bg-slate-800 p-4 rounded-xl">

                        {

                          payment.comment

                        }

                      </div>

                    )

                  }

                </div>

              )
            )

          }

        </div>

      </div>

    </div>

  );

}