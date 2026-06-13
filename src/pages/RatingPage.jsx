import { useEffect, useState } from "react";

import {
  getAllClients,
  resolveManagerDisplayName,
} from "../services/clientService";

import LoadingState
from "../components/LoadingState";

export default function RatingPage({
  embedded = false,
}) {

  const [rating, setRating] = useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadRating();
  }, []);

  const loadRating = async () => {

    setLoading(true);

    const clients =
      await getAllClients();

    const managersMap = {};

    clients.forEach((client) => {

      const managerKey =
        client.managerId ||
        client.manager;

      if (!managerKey) {
        return;
      }

      if (!managersMap[managerKey]) {

        managersMap[managerKey] = {
          managerKey,
          manager:
            resolveManagerDisplayName(
              managerKey
            ),
          totalAmount: 0,
          clientsCount: 0,
        };

      }

      managersMap[managerKey].totalAmount +=
        Number(client.amount || 0);

      managersMap[managerKey].clientsCount += 1;

    });

    const sortedManagers = Object.values(
      managersMap
    ).sort(
      (a, b) =>
        b.totalAmount - a.totalAmount
    );

    setRating(sortedManagers);
    setLoading(false);

  };

  if (loading) {

    return (
      <LoadingState message="Загрузка рейтинга..." />
    );

  }

  return (

    <div>

      {!embedded && (
        <h1 className="text-4xl font-bold mb-8">
          Рейтинг менеджеров
        </h1>
      )}

      <div className="grid gap-4">

        {rating.map((manager, index) => (

          <div
            key={manager.managerKey}
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
