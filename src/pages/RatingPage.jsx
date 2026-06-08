import { useEffect, useState } from "react";
import { useAuth }
from "../context/AuthContext";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../services/firebase";

export default function RatingPage() {
  const { userData } = useAuth();

  const [rating, setRating] = useState([]);

  useEffect(() => {
    loadRating();
  }, []);

  const loadRating = async () => {

    const querySnapshot = await getDocs(
      collection(db, "clients")
    );

    const clients = [];

    querySnapshot.forEach((doc) => {
      clients.push(doc.data());
    });

    const managersMap = {};

    clients.forEach((client) => {

      if (!managersMap[client.manager]) {

        managersMap[client.manager] = {
          manager: client.manager,
          totalAmount: 0,
          clientsCount: 0,
        };

      }

      managersMap[client.manager].totalAmount +=
        Number(client.amount || 0)

      managersMap[client.manager].clientsCount += 1;

    });

    const sortedManagers = Object.values(
      managersMap
    ).sort(
      (a, b) =>
        b.totalAmount - a.totalAmount
    );

    const finalRating =

  userData?.role === "admin"

    ? sortedManagers

    : sortedManagers.filter(
        (manager) =>
          manager.manager ===
          userData?.name
      );

setRating(finalRating);

  };

  return (

    <div>

      <h1 className="text-4xl font-bold mb-8">
        Рейтинг менеджеров
      </h1>

      <div className="grid gap-4">

        {rating.map((manager, index) => (

          <div
            key={manager.manager}
            className="bg-slate-900 rounded-2xl p-6 flex justify-between items-center"
          >

            <div>

              <div className="text-2xl font-bold">

                #{index + 1}

                {" "}

                {manager.manager}

              </div>

              <div className="text-slate-400 mt-2">

                Клиентов:

                {" "}

                {manager.clientsCount}

              </div>

            </div>

            <div className="text-right">

              <div className="text-3xl font-bold text-green-400">

                {manager.totalAmount} ₽

              </div>

            </div>

          </div>

        ))}

      </div>

    </div>

  );

}