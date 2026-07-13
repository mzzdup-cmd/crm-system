import { useAuth }
from "../context/AuthContext";

import {
  useEffect,
  useState,
} from "react";

import { Link }
from "react-router-dom";

import {
  getClientsForUser,
} from "../services/clientService";

import {
  getRemain,
  isOverdue,
  matchesStatusFilter,
} from "../domain/client/clientStatus";

import { MANAGERS } from "../constants/managers";
import { COURSES } from "../constants/courses";

import LoadingState
from "../components/LoadingState";

export default function ClientsPage({
  embedded = false,
}) {

  const { userData } =
    useAuth();

  const [clients, setClients] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [managerFilter, setManagerFilter] =
    useState("");

  const [courseFilter, setCourseFilter] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  useEffect(() => {

    loadClients();

  }, [userData]);

  async function loadClients() {

    if (!userData) {
      return;
    }

    setLoading(true);

    const clientsData =
      await getClientsForUser(userData);

    setClients(clientsData);
    setLoading(false);

  }

  const visibleClients =

    clients.filter((client) => {

      const matchesSearch =

        client.manager
          ?.toLowerCase()

          .includes(
            search.toLowerCase()
          )

        ||

        client.course
          ?.toLowerCase()

          .includes(
            search.toLowerCase()
          );

      const matchesManager =

        managerFilter

          ? client.manager ===
            managerFilter

          : true;

      const matchesCourse =

        courseFilter

          ? client.course ===
            courseFilter

          : true;

      return (
        matchesSearch &&
        matchesManager &&
        matchesCourse &&
        matchesStatusFilter(
          client,
          statusFilter
        )
      );

    });

  if (loading) {

    return (
      <LoadingState message="Загрузка клиентов..." />
    );

  }

  return (

    <div>

      {!embedded && (
        <h1 className="text-4xl font-bold mb-8">
          Клиенты
        </h1>
      )}

      <input

        placeholder="Поиск клиента..."

        value={search}

        onChange={(e) =>
          setSearch(
            e.target.value
          )
        }

        className="w-full bg-surface p-4 rounded-2xl mb-6"

      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">

        <select

          value={managerFilter}

          onChange={(e) =>
            setManagerFilter(
              e.target.value
            )
          }

          className="bg-surface p-4 rounded-2xl"

        >

          <option value="">

            Все менеджеры

          </option>

          {

            MANAGERS.map((manager) => (

              <option
                key={manager.id}
                value={manager.name}
              >

                {manager.name}

              </option>

            ))

          }

        </select>

        <select

          value={courseFilter}

          onChange={(e) =>
            setCourseFilter(
              e.target.value
            )
          }

          className="bg-surface p-4 rounded-2xl"

        >

          <option value="">

            Все курсы

          </option>

          {

            COURSES.map((course) => (

              <option
                key={course}
                value={course}
              >

                {course}

              </option>

            ))

          }

        </select>

        <select

          value={statusFilter}

          onChange={(e) =>
            setStatusFilter(
              e.target.value
            )
          }

          className="bg-surface p-4 rounded-2xl"

        >

          <option value="">

            Все статусы

          </option>

          <option value="paid">

            Оплачено

          </option>

          <option value="subscription">

            Подписка

          </option>

          <option value="overdue">

            Просрочка

          </option>

        </select>

      </div>

      <div className="grid gap-4">

        {

          visibleClients.map(
            (client) => {

              const remain =
                getRemain(client);

              const overdue =
                isOverdue(client);

              return (

                <Link

                  to={`/client/${client.id}`}

                  key={client.id}

                >

                  <div

                    className={`

                      p-6 rounded-2xl transition-all

                      ${

                        overdue

                          ? "bg-red-500/20 border border-red-500"

                          : remain > 0

                          ? "bg-yellow-500/20 border border-yellow-500"

                          : "bg-surface"

                      }

                    `}

                  >

                    <div className="flex justify-between items-start">

                      <div>

                        <div className="text-2xl font-bold mb-2">

                          {

                            client.manager

                          }

                        </div>

                        <div className="text-neutral-400 mb-1">

                          {

                            client.dealType

                          }

                        </div>

                        <div className="text-neutral-400 mb-1">

                          {

                            client.course

                          }

                        </div>

                        <div className="text-neutral-400 mb-1">

                          {

                            client.tariff

                          }

                        </div>

                        <div className="text-neutral-400">

                          {

                            client.paymentSystem

                          }

                        </div>

                        <div className="mt-4">

                          {

                            overdue ? (

                              <div className="text-red-400 font-bold">

                                Просрочка

                              </div>

                            ) : remain > 0 ? (

                              <div className="text-yellow-400 font-bold">

                                Подписка

                              </div>

                            ) : (

                              <div className="text-green-400 font-bold">

                                Оплачено

                              </div>

                            )

                          }

                        </div>

                      </div>

                      <div className="text-right">

                        <div className="text-3xl font-bold text-green-400">

                          {

                            client.amount

                          }

                          ₽

                        </div>

                        <div className="text-neutral-400">

                          Бюджет:

                          {" "}

                          {

                            client.budget

                          }

                          ₽

                        </div>

                        {

                          client.nextPaymentDate && (

                            <div className="mt-2 text-brand text-sm">

                              Следующая оплата:

                              {" "}

                              {

                                client.nextPaymentDate

                              }

                            </div>

                          )

                        }

                      </div>

                    </div>

                  </div>

                </Link>

              );

            }

          )

        }

      </div>

    </div>

  );

}
