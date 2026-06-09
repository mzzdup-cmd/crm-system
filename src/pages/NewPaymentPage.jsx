import {
  useState,
  useEffect,
} from "react";

import {
  useSearchParams,
  useNavigate,
  Link,
} from "react-router-dom";

import { useAuth }
from "../context/AuthContext";

import { useToast }
from "../context/ToastContext";

import {
  getClientByIdForUser,
  findClientByDialogLink,
  addClient,
  updateClient,
} from "../services/clientService";

import {
  createPayment,
  createLegacyPayment,
  createLegacyClientPayment,
} from "../services/paymentService";

import {
  getPendingSaleById,
  confirmPendingSale,
} from "../services/pendingSalesService";

import {
  canConfirmPendingSale,
} from "../domain/pendingSales/pendingSalesLogic";

import {
  resolvePaymentStartDate,
  getDefaultStream,
} from "../domain/client/clientDates";

import {
  getRemain,
} from "../domain/client/clientStatus";

import {
  DEAL_TYPE_OPTIONS,
  getDealTypeLabel,
  hasDealTypeSelected,
  isNewClientDealType,
  isExistingClientDealType,
  isLegacyDealType,
  isBbDealType,
  resolveDealTypeId,
} from "../constants/dealTypes";

import { COURSES } from "../constants/courses";
import { TARIFFS } from "../constants/tariffs";

import {
  PAYMENT_SYSTEMS,
  requiresInvoice,
} from "../constants/paymentSystems";

import {
  MANAGERS,
  getManagerNameById,
} from "../constants/managers";

import PageHeader
from "../components/ui/PageHeader";

import FormSection
from "../components/ui/FormSection";

import LoadingState
from "../components/LoadingState";

import ConfirmModal
from "../components/ui/ConfirmModal";

import MoneyInput
from "../components/ui/MoneyInput";

import StartDateField
from "../components/payments/StartDateField";

import TrafficSourceSelect
from "../components/traffic/TrafficSourceSelect";

import { useTrafficSources }
from "../hooks/useTrafficSources";

import { usePermissions }
from "../hooks/usePermissions";

import {
  addTrafficSource,
} from "../services/trafficSourceService";

import {
  formatMoney,
  parseMoneyNumber,
} from "../utils/moneyFormat";

const inputClass =
  "w-full bg-slate-800 p-3.5 rounded-xl";

function VkLinkHint({ visible }) {
  if (!visible) {
    return null;
  }

  return (
    <p className="text-amber-400/90 text-sm">
      Можно заполнить позже — появится
      напоминание в dashboard
    </p>
  );
}

export default function NewPaymentPage() {
  const { user, userData } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { isAdmin } = usePermissions();
  const {
    sources: trafficSources,
    loading: trafficSourcesLoading,
    hasFirestoreSources,
  } = useTrafficSources();

  const [searchParams] =
    useSearchParams();

  const clientId =
    searchParams.get("client");

  const pendingSaleId =
    searchParams.get("pendingSale");

  const [pendingSale, setPendingSale] =
    useState(null);

  const [loadingPending, setLoadingPending] =
    useState(!!pendingSaleId);

  const [dealTypeId, setDealTypeId] =
    useState("");

  const [dialogLink, setDialogLink] =
    useState("");

  const [foundClient, setFoundClient] =
    useState(null);

  const [clientName, setClientName] =
    useState("");

  const [vkLink, setVkLink] =
    useState("");

  const [course, setCourse] =
    useState("");

  const [tariff, setTariff] =
    useState("");

  const [budget, setBudget] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [firstContact, setFirstContact] =
    useState("");

  const [sourceId, setSourceId] =
    useState("");

  const [sourceName, setSourceName] =
    useState("");

  const [manualStartDate, setManualStartDate] =
    useState("");

  const [selectedStream, setSelectedStream] =
    useState("");

  const [paymentAmount, setPaymentAmount] =
    useState("");

  const [paymentSystem, setPaymentSystem] =
    useState("");

  const [invoiceNumber, setInvoiceNumber] =
    useState("");

  const [clientNote, setClientNote] =
    useState("");

  const [paymentComment, setPaymentComment] =
    useState("");

  const [manager, setManager] =
    useState("");

  const [paymentDate, setPaymentDate] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [confirmSave, setConfirmSave] =
    useState(null);

  const [isLegacyClientMode, setIsLegacyClientMode] =
    useState(false);

  const actor = userData
    ? {
        ...userData,
        uid: user?.uid,
      }
    : null;

  const isNewClient =
    isNewClientDealType(dealTypeId);

  const isExistingClient =
    isExistingClientDealType(dealTypeId);

  const isLegacy =
    isLegacyDealType(dealTypeId);

  const dealTypeKnown =
    hasDealTypeSelected(dealTypeId);

  const isBbDeal =
    isBbDealType(dealTypeId);

  useEffect(() => {
    if (
      userData?.managerId &&
      !pendingSaleId
    ) {
      setManager(
        getManagerNameById(
          userData.managerId
        ) ||
          userData.name ||
          ""
      );
    } else if (
      userData?.name &&
      !pendingSaleId
    ) {
      setManager(userData.name);
    }
  }, [userData, pendingSaleId]);

  useEffect(() => {
    if (clientId && userData) {
      loadClientById(clientId);
    }
  }, [clientId, userData]);

  useEffect(() => {
    if (pendingSaleId && userData) {
      loadPendingSale(pendingSaleId);
    }
  }, [pendingSaleId, userData]);

  useEffect(() => {
    if (
      !paymentDate ||
      isBbDealType(dealTypeId)
    ) {
      return;
    }

    setSelectedStream(
      getDefaultStream(paymentDate)
    );
  }, [paymentDate, dealTypeId]);

  function getSourcePayload() {
    return {
      sourceId: sourceId || null,
      sourceName: sourceName.trim(),
      source: sourceName.trim(),
    };
  }

  function handleSourceChange({
    sourceId: nextId,
    sourceName: nextName,
  }) {
    setSourceId(nextId ? String(nextId) : "");
    setSourceName(nextName || "");
  }

  function validateTrafficSource() {
    if (!sourceId) {
      return "Выберите traffic (откуда)";
    }

    return null;
  }

  async function handleCreateTrafficSource(
    name
  ) {
    return addTrafficSource({
      name,
      createdBy: actor?.uid,
    });
  }

  function applyClientSource(client) {
    if (!client) {
      return;
    }

    setSourceId(client.sourceId || "");
    setSourceName(
      client.sourceName ||
        client.source ||
        ""
    );
    setClientNote(
      client.clientNote || ""
    );
  }

  function getStartDateValue() {
    return resolvePaymentStartDate({
      dealTypeId,
      paymentDate,
      selectedStream,
      manualStartDate,
    });
  }

  function validatePaymentSystemFields() {
    if (!paymentSystem) {
      return "Выберите платежную систему";
    }

    if (
      requiresInvoice(paymentSystem) &&
      !invoiceNumber.trim()
    ) {
      return "Укажите номер счёта";
    }

    return null;
  }

  function validateLegacyClientFields() {
    if (!dialogLink.trim()) {
      return "Укажите ссылку на диалог";
    }

    if (!vkLink.trim()) {
      return "Укажите ссылку VK";
    }

    if (!clientName.trim()) {
      return "Укажите имя клиента";
    }

    if (!clientNote.trim()) {
      return "Укажите ID клиента из БС";
    }

    if (!course) {
      return "Выберите курс";
    }

    if (!tariff) {
      return "Выберите тариф";
    }

    if (!firstContact) {
      return "Укажите дату первого контакта";
    }

    const trafficError =
      validateTrafficSource();

    if (trafficError) {
      return trafficError;
    }

    const paymentSystemError =
      validatePaymentSystemFields();

    if (paymentSystemError) {
      return paymentSystemError;
    }

    return validateCommonFields();
  }

  function validateCommonFields() {
    if (!paymentDate) {
      return "Укажите дату оплаты";
    }

    if (!paymentAmount) {
      return "Укажите сумму оплаты";
    }

    if (isLegacy) {
      if (!manager) {
        return "Выберите менеджера";
      }

      return null;
    }

    if (isBbDeal && !manualStartDate) {
      return "Укажите дату старта для ББ";
    }

    if (
      !isBbDeal &&
      paymentDate &&
      !getStartDateValue()
    ) {
      return "Выберите поток";
    }

    if (!manager) {
      return "Выберите менеджера";
    }

    return null;
  }

  async function loadPendingSale(id) {
    setLoadingPending(true);

    const sale =
      await getPendingSaleById(id);

    if (!sale) {
      setLoadingPending(false);
      toast.error(
        "Временная продажа не найдена"
      );
      return;
    }

    if (
      !canConfirmPendingSale(
        userData,
        sale
      )
    ) {
      setLoadingPending(false);
      toast.error(
        "Нет доступа к этой продаже"
      );
      navigate("/pending-sales");
      return;
    }

    setPendingSale(sale);
    setDialogLink(sale.dialogLink || "");
    setPaymentAmount(
      String(sale.amount || "")
    );
    setPaymentDate(sale.paymentDate || "");
    setPaymentComment(sale.comment || "");
    setManager(
      getManagerNameById(
        sale.ownerManagerId
      ) || ""
    );
    setDealTypeId(
      resolveDealTypeId(
        sale.dealTypeId ||
        sale.dealType ||
        "new"
      )
    );

    if (sale.course) {
      setCourse(sale.course);
    }

    await findClient(sale.dialogLink || "");

    setLoadingPending(false);
  }

  async function loadClientById(id) {
    const client =
      await getClientByIdForUser(
        id,
        userData
      );

    if (!client) {
      return;
    }

    setFoundClient(client);
    applyClientSource(client);
    setDialogLink(client.dialogLink || "");
    setDealTypeId(
      resolveDealTypeId(
        "Доплата Новая"
      )
    );
  }

  async function findClient(link) {
    setDialogLink(link);
    setIsLegacyClientMode(false);

    const client =
      await findClientByDialogLink(
        link,
        userData
      );

    setFoundClient(client);

    if (client) {
      applyClientSource(client);
    }
  }

  function resetAfterSubmit() {
    setPaymentAmount("");
    setPaymentSystem("");
    setInvoiceNumber("");
    setPaymentComment("");
    setClientNote("");
    setPaymentDate("");
    setManualStartDate("");
    setSelectedStream("");
    setIsLegacyClientMode(false);
  }

  function showVkSuccessHint(client) {
    if (client?.vkLink?.trim()) {
      return;
    }

    toast.info(
      "VK можно заполнить позже — напоминание создано"
    );
  }

  async function addLegacyClientPayment() {
    if (!actor) {
      return;
    }

    const validationError =
      validateLegacyClientFields();

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const dealTypeLabel =
        getDealTypeLabel(dealTypeId);

      await createLegacyClientPayment({
        dialogLink,
        vkLink,
        legacyClientName:
          clientName.trim(),
        legacyClientBsId:
          clientNote.trim(),
        course,
        tariff,
        dealType: dealTypeLabel,
        paymentAmount: parseMoneyNumber(
          paymentAmount
        ),
        paymentSystem,
        invoiceNumber,
        comment: paymentComment,
        manager,
        paymentDate,
        startDate: getStartDateValue(),
        firstContactDate: firstContact,
        budget: 0,
        ...getSourcePayload(),
        userData: actor,
      });

      toast.success(
        `Оплата сохранена: ${formatMoney(
          paymentAmount
        )}`
      );

      setClientName("");
      setVkLink("");
      setCourse("");
      setTariff("");
      setFirstContact("");
      setSourceId("");
      setSourceName("");
      setDialogLink("");
      resetAfterSubmit();
    } catch (error) {
      console.error(error);
      toast.error(
        error.message ||
          "Ошибка при сохранении"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function addLegacyPayment() {
    if (!actor) {
      return;
    }

    if (!dialogLink.trim()) {
      toast.error(
        "Укажите ссылку на диалог"
      );
      return;
    }

    const validationError =
      validateCommonFields();

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const dealTypeLabel =
        getDealTypeLabel(dealTypeId);

      await createLegacyPayment({
        dialogLink,
        dealType: dealTypeLabel,
        paymentAmount: parseMoneyNumber(
          paymentAmount
        ),
        comment: paymentComment,
        manager,
        paymentDate,
        ...getSourcePayload(),
        userData: actor,
      });

      toast.success(
        `Legacy-оплата сохранена: ${formatMoney(
          paymentAmount
        )}`
      );

      setDialogLink("");
      setPaymentComment("");
    setClientNote("");
      resetAfterSubmit();
    } catch (error) {
      console.error(error);
      toast.error(
        error.message ||
          "Ошибка при сохранении"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function addPaymentToExisting() {
    if (!foundClient || !actor) {
      toast.error(
        "Сначала найдите клиента"
      );
      return;
    }

    if (!dialogLink.trim()) {
      toast.error(
        "Укажите ссылку на диалог"
      );
      return;
    }

    const validationError =
      validateCommonFields();

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const dealTypeLabel =
        getDealTypeLabel(dealTypeId);

      const result = await createPayment({
        client: foundClient,
        dealType: dealTypeLabel,
        paymentAmount: parseMoneyNumber(
          paymentAmount
        ),
        paymentSystem,
        invoiceNumber,
        comment: paymentComment,
        clientNote: clientNote.trim(),
        manager,
        paymentDate,
        startDate: getStartDateValue(),
        ...getSourcePayload(),
        userData: actor,
      });

      if (pendingSaleId) {
        await confirmPendingSale(
          pendingSaleId,
          {
            paymentId:
              result.payment?.id,
          }
        );
      }

      if (pendingSaleId) {
        toast.success(
          "Оплата подтверждена"
        );
        navigate("/pending-sales");
        return;
      }

      if (
        clientNote.trim() !==
        (foundClient.clientNote || "")
      ) {
        await updateClient(
          foundClient.id,
          {
            clientNote:
              clientNote.trim(),
          }
        );
      }

      setFoundClient({
        ...foundClient,
        amount:
          Number(
            foundClient.amount || 0
          ) +
          Number(paymentAmount),
      });

      resetAfterSubmit();
      toast.success(
        `Оплата сохранена: ${formatMoney(
          paymentAmount
        )}`
      );
      showVkSuccessHint(foundClient);
    } catch (error) {
      toast.error(
        error.message ||
          "Ошибка при сохранении"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function addPaymentForNewClient() {
    if (!actor) {
      return;
    }

    if (!dialogLink.trim()) {
      toast.error(
        "Укажите ссылку на диалог"
      );
      return;
    }

    if (!course) {
      toast.error("Выберите курс");
      return;
    }

    if (!budget) {
      toast.error("Укажите бюджет");
      return;
    }

    const trafficError =
      validateTrafficSource();

    if (trafficError) {
      toast.error(trafficError);
      return;
    }

    const validationError =
      validateCommonFields();

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const dealTypeLabel =
        getDealTypeLabel(dealTypeId);

      const startDate =
        getStartDateValue();

      const client = await addClient({
        name:
          clientName.trim() ||
          dialogLink.trim(),
        dialogLink: dialogLink.trim(),
        vkLink: vkLink.trim(),
        course,
        tariff,
        budget: parseMoneyNumber(budget),
        amount: 0,
        email: email.trim(),
        firstContact,
        clientNote: clientNote.trim(),
        manager,
        dealType: dealTypeLabel,
        paymentDate,
        startDate,
        ...getSourcePayload(),
      });

      await createPayment({
        client,
        dealType: dealTypeLabel,
        paymentAmount: parseMoneyNumber(
          paymentAmount
        ),
        paymentSystem,
        invoiceNumber,
        comment: paymentComment,
        clientNote: clientNote.trim(),
        manager,
        paymentDate,
        startDate,
        ...getSourcePayload(),
        userData: actor,
      });

      toast.success(
        `Оплата сохранена: ${formatMoney(
          paymentAmount
        )}`
      );
      showVkSuccessHint(client);

      setClientName("");
      setVkLink("");
      setCourse("");
      setTariff("");
      setBudget("");
      setEmail("");
      setFirstContact("");
      setClientNote("");
      setSourceId("");
      setSourceName("");
      setDialogLink("");
      resetAfterSubmit();
    } catch (error) {
      toast.error(
        error.message ||
          "Ошибка при сохранении"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function requestSaveExisting() {
    if (!foundClient || !actor) {
      toast.error(
        "Сначала найдите клиента"
      );
      return;
    }

    if (!dialogLink.trim()) {
      toast.error(
        "Укажите ссылку на диалог"
      );
      return;
    }

    const validationError =
      validateCommonFields();

    if (validationError) {
      toast.error(validationError);
      return;
    }

    const paymentSystemError =
      validatePaymentSystemFields();

    if (paymentSystemError) {
      toast.error(paymentSystemError);
      return;
    }

    setConfirmSave("existing");
  }

  function requestSaveLegacyClient() {
    if (!actor || !isLegacyClientMode) {
      return;
    }

    const validationError =
      validateLegacyClientFields();

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setConfirmSave("legacyClient");
  }

  function requestSaveNew() {
    if (!actor) {
      return;
    }

    if (!dialogLink.trim()) {
      toast.error(
        "Укажите ссылку на диалог"
      );
      return;
    }

    if (!course) {
      toast.error("Выберите курс");
      return;
    }

    if (!budget) {
      toast.error("Укажите бюджет");
      return;
    }

    const trafficError =
      validateTrafficSource();

    if (trafficError) {
      toast.error(trafficError);
      return;
    }

    const validationError =
      validateCommonFields();

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setConfirmSave("new");
  }

  function requestSaveLegacy() {
    if (!actor) {
      return;
    }

    if (!dialogLink.trim()) {
      toast.error(
        "Укажите ссылку на диалог"
      );
      return;
    }

    const validationError =
      validateCommonFields();

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setConfirmSave("legacy");
  }

  async function handleConfirmSave() {
    if (confirmSave === "existing") {
      await addPaymentToExisting();
    } else if (confirmSave === "new") {
      await addPaymentForNewClient();
    } else if (confirmSave === "legacy") {
      await addLegacyPayment();
    } else if (confirmSave === "legacyClient") {
      await addLegacyClientPayment();
    }

    setConfirmSave(null);
  }

  if (loadingPending) {
    return (
      <LoadingState message="Загрузка временной продажи..." />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Новая оплата"
        subtitle={
          pendingSale
            ? "Подтверждение временной продажи"
            : ""
        }
      />

      {pendingSale && (
        <div className="bg-cyan-500/10 border border-cyan-500/30 p-4 rounded-2xl text-sm">
          <div className="font-bold text-cyan-300 mb-1">
            Временная продажа
          </div>
          <div className="text-slate-300">
            KPI и выручка будут начислены:{" "}
            <strong>
              {getManagerNameById(
                pendingSale.ownerManagerId
              )}
            </strong>
          </div>
          <Link
            to="/pending-sales"
            className="text-cyan-400 text-xs mt-2 inline-block hover:underline"
          >
            ← Назад к списку
          </Link>
        </div>
      )}

      <div className="bg-slate-900 p-5 md:p-6 rounded-2xl max-w-2xl space-y-1">
        {!dealTypeKnown && dealTypeId && (
          <div className="mb-4 bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-sm text-amber-200">
            Неизвестный тип сделки. Выберите
            значение из списка.
          </div>
        )}

        {dealTypeKnown && isLegacy && (
          <>
            <div className="mb-4 bg-violet-500/10 border border-violet-500/30 p-4 rounded-xl text-sm text-violet-100">
              Pilot: доплата от подписчика, которого
              ещё нет в CRM (май 2026 и раньше).
              Клиент не создаётся. Сумма учитывается
              в выручке, KPI, зарплате и экспорте.
              Не влияет на подписки, overdue и циклы.
            </div>

            <FormSection title="Legacy доплата">
              <select
                value={dealTypeId}
                onChange={(e) =>
                  setDealTypeId(
                    e.target.value
                  )
                }
                className={inputClass}
              >
                {DEAL_TYPE_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.id}
                      value={option.id}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>

              <input
                placeholder="Ссылка на диалог *"
                value={dialogLink}
                onChange={(e) =>
                  setDialogLink(
                    e.target.value
                  )
                }
                className={inputClass}
              />

              <MoneyInput
                placeholder="Сумма оплаты *"
                required
                value={paymentAmount}
                onChange={setPaymentAmount}
                className={inputClass}
              />

              <label className="block">
                <span className="text-sm text-slate-400">
                  Дата оплаты *
                </span>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) =>
                    setPaymentDate(
                      e.target.value
                    )
                  }
                  className={`${inputClass} mt-1`}
                />
              </label>

              <select
                value={manager}
                onChange={(e) =>
                  setManager(
                    e.target.value
                  )
                }
                className={inputClass}
              >
                <option value="">
                  Менеджер (владелец KPI) *
                </option>
                {MANAGERS.map((item) => (
                  <option
                    key={item.id}
                    value={item.name}
                  >
                    {item.name}
                  </option>
                ))}
              </select>

              <input
                placeholder="Комментарий (необязательно)"
                value={paymentComment}
                onChange={(e) =>
                  setPaymentComment(
                    e.target.value
                  )
                }
                className={inputClass}
              />

              <button
                type="button"
                onClick={requestSaveLegacy}
                disabled={submitting}
                className="
                  w-full bg-violet-500
                  hover:bg-violet-600 p-4
                  rounded-xl font-bold
                  disabled:opacity-50
                "
              >
                {submitting
                  ? "Сохранение..."
                  : "Сохранить legacy-оплату"}
              </button>
            </FormSection>
          </>
        )}

        {dealTypeKnown && isNewClient && (
          <>
            <FormSection title="Сделка">
              <select
                value={dealTypeId}
                onChange={(e) =>
                  setDealTypeId(
                    e.target.value
                  )
                }
                className={inputClass}
              >
                {DEAL_TYPE_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.id}
                      value={option.id}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>

              <MoneyInput
                placeholder="Сумма оплаты *"
                required
                value={paymentAmount}
                onChange={setPaymentAmount}
                className={inputClass}
              />

              <select
                value={course}
                onChange={(e) =>
                  setCourse(e.target.value)
                }
                className={inputClass}
              >
                <option value="">
                  Курс *
                </option>
                {COURSES.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>

              <select
                value={tariff}
                onChange={(e) =>
                  setTariff(e.target.value)
                }
                className={inputClass}
              >
                <option value="">
                  Тариф
                </option>
                {TARIFFS.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>

              <MoneyInput
                placeholder="Бюджет *"
                required
                value={budget}
                onChange={setBudget}
                className={inputClass}
              />
            </FormSection>

            <FormSection title="Клиент">
              <input
                placeholder="Ссылка на диалог *"
                value={dialogLink}
                onChange={(e) =>
                  setDialogLink(
                    e.target.value
                  )
                }
                className={inputClass}
              />

              <input
                placeholder="Имя клиента"
                value={clientName}
                onChange={(e) =>
                  setClientName(
                    e.target.value
                  )
                }
                className={inputClass}
              />

              <input
                placeholder="Ссылка VK"
                value={vkLink}
                onChange={(e) =>
                  setVkLink(e.target.value)
                }
                className={inputClass}
              />

              <VkLinkHint
                visible={!vkLink.trim()}
              />

              <input
                placeholder="Email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                className={inputClass}
              />

              <input
                placeholder="Примечание (ID клиента из БС)"
                value={clientNote}
                onChange={(e) =>
                  setClientNote(
                    e.target.value
                  )
                }
                className={inputClass}
              />
            </FormSection>

            <FormSection title="Даты">
              <label className="block">
                <span className="text-sm text-slate-400">
                  Дата оплаты *
                </span>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) =>
                    setPaymentDate(
                      e.target.value
                    )
                  }
                  className={`${inputClass} mt-1`}
                />
              </label>

              <label className="block">
                <span className="text-sm text-slate-400">
                  Первый контакт
                </span>
                <input
                  type="date"
                  value={firstContact}
                  onChange={(e) =>
                    setFirstContact(
                      e.target.value
                    )
                  }
                  className={`${inputClass} mt-1`}
                />
              </label>

              <StartDateField
                dealTypeId={dealTypeId}
                paymentDate={paymentDate}
                selectedStream={
                  selectedStream
                }
                onSelectedStreamChange={
                  setSelectedStream
                }
                manualStartDate={
                  manualStartDate
                }
                onManualStartDateChange={
                  setManualStartDate
                }
              />
            </FormSection>

            <FormSection title="Источник">
              <label className="block">
                <span className="text-sm text-slate-400">
                  Откуда (traffic) *
                </span>
                <div className="mt-1">
                  <TrafficSourceSelect
                    sources={trafficSources}
                    sourceId={sourceId}
                    sourceName={sourceName}
                    onChange={
                      handleSourceChange
                    }
                    allowCreate={isAdmin}
                    onCreate={
                      handleCreateTrafficSource
                    }
                    loading={
                      trafficSourcesLoading
                    }
                    hasFirestoreSources={
                      hasFirestoreSources
                    }
                    required
                  />
                </div>
              </label>
            </FormSection>

            <FormSection title="Дополнительно">
              <select
                value={paymentSystem}
                onChange={(e) =>
                  setPaymentSystem(
                    e.target.value
                  )
                }
                className={inputClass}
              >
                <option value="">
                  Платежная система
                </option>
                {PAYMENT_SYSTEMS.map(
                  (system) => (
                    <option
                      key={system}
                      value={system}
                    >
                      {system}
                    </option>
                  )
                )}
              </select>

              {requiresInvoice(
                paymentSystem
              ) && (
                <input
                  placeholder="Номер счёта"
                  value={invoiceNumber}
                  onChange={(e) =>
                    setInvoiceNumber(
                      e.target.value
                    )
                  }
                  className={inputClass}
                />
              )}

              <select
                value={manager}
                onChange={(e) =>
                  setManager(
                    e.target.value
                  )
                }
                className={inputClass}
              >
                <option value="">
                  Менеджер (владелец KPI) *
                </option>
                {MANAGERS.map((item) => (
                  <option
                    key={item.id}
                    value={item.name}
                  >
                    {item.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={
                  requestSaveNew
                }
                disabled={submitting}
                className="
                  w-full bg-green-500
                  hover:bg-green-600 p-4
                  rounded-xl font-bold
                  disabled:opacity-50
                "
              >
                {submitting
                  ? "Сохранение..."
                  : "Создать клиента и оплату"}
              </button>
            </FormSection>
          </>
        )}

        {dealTypeKnown &&
          isExistingClient && (
            <>
              <FormSection title="Сделка">
                <select
                  value={dealTypeId}
                  onChange={(e) => {
                    setDealTypeId(
                      e.target.value
                    );
                    setFoundClient(null);
                    setIsLegacyClientMode(false);
                  }}
                  className={inputClass}
                >
                  {DEAL_TYPE_OPTIONS.map(
                    (option) => (
                      <option
                        key={option.id}
                        value={option.id}
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </FormSection>

              <FormSection title="Клиент">
                <input
                  placeholder="Ссылка на диалог *"
                  value={dialogLink}
                  onChange={(e) =>
                    findClient(
                      e.target.value
                    )
                  }
                  className={inputClass}
                />

                {foundClient && (
                  <div className="bg-slate-800/60 p-4 rounded-xl text-sm space-y-2">
                    <div className="text-green-400 font-bold">
                      Клиент найден ✅
                    </div>
                    <div>
                      {foundClient.name ||
                        "—"}{" "}
                      · {foundClient.course}
                    </div>
                    <div className="text-slate-400">
                      Остаток:{" "}
                      {getRemain(
                        foundClient
                      )}{" "}
                      ₽
                    </div>
                    {(foundClient.sourceName ||
                      foundClient.source) && (
                      <div className="text-slate-400">
                        Traffic:{" "}
                        {foundClient.sourceName ||
                          foundClient.source}
                      </div>
                    )}
                    <VkLinkHint
                      visible={
                        !foundClient.vkLink?.trim()
                      }
                    />
                  </div>
                )}

                {dialogLink &&
                  !foundClient &&
                  !isLegacyClientMode && (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-sm text-amber-100 space-y-3">
                      <p>
                        Клиент не найден.
                        Возможно это старый
                        клиент до запуска CRM.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setIsLegacyClientMode(
                            true
                          )
                        }
                        className="
                          w-full bg-amber-500/20
                          hover:bg-amber-500/30
                          border border-amber-500/40
                          p-3 rounded-xl font-semibold
                          text-amber-50
                        "
                      >
                        Продолжить как старый
                        клиент
                      </button>
                    </div>
                  )}

                {isLegacyClientMode && (
                  <div className="bg-violet-500/10 border border-violet-500/30 p-4 rounded-xl text-sm text-violet-100">
                    ☑ Старый клиент (до CRM).
                    Клиент в CRM не создаётся —
                    сохраняется полная запись
                    оплаты для экспорта, KPI и
                    зарплаты.
                  </div>
                )}

                {isLegacyClientMode && (
                  <>
                    <input
                      placeholder="Имя клиента *"
                      value={clientName}
                      onChange={(e) =>
                        setClientName(
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />

                    <input
                      placeholder="Ссылка VK *"
                      value={vkLink}
                      onChange={(e) =>
                        setVkLink(
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />

                    <select
                      value={course}
                      onChange={(e) =>
                        setCourse(
                          e.target.value
                        )
                      }
                      className={inputClass}
                    >
                      <option value="">
                        Курс *
                      </option>
                      {COURSES.map((item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>
                      ))}
                    </select>

                    <select
                      value={tariff}
                      onChange={(e) =>
                        setTariff(
                          e.target.value
                        )
                      }
                      className={inputClass}
                    >
                      <option value="">
                        Тариф *
                      </option>
                      {TARIFFS.map((item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                <input
                  placeholder="Примечание (ID клиента из БС) *"
                  value={clientNote}
                  onChange={(e) =>
                    setClientNote(
                      e.target.value
                    )
                  }
                  className={inputClass}
                />
              </FormSection>

              {(foundClient ||
                isLegacyClientMode) && (
                <>
                  <FormSection title="Сделка">
                    <MoneyInput
                      placeholder={
                        dealTypeId ===
                        "refund"
                          ? "Сумма возврата *"
                          : "Сумма оплаты *"
                      }
                      required
                      value={paymentAmount}
                      onChange={
                        setPaymentAmount
                      }
                      className={inputClass}
                    />
                  </FormSection>

                  <FormSection title="Даты">
                    <label className="block">
                      <span className="text-sm text-slate-400">
                        Дата оплаты *
                      </span>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) =>
                          setPaymentDate(
                            e.target.value
                          )
                        }
                        className={`${inputClass} mt-1`}
                      />
                    </label>

                    {isLegacyClientMode && (
                      <label className="block">
                        <span className="text-sm text-slate-400">
                          Дата первого контакта *
                        </span>
                        <input
                          type="date"
                          value={firstContact}
                          onChange={(e) =>
                            setFirstContact(
                              e.target.value
                            )
                          }
                          className={`${inputClass} mt-1`}
                        />
                      </label>
                    )}

                    <StartDateField
                      dealTypeId={dealTypeId}
                      paymentDate={
                        paymentDate
                      }
                      selectedStream={
                        selectedStream
                      }
                      onSelectedStreamChange={
                        setSelectedStream
                      }
                      manualStartDate={
                        manualStartDate
                      }
                      onManualStartDateChange={
                        setManualStartDate
                      }
                    />
                  </FormSection>

                  {isLegacyClientMode && (
                    <FormSection title="Источник">
                      <label className="block">
                        <span className="text-sm text-slate-400">
                          Откуда (traffic) *
                        </span>
                        <div className="mt-1">
                          <TrafficSourceSelect
                            sources={
                              trafficSources
                            }
                            sourceId={sourceId}
                            sourceName={
                              sourceName
                            }
                            onChange={
                              handleSourceChange
                            }
                            allowCreate={
                              isAdmin
                            }
                            onCreate={
                              handleCreateTrafficSource
                            }
                            loading={
                              trafficSourcesLoading
                            }
                            hasFirestoreSources={
                              hasFirestoreSources
                            }
                            required
                          />
                        </div>
                      </label>
                    </FormSection>
                  )}

                  <FormSection title="Дополнительно">
                    <select
                      value={paymentSystem}
                      onChange={(e) =>
                        setPaymentSystem(
                          e.target.value
                        )
                      }
                      className={inputClass}
                    >
                      <option value="">
                        Платежная система *
                      </option>
                      {PAYMENT_SYSTEMS.map(
                        (system) => (
                          <option
                            key={system}
                            value={system}
                          >
                            {system}
                          </option>
                        )
                      )}
                    </select>

                    {requiresInvoice(
                      paymentSystem
                    ) && (
                      <input
                        placeholder="Номер счёта *"
                        value={invoiceNumber}
                        onChange={(e) =>
                          setInvoiceNumber(
                            e.target.value
                          )
                        }
                        className={inputClass}
                      />
                    )}

                    <input
                      placeholder="Комментарий"
                      value={paymentComment}
                      onChange={(e) =>
                        setPaymentComment(
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />

                    <select
                      value={manager}
                      onChange={(e) =>
                        setManager(
                          e.target.value
                        )
                      }
                      disabled={!!pendingSale}
                      className={`${inputClass} disabled:opacity-60`}
                    >
                      <option value="">
                        Менеджер (владелец KPI) *
                      </option>
                      {MANAGERS.map((item) => (
                        <option
                          key={item.id}
                          value={item.name}
                        >
                          {item.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={
                        isLegacyClientMode
                          ? requestSaveLegacyClient
                          : requestSaveExisting
                      }
                      disabled={submitting}
                      className="
                        w-full bg-green-500
                        hover:bg-green-600 p-4
                        rounded-xl font-bold
                        disabled:opacity-50
                      "
                    >
                      {submitting
                        ? "Сохранение..."
                        : isLegacyClientMode
                          ? "Сохранить оплату (старый клиент)"
                          : pendingSale
                            ? "Подтвердить и добавить оплату"
                            : "Добавить оплату"}
                    </button>
                  </FormSection>
                </>
              )}
            </>
          )}

        {!dealTypeId && (
          <FormSection title="Сделка">
            <select
              value={dealTypeId}
              onChange={(e) =>
                setDealTypeId(
                  e.target.value
                )
              }
              className={inputClass}
            >
              <option value="">
                Выберите тип сделки
              </option>
              {DEAL_TYPE_OPTIONS.map(
                (option) => (
                  <option
                    key={option.id}
                    value={option.id}
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>
          </FormSection>
        )}
      </div>

      <ConfirmModal
        open={Boolean(confirmSave)}
        title="Проверьте сумму оплаты"
        message={`Сохранить оплату на ${formatMoney(
          parseMoneyNumber(
            paymentAmount
          )
        )}?`}
        confirmLabel="Подтвердить"
        variant="default"
        loading={submitting}
        onConfirm={handleConfirmSave}
        onCancel={() =>
          setConfirmSave(null)
        }
      />
    </div>
  );
}
