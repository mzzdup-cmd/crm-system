import { useAuth }
from "../context/AuthContext";

import {
  useEffect,
  useState,
} from "react";

import {
  collection,
  addDoc,
  getDocs,
} from "firebase/firestore";

import { Link }
from "react-router-dom";

import { db }
from "../services/firebase";

export default function ClientsPage() {

  const { userData } =
    useAuth();

  const [clients, setClients] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [managerFilter, setManagerFilter] =
    useState("");

  const [courseFilter, setCourseFilter] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  const [form, setForm] =
    useState({

      manager: "",
      dealType: "",
      dialogLink: "",
      vkLink: "",
      amount: "",
      budget: "",
      paymentDate: "",
      startDate: "",
      firstContact: "",
      invoice: "",
      source: "",
      course: "",
      paymentSystem: "",
      email: "",
      tariff: "",
      notes: "",

    });

  useEffect(() => {

    loadClients();

  }, []);

  async function loadClients() {

    const querySnapshot =
      await getDocs(
        collection(db, "clients")
      );

    const clientsData = [];

    querySnapshot.forEach((doc) => {

      clientsData.push({

        id: doc.id,
        ...doc.data(),

      });

    });

    setClients(clientsData);

  }

  function getNextPaymentDate(
    dateString
  ) {

    if (!dateString)
      return "";

    const date =
      new Date(dateString);

    date.setDate(
      date.getDate() + 14
    );

    return date
      .toISOString()
      .split("T")[0];

  }

  async function handleAddClient() {

    if (
      !form.manager ||
      !form.dialogLink ||
      !form.amount
    ) return;

    const newClient = {

      ...form,

      createdAt:
        Date.now(),

      nextPaymentDate:

        Number(form.amount)
          <
        Number(form.budget)

          ? getNextPaymentDate(
              form.paymentDate
            )

          : null,

    };

    const docRef =
      await addDoc(

        collection(
          db,
          "clients"
        ),

        newClient

      );

    setClients([

      {

        id: docRef.id,
        ...newClient,

      },

      ...clients,

    ]);

    setForm({

      manager: "",
      dealType: "",
      dialogLink: "",
      vkLink: "",
      amount: "",
      budget: "",
      paymentDate: "",
      startDate: "",
      firstContact: "",
      invoice: "",
      source: "",
      course: "",
      paymentSystem: "",
      email: "",
      tariff: "",
      notes: "",

    });

  }

  const visibleClients =

    clients.filter((client) => {

      const access =

        userData?.role ===
        "admin"

          ? true

          : client.manager ===
            userData?.name;

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

      const remain =

        Number(
          client.budget || 0
        )

        -

        Number(
          client.amount || 0
        );

      const isOverdue =

        client.nextPaymentDate &&

        new Date() >

        new Date(
          client.nextPaymentDate
        ) &&

        remain > 0;

      const status =

        isOverdue

          ? "overdue"

          : remain > 0

          ? "subscription"

          : "paid";

      const matchesStatus =

        statusFilter

          ? status ===
            statusFilter

          : true;

      return (

        access &&
        matchesSearch &&
        matchesManager &&
        matchesCourse &&
        matchesStatus

      );

    });

  return (

    <div>

      <h1 className="text-4xl font-bold mb-8">

        Клиенты

      </h1>

      <input

        placeholder="Поиск клиента..."

        value={search}

        onChange={(e) =>
          setSearch(
            e.target.value
          )
        }

        className="w-full bg-slate-900 p-4 rounded-2xl mb-6"

      />

      <div className="grid grid-cols-3 gap-4 mb-8">

        <select

          value={managerFilter}

          onChange={(e) =>
            setManagerFilter(
              e.target.value
            )
          }

          className="bg-slate-900 p-4 rounded-2xl"

        >

          <option value="">

            Все менеджеры

          </option>

          <option>

            Катя Бакаева

          </option>

          <option>

            Руслан Р

          </option>

          <option>

            Полина Пенькова

          </option>

        </select>

        <select

          value={courseFilter}

          onChange={(e) =>
            setCourseFilter(
              e.target.value
            )
          }

          className="bg-slate-900 p-4 rounded-2xl"

        >

          <option value="">

            Все курсы

          </option>

          <option>

            Монтаж

          </option>

          <option>

            АЕ

          </option>

          <option>

            3D

          </option>

          <option>

            Ретушь

          </option>

        </select>

        <select

          value={statusFilter}

          onChange={(e) =>
            setStatusFilter(
              e.target.value
            )
          }

          className="bg-slate-900 p-4 rounded-2xl"

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

                Number(
                  client.budget || 0
                )

                -

                Number(
                  client.amount || 0
                );

              const isOverdue =

                client.nextPaymentDate &&

                new Date() >

                new Date(
                  client.nextPaymentDate
                ) &&

                remain > 0;

              return (

                <Link

                  to={`/client/${client.id}`}

                  key={client.id}

                >

                  <div

                    className={`

                      p-6 rounded-2xl transition-all

                      ${

                        isOverdue

                          ? "bg-red-500/20 border border-red-500"

                          : remain > 0

                          ? "bg-yellow-500/20 border border-yellow-500"

                          : "bg-slate-900"

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

                        <div className="text-slate-400 mb-1">

                          {

                            client.dealType

                          }

                        </div>

                        <div className="text-slate-400 mb-1">

                          {

                            client.course

                          }

                        </div>

                        <div className="text-slate-400 mb-1">

                          {

                            client.tariff

                          }

                        </div>

                        <div className="text-slate-400">

                          {

                            client.paymentSystem

                          }

                        </div>

                        <div className="mt-4">

                          {

                            isOverdue ? (

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

                        <div className="text-slate-400">

                          Бюджет:

                          {" "}

                          {

                            client.budget

                          }

                          ₽

                        </div>

                        {

                          client.nextPaymentDate && (

                            <div className="mt-2 text-cyan-400 text-sm">

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