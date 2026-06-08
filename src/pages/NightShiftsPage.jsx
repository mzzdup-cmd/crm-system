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

export default function NightShiftsPage() {

  const [manager, setManager] =
    useState("");

  const [date, setDate] =
    useState("");

  const [shifts, setShifts] =
    useState([]);

  useEffect(() => {

    loadShifts();

  }, []);

  async function loadShifts() {

    const snapshot =
      await getDocs(
        collection(db, "nightShifts")
      );

    const data = [];

    snapshot.forEach((doc) => {

      data.push({
        id: doc.id,
        ...doc.data(),
      });

    });

    setShifts(data);

  }

  async function addShift() {

    if (
      !manager ||
      !date
    ) return;

    await addDoc(

      collection(
        db,
        "nightShifts"
      ),

      {

        manager,

        date,

        amount: 2000,

        createdAt:
          Date.now(),

      }

    );

    setManager("");
    setDate("");

    loadShifts();

  }

  return (

    <div>

      <h1 className="text-4xl font-bold mb-8">

        Ночные смены

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
          type="date"

          value={date}

          onChange={(e) =>
            setDate(
              e.target.value
            )
          }

          className="w-full bg-slate-800 p-4 rounded-xl mb-4"
        />

        <button

          onClick={addShift}

          className="w-full bg-cyan-500 hover:bg-cyan-600 p-4 rounded-xl font-bold"

        >

          Добавить смену

        </button>

      </div>

      <div className="mt-10 space-y-4">

        {

          shifts.map(
            (shift) => (

              <div
                key={shift.id}
                className="bg-slate-900 p-4 rounded-2xl flex justify-between"
              >

                <div>

                  <div className="font-bold text-xl">

                    {

                      shift.manager

                    }

                  </div>

                  <div className="text-slate-400 mt-2">

                    {

                      shift.date

                    }

                  </div>

                </div>

                <div className="text-cyan-400 font-bold text-2xl">

                  +2000 ₽

                </div>

              </div>

            )
          )

        }

      </div>

    </div>

  );

}