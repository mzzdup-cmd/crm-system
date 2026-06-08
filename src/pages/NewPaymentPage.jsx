import {
  useState,
  useEffect,
} from "react";

import {
  useSearchParams,
} from "react-router-dom";

import { db }
from "../services/firebase";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
} from "firebase/firestore";

const dealTypes = [

  "Новая",
  "Доплата Новая",
  "Отказ Новая",

  "ББ",
  "Доплата ББ",
  "Отказ ББ",

  "Апсэйл",
  "Доплата Апсэйл",
  "Отказ Апсэйл",

  "Рассылка",
  "Доплата Рассылка",
  "Отказ Рассылка",

  "Доплата ПО",

  "Возврат",

];

export default function NewPaymentPage() {

  const [searchParams] =
    useSearchParams();

  const clientId =
    searchParams.get(
      "client"
    );

  const [dealType, setDealType] =
    useState("");

  const [dialogLink, setDialogLink] =
    useState("");

  const [foundClient, setFoundClient] =
    useState(null);

  const [paymentAmount, setPaymentAmount] =
    useState("");

  const [paymentSystem, setPaymentSystem] =
    useState("");

  const [invoiceNumber, setInvoiceNumber] =
    useState("");

  const [comment, setComment] =
    useState("");

  const [manager, setManager] =
    useState("");

  const [paymentDate, setPaymentDate] =
    useState("");

  const [course, setCourse] =
    useState("");

  const [budget, setBudget] =
    useState("");

  const [amount, setAmount] =
    useState("");

  useEffect(() => {

    if (clientId) {

      loadClientById(
        clientId
      );

    }

  }, []);

  const isNewClient =

    dealType === "Новая" ||
    dealType === "ББ" ||
    dealType === "Рассылка";

  function getStartDate(
    dateString
  ) {

    if (!dateString)
      return "";

    const date =
      new Date(dateString);

    const day =
      date.getDay();

    const diff =

      day === 0

        ? -6

        : 1 - day;

    date.setDate(
      date.getDate() + diff
    );

    return date
      .toISOString()
      .split("T")[0];

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

  async function loadClientById(
    id
  ) {

    const snapshot =
      await getDocs(
        collection(db, "clients")
      );

    snapshot.forEach((doc) => {

      const client = {

        id: doc.id,
        ...doc.data(),

      };

      if (
        client.id === id
      ) {

        setFoundClient(
          client
        );

        setDialogLink(
          client.dialogLink || ""
        );

        setDealType(
          "Доплата Новая"
        );

      }

    });

  }

  async function findClient(
    link
  ) {

    setDialogLink(link);

    const snapshot =
      await getDocs(
        collection(db, "clients")
      );

    let clientFound = null;

    snapshot.forEach((doc) => {

      const client = {
        id: doc.id,
        ...doc.data(),
      };

      if (
        client.dialogLink === link
      ) {

        clientFound = client;

      }

    });

    setFoundClient(clientFound);

  }

  async function addPayment() {

    if (!foundClient)
      return;

    const newAmount =

      Number(
        foundClient.amount || 0
      )

      +

      Number(paymentAmount);

    const remain =

      Number(
        foundClient.budget || 0
      )

      -

      newAmount;

    const clientRef = doc(
      db,
      "clients",
      foundClient.id
    );

    await addDoc(

      collection(db, "payments"),

      {

        clientId:
          foundClient.id,

        clientName:
          foundClient.name,

        course:
          foundClient.course,

        tariff:
          foundClient.tariff,

        dealType,

        amount:
          Number(paymentAmount),

        paymentSystem,

        invoiceNumber,

        comment,

        manager,

        paymentDate,

        createdAt:
          Date.now(),

      }

    );

    await updateDoc(clientRef, {

      amount: newAmount,

      nextPaymentDate:

        remain > 0

          ? getNextPaymentDate(
              paymentDate
            )

          : null,

    });

    alert(
      "Оплата добавлена 😄"
    );

  }

  return (

    <div>

      <h1 className="text-4xl font-bold mb-8">

        Новая оплата

      </h1>

      <div className="bg-slate-900 p-6 rounded-2xl max-w-2xl">

        <div className="mb-6">

          <div className="mb-2 text-slate-400">

            Тип сделки

          </div>

          <select

            value={dealType}

            onChange={(e) =>
              setDealType(
                e.target.value
              )
            }

            className="w-full bg-slate-800 p-4 rounded-xl"

          >

            <option value="">

              Выберите тип сделки

            </option>

            {

              dealTypes.map(
                (type) => (

                  <option
                    key={type}
                    value={type}
                  >

                    {type}

                  </option>

                )
              )

            }

          </select>

        </div>

        {

          !isNewClient && (

            <div className="mt-6">

              <div className="bg-slate-900 p-6 rounded-2xl">

                <div className="text-2xl font-bold mb-4">

                  Поиск клиента

                </div>

                <input
                  placeholder="Вставьте ссылку на диалог"

                  value={dialogLink}

                  onChange={(e) =>
                    findClient(
                      e.target.value
                    )
                  }

                  className="w-full bg-slate-800 p-4 rounded-xl"
                />

                {

                  foundClient && (

                    <div className="mt-4 bg-slate-800 p-4 rounded-xl">

                      <div className="text-green-400 font-bold">

                        Клиент найден ✅

                      </div>

                      <div className="mt-4 space-y-2">

                        <div>

                          <span className="text-slate-400">

                            Клиент:

                          </span>

                          {" "}

                          {foundClient.name}

                        </div>

                        <div>

                          <span className="text-slate-400">

                            Курс:

                          </span>

                          {" "}

                          {foundClient.course}

                        </div>

                        <div>

                          <span className="text-slate-400">

                            Остаток:

                          </span>

                          {" "}

                          {

                            Number(
                              foundClient.budget || 0
                            )

                            -

                            Number(
                              foundClient.amount || 0
                            )

                          }

                          ₽

                        </div>

                      </div>

                      <div className="mt-6 space-y-4">

                        <input
                          type="date"

                          value={paymentDate}

                          onChange={(e) =>
                            setPaymentDate(
                              e.target.value
                            )
                          }

                          className="w-full bg-slate-900 p-4 rounded-xl"
                        />

                        <input
                          placeholder="Сумма оплаты"

                          value={paymentAmount}

                          onChange={(e) =>
                            setPaymentAmount(
                              e.target.value
                            )
                          }

                          className="w-full bg-slate-900 p-4 rounded-xl"
                        />

                        <select

                          value={paymentSystem}

                          onChange={(e) =>
                            setPaymentSystem(
                              e.target.value
                            )
                          }

                          className="w-full bg-slate-900 p-4 rounded-xl"

                        >

                          <option value="">

                            Платежная система

                          </option>

                          <option>

                            Продамус

                          </option>

                          <option>

                            Юкасса

                          </option>

                          <option>

                            CloudPayments

                          </option>

                          <option>

                            Робокасса

                          </option>

                          <option>

                            Крипта

                          </option>

                        </select>

                        {

                          paymentSystem !==
                          "Крипта" && (

                            <input
                              placeholder="Номер счета"

                              value={invoiceNumber}

                              onChange={(e) =>
                                setInvoiceNumber(
                                  e.target.value
                                )
                              }

                              className="w-full bg-slate-900 p-4 rounded-xl"
                            />

                          )

                        }

                        {

                          paymentDate && (

                            <div className="bg-slate-800 p-4 rounded-xl">

                              <div className="text-slate-400 mb-2">

                                Дата старта

                              </div>

                              <div className="text-xl font-bold text-cyan-400">

                                {

                                  getStartDate(
                                    paymentDate
                                  )

                                }

                              </div>

                            </div>

                          )

                        }

                        <select

                          value={manager}

                          onChange={(e) =>
                            setManager(
                              e.target.value
                            )
                          }

                          className="w-full bg-slate-900 p-4 rounded-xl"

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

                        <textarea
                          placeholder="Комментарий"

                          value={comment}

                          onChange={(e) =>
                            setComment(
                              e.target.value
                            )
                          }

                          className="w-full bg-slate-900 p-4 rounded-xl"
                        />

                        <button
                          onClick={addPayment}
                          className="w-full bg-green-500 hover:bg-green-600 p-4 rounded-xl font-bold"
                        >

                          Добавить оплату

                        </button>

                      </div>

                    </div>

                  )

                }

              </div>

            </div>

          )

        }

      </div>

    </div>

  );

}