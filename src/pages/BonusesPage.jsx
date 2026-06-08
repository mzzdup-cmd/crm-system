import {
  useEffect,
  useState,
} from "react";

import {
  collection,
  addDoc,
  getDocs,
} from "firebase/firestore";

import { db }
from "../services/firebase";

export default function BonusesPage() {

  const [manager, setManager] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [comment, setComment] =
    useState("");

  const [bonuses, setBonuses] =
    useState([]);

  useEffect(() => {

    loadBonuses();

  }, []);

  async function loadBonuses() {

    const snapshot =
      await getDocs(
        collection(db, "manualBonuses")
      );

    const data = [];

    snapshot.forEach((doc) => {

      data.push({
        id: doc.id,
        ...doc.data(),
      });

    });

    setBonuses(data);

  }

  async function addBonus() {

    if (
      !manager ||
      !amount
    ) return;

    await addDoc(

      collection(
        db,
        "manualBonuses"
      ),

      {

        manager,

        amount:
          Number(amount),

        comment,

        createdAt:
          Date.now(),

      }

    );

    setManager("");
    setAmount("");
    setComment("");

    loadBonuses();

  }

  return (

    <div>

      <h1 className="text-4xl font-bold mb-8">

        Ручные бонусы

      </h1>

      <div className="bg-slate-900 p-6 rounded-2xl max-w-xl">

        <select

          value={manager}

          onChange={(e) =>
            setManager(
              e.target.value
            )
          }

          className="w-full bg-slate-800 p-4 rounded-xl mb-4"

        >

          <option value="">

            Менеджер

          </option>

          <option>

            Катя

          </option>

          <option>

            Руслан

          </option>

          <option>

            Полина

          </option>

        </select>

        <input
          placeholder="Сумма бонуса"

          value={amount}

          onChange={(e) =>
            setAmount(
              e.target.value
            )
          }

          className="w-full bg-slate-800 p-4 rounded-xl mb-4"
        />

        <textarea
          placeholder="Комментарий"

          value={comment}

          onChange={(e) =>
            setComment(
              e.target.value
            )
          }

          className="w-full bg-slate-800 p-4 rounded-xl mb-4"
        />

        <button

          onClick={addBonus}

          className="w-full bg-pink-500 hover:bg-pink-600 p-4 rounded-xl font-bold"

        >

          Добавить бонус

        </button>

      </div>

      <div className="mt-10 space-y-4">

        {

          bonuses.map(
            (bonus) => (

              <div
                key={bonus.id}
                className="bg-slate-900 p-4 rounded-2xl flex justify-between"
              >

                <div>

                  <div className="font-bold text-xl">

                    {

                      bonus.manager

                    }

                  </div>

                  <div className="text-slate-400 mt-2">

                    {

                      bonus.comment ||
                      "Без комментария"

                    }

                  </div>

                </div>

                <div className="text-pink-400 font-bold text-2xl">

                  +{bonus.amount} ₽

                </div>

              </div>

            )
          )

        }

      </div>

    </div>

  );

}