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

export default function SalaryPage() {

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

    setPayments(paymentsData);

  }

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

        nightShifts: 0,

        manualBonus: 0,

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

  const salaryData =

    Object.entries(
      managersStats
    ).map(

      ([name, stats]) => {

        const revenue =
          stats.revenue;

        const baseSalary =
          50000;

        const percentBonus =

          Math.round(
            revenue * 0.05
          );

        let revenueBonus =
          0;

        if (
          revenue >= 800000
        ) {

          revenueBonus =
            10000;

        }

        else if (
          revenue >= 700000
        ) {

          revenueBonus =
            5000;

        }

        const nightBonus =

          stats.nightShifts
          * 2000;

        const manualBonus =

          stats.manualBonus;

        const totalSalary =

          baseSalary
          +
          percentBonus
          +
          revenueBonus
          +
          nightBonus
          +
          manualBonus;

        return {

          name,

          revenue,

          deals:
            stats.deals,

          baseSalary,

          percentBonus,

          revenueBonus,

          nightBonus,

          manualBonus,

          totalSalary,

        };

      }

    );

  return (

    <div>

      <h1 className="text-4xl font-bold mb-8">

        Зарплаты

      </h1>

      <div className="space-y-6">

        {

          salaryData.map(
            (manager) => (

              <div
                key={manager.name}
                className="bg-slate-900 p-6 rounded-2xl"
              >

                <div className="flex justify-between items-center">

                  <div>

                    <div className="text-3xl font-bold">

                      {

                        manager.name

                      }

                    </div>

                    <div className="text-slate-400 mt-2">

                      Выручка:

                      {" "}

                      {

                        manager.revenue

                      }

                      ₽

                    </div>

                  </div>

                  <div className="text-4xl font-bold text-green-400">

                    {

                      manager.totalSalary

                    }

                    ₽

                  </div>

                </div>

                <div className="grid grid-cols-2 gap-4 mt-8">

                  <div className="bg-slate-800 p-4 rounded-xl">

                    <div className="text-slate-400">

                      Оклад

                    </div>

                    <div className="text-2xl font-bold mt-2">

                      {

                        manager.baseSalary

                      }

                      ₽

                    </div>

                  </div>

                  <div className="bg-slate-800 p-4 rounded-xl">

                    <div className="text-slate-400">

                      5% от продаж

                    </div>

                    <div className="text-2xl font-bold mt-2">

                      {

                        manager.percentBonus

                      }

                      ₽

                    </div>

                  </div>

                  <div className="bg-slate-800 p-4 rounded-xl">

                    <div className="text-slate-400">

                      Бонус оборота

                    </div>

                    <div className="text-2xl font-bold mt-2 text-yellow-400">

                      {

                        manager.revenueBonus

                      }

                      ₽

                    </div>

                  </div>

                  <div className="bg-slate-800 p-4 rounded-xl">

                    <div className="text-slate-400">

                      Ночные смены

                    </div>

                    <div className="text-2xl font-bold mt-2 text-cyan-400">

                      {

                        manager.nightBonus

                      }

                      ₽

                    </div>

                  </div>

                  <div className="bg-slate-800 p-4 rounded-xl">

                    <div className="text-slate-400">

                      Ручные бонусы

                    </div>

                    <div className="text-2xl font-bold mt-2 text-pink-400">

                      {

                        manager.manualBonus

                      }

                      ₽

                    </div>

                  </div>

                  <div className="bg-green-500/20 p-4 rounded-xl border border-green-500">

                    <div className="text-green-400">

                      ИТОГО

                    </div>

                    <div className="text-3xl font-bold mt-2 text-green-400">

                      {

                        manager.totalSalary

                      }

                      ₽

                    </div>

                  </div>

                </div>

              </div>

            )
          )

        }

      </div>

    </div>

  );

}