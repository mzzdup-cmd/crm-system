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

export default function PaymentsPage() {

  const [payments, setPayments] =
    useState([]);

  useEffect(() => {

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

    setPayments(paymentsData);

  }

  return (

    <div>

      <h1 className="text-4xl font-bold mb-8">

        История оплат

      </h1>

      <div className="space-y-4">

        {

          payments.map(
            (payment) => (

              <div
                key={payment.id}
                className="bg-slate-900 p-6 rounded-2xl"
              >

                <div className="flex justify-between">

                  <div>

                    <div className="text-2xl font-bold">

                      {

                        payment.clientName ||
                        "Без имени"

                      }

                    </div>

                    <div className="text-slate-400 mt-2">

                      {

                        payment.course

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

                <div className="mt-6 flex justify-between">

                  <div>

                    <div className="text-slate-400">

                      Тип сделки

                    </div>

                    <div className="mt-2">

                      {

                        payment.dealType

                      }

                    </div>

                  </div>

                  <div>

                    <div className="text-slate-400">

                      Платежка

                    </div>

                    <div className="mt-2">

                      {

                        payment.paymentSystem

                      }

                    </div>

                  </div>

                  <div>

                    <div className="text-slate-400">

                      Счет

                    </div>

                    <div className="mt-2">

                      {

                        payment.invoiceNumber ||
                        "—"

                      }

                    </div>

                  </div>

                </div>

                {

                  payment.comment && (

                    <div className="mt-6 bg-slate-800 p-4 rounded-xl">

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

  );

}