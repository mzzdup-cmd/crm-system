import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  Link,
  Navigate,
} from "react-router-dom";

import { useAuth }
from "../context/AuthContext";

import { usePermissions }
from "../hooks/usePermissions";

import {
  getClientByIdForUser,
  updateClient,
} from "../services/clientService";

import { useToast }
from "../context/ToastContext";

import {
  getPaymentsByClientId,
  updatePaymentStartDate,
  updatePaymentCuratorStartDate,
  updatePaymentWithClient,
  deletePayment,
} from "../services/paymentService";

import {
  canEditPayment,
  canDeletePayment,
  canEditPaymentStartDate,
  canEditPaymentCoreFields,
} from "../domain/payment/paymentPermissions";

import {
  canChangePaymentStreamDealType,
} from "../constants/dealTypes";

import {
  formatBookingDate,
} from "../domain/client/bbBookingLogic";

import {
  formatMoney,
} from "../utils/moneyFormat";

import ConfirmModal
from "../components/ui/ConfirmModal";

import PaymentEditModal
from "../components/payments/PaymentEditModal";

import {
  getRemain,
} from "../domain/client/clientStatus";

import LoadingState
from "../components/LoadingState";

import { VkLinkInput }
from "../components/vk/VkLinkInput";


export default function ClientDetailsPage() {

  const { id } =
    useParams();

  const { userData, user, loading: authLoading } = useAuth();
  const toast = useToast();

  const actor = userData
    ? { ...userData, uid: user?.uid }
    : null;

  const { isLeadership } = usePermissions();

  const [client, setClient] =
    useState(null);

  const [vkDraft, setVkDraft] =
    useState("");

  const [savingVk, setSavingVk] =
    useState(false);

  const [payments, setPayments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [denied, setDenied] =
    useState(false);

  const [editPayment, setEditPayment] =
    useState(null);

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  const [savingPayment, setSavingPayment] =
    useState(false);

  useEffect(() => {

    loadClient();
    loadPayments();

  }, [id, userData, authLoading]);

  async function loadClient() {
    if (authLoading) {
      return;
    }

    if (!userData) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const clientData =
        await getClientByIdForUser(
          id,
          userData
        );

      if (!clientData) {
        setDenied(true);
        setLoading(false);
        return;
      }

      setClient(clientData);
      setVkDraft(clientData.vkLink || "");
      setDenied(false);
    } catch (error) {
      console.error(error);
      toast.error(
        error.message ||
          "Ошибка загрузки клиента"
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadPayments() {
    try {
      const data =
        await getPaymentsByClientId(id);

      setPayments(data);
    } catch (error) {
      console.error(error);
      toast.error(
        "Не удалось загрузить оплаты"
      );
    }
  }

  async function handleSavePaymentEdit({
    paymentUpdates,
    clientUpdates,
  }) {
    if (!editPayment || !actor) {
      return;
    }

    setSavingPayment(true);

    try {
      const hasStartDate =
        paymentUpdates.startDate !==
        undefined;
      const hasCuratorStartDate =
        paymentUpdates.curatorStartDate !==
        undefined;
      const hasAmount =
        paymentUpdates.amount !==
        undefined;
      const startDateOnly =
        hasStartDate &&
        !hasAmount &&
        !hasCuratorStartDate;
      const curatorStartDateOnly =
        hasCuratorStartDate &&
        !hasAmount &&
        !hasStartDate;
      const scheduleFieldsOnly =
        hasStartDate &&
        hasCuratorStartDate &&
        !hasAmount;

      let updatedClient = null;

      if (startDateOnly) {
        await updatePaymentStartDate({
          paymentId: editPayment.id,
          startDate:
            paymentUpdates.startDate,
          userData: actor,
        });
      } else if (curatorStartDateOnly) {
        await updatePaymentCuratorStartDate({
          paymentId: editPayment.id,
          curatorStartDate:
            paymentUpdates.curatorStartDate,
          userData: actor,
        });
      } else if (scheduleFieldsOnly) {
        await updatePaymentStartDate({
          paymentId: editPayment.id,
          startDate:
            paymentUpdates.startDate,
          userData: actor,
        });
        await updatePaymentCuratorStartDate({
          paymentId: editPayment.id,
          curatorStartDate:
            paymentUpdates.curatorStartDate,
          userData: actor,
        });
      } else {
        const result =
          await updatePaymentWithClient({
            paymentId: editPayment.id,
            paymentUpdates,
            clientUpdates,
            userData: actor,
          });

        updatedClient = result.client;
      }

      toast.success(
        startDateOnly ||
          curatorStartDateOnly ||
          scheduleFieldsOnly
          ? "Дата старта сохранена"
          : `Оплата обновлена: ${formatMoney(
              paymentUpdates.amount
            )}`
      );

      setEditPayment(null);

      if (updatedClient) {
        setClient(updatedClient);
      }

      await Promise.all([
        loadPayments(),
        loadClient(),
      ]);
    } catch (error) {
      console.error(error);
      const code = error?.code || "";
      toast.error(
        code === "permission-denied"
          ? "Не удалось сохранить дату старта. Обновите страницу (Ctrl+F5) и попробуйте снова."
          : error.message ||
              "Не удалось сохранить"
      );
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleDeletePayment() {
    if (!deleteTarget || !actor) {
      return;
    }

    setSavingPayment(true);

    try {
      const result = await deletePayment({
        paymentId: deleteTarget.id,
        userData: actor,
      });

      toast.success(
        `Оплата удалена: ${formatMoney(
          deleteTarget.amount
        )}`
      );

      setDeleteTarget(null);

      if (result.client) {
        setClient(result.client);
      }

      await loadPayments();
    } catch (error) {
      console.error(error);
      toast.error(
        error.message ||
          "Не удалось удалить"
      );
    } finally {
      setSavingPayment(false);
    }
  }

  async function saveVkLink() {
    if (!client || !vkDraft.trim()) {
      return;
    }

    setSavingVk(true);

    try {
      await updateClient(client.id, {
        vkLink: vkDraft.trim(),
      });

      setClient({
        ...client,
        vkLink: vkDraft.trim(),
      });

      toast.success(
        "VK ссылка сохранена"
      );
    } catch (error) {
      toast.error(
        error.message ||
          "Не удалось сохранить"
      );
    } finally {
      setSavingVk(false);
    }
  }

  if (loading) {

    return (
      <LoadingState message="Загрузка клиента..." />
    );

  }

  if (denied || !client) {

    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );

  }

  const remain =
    getRemain(client);

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

          <div className="text-neutral-400 mt-4 text-xl">

            {

              client.course

            }

          </div>

          <div className="flex gap-4 mt-6">

            <Link

  to={

    `/new-payment?client=${client.id}`

  }

  className="crm-btn-primary hover:opacity-90 px-6 py-3 rounded-xl font-bold"

>

  + Добавить оплату

</Link>

  {

    client.dialogLink && (

      <a

        href={client.dialogLink}

        target="_blank"

        rel="noreferrer"

        className="bg-brand hover:bg-brand-muted px-6 py-3 rounded-xl font-bold"

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

        className="text-brand hover:underline break-all text-sm max-w-md"

      >

        {client.vkLink}

      </a>

    )

  }

          </div>

          {!client.vkLink && (
            <div className="mt-6 bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl max-w-xl">
              <div className="font-bold text-amber-300 mb-2">
                Нужно дозаполнить VK
              </div>
              <p className="text-sm text-neutral-400 mb-4">
                Добавьте ссылку — напоминание
                закроется автоматически
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <VkLinkInput
                    value={vkDraft}
                    onChange={setVkDraft}
                    placeholder="https://vk.com/..."
                    className="
                      w-full bg-surface-raised
                      p-3 rounded-xl
                    "
                  />
                </div>
                <button
                  type="button"
                  onClick={saveVkLink}
                  disabled={
                    savingVk ||
                    !vkDraft.trim()
                  }
                  className="
                    bg-amber-500 hover:bg-amber-600
                    px-6 py-3 rounded-xl font-bold
                    disabled:opacity-50
                  "
                >
                  {savingVk
                    ? "Сохранение..."
                    : "Сохранить VK"}
                </button>
              </div>
            </div>
          )}

        </div>

        <div className="text-right">

          <div className="text-neutral-400">

            Остаток

          </div>

          <div className="text-4xl font-bold text-yellow-400 mt-2">

            {remain} ₽

          </div>

        </div>

      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mt-8 md:mt-10">

        <div className="bg-surface p-6 rounded-2xl">

          <div className="text-neutral-400">

            Бюджет

          </div>

          <div className="text-3xl font-bold mt-2">

            {

              client.budget || 0

            }

            ₽

          </div>

        </div>

        <div className="bg-surface p-6 rounded-2xl">

          <div className="text-neutral-400">

            Оплачено

          </div>

          <div className="text-3xl font-bold text-green-400 mt-2">

            {

              client.amount || 0

            }

            ₽

          </div>

        </div>

        <div className="bg-surface p-6 rounded-2xl">

          <div className="text-neutral-400">

            Следующая оплата

          </div>

          <div className="text-2xl font-bold text-brand mt-2">

            {

              client.nextPaymentDate ||

              "Нет"

            }

          </div>

        </div>

        <div className="bg-surface p-6 rounded-2xl">

          <div className="text-neutral-400">

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
              (payment) => {
                const editable =
                  canEditPayment(
                    payment,
                    userData
                  );
                const canEditStartDate =
                  canEditPaymentStartDate(
                    payment,
                    userData
                  );
                const canChangeStream =
                  canChangePaymentStreamDealType(
                    payment.dealType
                  ) ||
                  canChangePaymentStreamDealType(
                    payment.dealTypeId
                  );
                const canEditCoreFields =
                  canEditPaymentCoreFields(
                    payment,
                    userData
                  );
                const showEditActions =
                  editable ||
                  canEditStartDate ||
                  canEditCoreFields;
                const streamLabel =
                  payment.startDate
                    ? formatBookingDate(
                        payment.startDate
                      )
                    : canChangeStream
                      ? "не указан"
                      : "—";

                return (
                <div
                  key={payment.id}
                  className="bg-surface p-6 rounded-2xl"
                >

                  <div className="flex justify-between items-center">

                    <div>

                      <div className="text-xl font-bold">

                        {

                          payment.dealType

                        }

                      </div>

                      <div className="text-neutral-400 mt-2">

                        {

                          payment.paymentSystem

                        }

                      </div>

                      {canChangeStream && (
                        <div className="text-neutral-500 mt-1 text-sm">
                          Поток: {streamLabel}
                        </div>
                      )}

                    </div>

                    <div className="text-right">

                      <div className="text-3xl font-bold text-green-400">

                        {

                          formatMoney(
                            payment.amount,
                            {
                              withCurrency: false,
                            }
                          )

                        }

                        ₽

                      </div>

                      <div className="text-neutral-400 mt-2">

                        {

                          payment.paymentDate

                        }

                      </div>

                    </div>

                  </div>

                  {

                    payment.comment && (

                      <div className="mt-4 bg-surface-raised p-4 rounded-xl">

                        {

                          payment.comment

                        }

                      </div>

                    )

                  }

                  <div className="mt-4 flex flex-wrap gap-3">
                    {showEditActions && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditPayment(
                            payment
                          )
                        }
                        className="
                          px-4 py-2 rounded-xl
                          bg-brand-muted hover:bg-brand-dim
                          text-sm font-semibold
                        "
                      >
                        {canEditStartDate &&
                        !editable
                          ? payment.startDate
                            ? "Изменить поток"
                            : "Указать поток"
                          : "Редактировать"}
                      </button>
                    )}

                    {canDeletePayment(
                      payment,
                      userData
                    ) && (
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget(
                            payment
                          )
                        }
                        className="
                          px-4 py-2 rounded-xl
                          bg-red-600/80 hover:bg-red-600
                          text-sm font-semibold
                        "
                      >
                        Удалить
                      </button>
                    )}
                  </div>

                </div>
                );
              }
            )

          }

        </div>

      </div>

      <PaymentEditModal
        open={Boolean(editPayment)}
        payment={editPayment}
        userData={userData}
        isAdmin={isLeadership}
        saving={savingPayment}
        onSave={handleSavePaymentEdit}
        onClose={() =>
          setEditPayment(null)
        }
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Удалить оплату?"
        message={
          deleteTarget
            ? `${formatMoney(
                deleteTarget.amount
              )} — сумма клиента будет пересчитана.`
            : ""
        }
        confirmLabel="Удалить"
        loading={savingPayment}
        onConfirm={handleDeletePayment}
        onCancel={() =>
          setDeleteTarget(null)
        }
      />

    </div>

  );

}
