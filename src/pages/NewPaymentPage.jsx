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
  createLegacyClientPayment,
  findLegacySubscriber,
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
  DEFAULT_LEGACY_TT_DEAL_TYPE_ID,
  LEGACY_TABLE_TT_DEAL_TYPE_OPTIONS,
  getDealTypeLabel,
  hasDealTypeSelected,
  isNewClientDealType,
  isExistingClientDealType,
  isLegacyDealType,
  isLegacyTableTtDealType,
  isBbDealType,
  isRejectDealType,
  resolveDealTypeId,
  resolveLegacyTtDealTypeId,
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

function LegacyTtDealTypeSelect({
  value,
  onChange,
}) {
  return (
    <label className="block">
      <span className="text-sm text-slate-400">
        Тип сделки для ТТ *
      </span>
      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className={`${inputClass} mt-1`}
      >
        {LEGACY_TABLE_TT_DEAL_TYPE_OPTIONS.map(
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
      <p className="text-slate-500 text-xs mt-1.5">
        Этот тип попадёт в колонку B Google ТТ
      </p>
    </label>
  );
}

export default function NewPaymentPage() {
  const { user, userData } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { isLeadership } = usePermissions();
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

  const [
    legacySubscriberProfile,
    setLegacySubscriberProfile,
  ] = useState(null);

  const [legacyLookupDone, setLegacyLookupDone] =
    useState(false);

  const [
    legacyLookupLoading,
    setLegacyLookupLoading,
  ] = useState(false);

  const [
    legacyTtDealTypeId,
    setLegacyTtDealTypeId,
  ] = useState(
    DEFAULT_LEGACY_TT_DEAL_TYPE_ID
  );

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

  const activeDealTypeLabel =
    getDealTypeLabel(
      isLegacy &&
        isRejectDealType(
          legacyTtDealTypeId
        )
        ? legacyTtDealTypeId
        : dealTypeId
    );

  const isRejectDeal =
    isRejectDealType(dealTypeId) ||
    (isLegacy &&
      isRejectDealType(
        legacyTtDealTypeId
      ));

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

  useEffect(() => {
    if (!isLegacy) {
      setLegacySubscriberProfile(null);
      setLegacyLookupDone(false);
      setLegacyTtDealTypeId(
        DEFAULT_LEGACY_TT_DEAL_TYPE_ID
      );
    }
  }, [dealTypeId, isLegacy]);

  function resetLegacyEntryMode() {
    setDealTypeId("");
    setLegacySubscriberProfile(null);
    setLegacyLookupDone(false);
    setLegacyTtDealTypeId(
      DEFAULT_LEGACY_TT_DEAL_TYPE_ID
    );
    setDialogLink("");
    setClientNote("");
  }

  function validateLegacyTtDealType() {
    if (
      !isLegacyTableTtDealType(
        legacyTtDealTypeId
      )
    ) {
      return "Выберите тип сделки для ТТ";
    }

    return null;
  }

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

  function resolvePaymentAmount() {
    if (isRejectDeal) {
      return 0;
    }

    return parseMoneyNumber(
      paymentAmount
    );
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

    if (
      !isLegacyClientMode &&
      !isRejectDeal &&
      !budget
    ) {
      return "Укажите бюджет (сумма тарифа)";
    }

    if (!firstContact) {
      return "Укажите дату первого контакта";
    }

    const trafficError =
      validateTrafficSource();

    if (trafficError) {
      return trafficError;
    }

    const ttDealTypeError =
      validateLegacyTtDealType();

    if (ttDealTypeError) {
      return ttDealTypeError;
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

    if (
      !isRejectDeal &&
      !paymentAmount
    ) {
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
      !isRejectDeal &&
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
        paymentAmount:
          resolvePaymentAmount(),
        paymentSystem,
        invoiceNumber,
        comment: paymentComment,
        manager,
        paymentDate,
        startDate: isRejectDeal
          ? ""
          : getStartDateValue(),
        firstContactDate: firstContact,
        budget: 0,
        ...getSourcePayload(),
        userData: actor,
      });

      toast.success(
        isRejectDeal
          ? `${dealTypeLabel} сохранён`
          : `Оплата сохранена: ${formatMoney(
              resolvePaymentAmount()
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

  function applyLegacySubscriberProfile(
    payment
  ) {
    if (!payment) {
      return;
    }

    setClientName(
      payment.legacyClientName ||
        payment.clientName ||
        ""
    );
    setVkLink(payment.vkLink || "");
    setCourse(payment.course || "");
    setTariff(payment.tariff || "");
    setFirstContact(
      payment.firstContact ||
        payment.firstContactDate ||
        ""
    );
    setSourceId(
      payment.sourceId
        ? String(payment.sourceId)
        : ""
    );
    setSourceName(
      payment.sourceName ||
        payment.source ||
        ""
    );
    setClientNote(
      payment.legacyClientBsId ||
        payment.clientNote ||
        ""
    );
    setLegacyTtDealTypeId(
      resolveLegacyTtDealTypeId(
        payment.dealType
      )
    );
    if (payment.budget) {
      setBudget(String(payment.budget));
    }
  }

  function resetLegacyLookup() {
    setLegacySubscriberProfile(null);
    setLegacyLookupDone(false);
  }

  function handleLegacyBsIdChange(value) {
    setClientNote(value);
    resetLegacyLookup();
  }

  function handleLegacyDialogLinkChange(
    value
  ) {
    setDialogLink(value);
    resetLegacyLookup();
  }

  async function lookupLegacySubscriber() {
    if (!actor) {
      return;
    }

    const bsId = clientNote.trim();
    const link = dialogLink.trim();

    if (!bsId && !link) {
      toast.error(
        "Введите ID из БС или ссылку на диалог"
      );
      return;
    }

    setLegacyLookupLoading(true);

    try {
      const found =
        await findLegacySubscriber({
          bsId,
          dialogLink: link,
          userData: actor,
        });

      setLegacySubscriberProfile(found);
      setLegacyLookupDone(true);

      if (found) {
        applyLegacySubscriberProfile(found);
        toast.success(
          `Найден: ${
            found.legacyClientName ||
            found.clientName ||
            "подписчик"
          }`
        );
      } else {
        setClientName("");
        setVkLink("");
        setCourse("");
        setTariff("");
        setBudget("");
        setFirstContact("");
        setSourceId("");
        setSourceName("");
        setLegacyTtDealTypeId(
          DEFAULT_LEGACY_TT_DEAL_TYPE_ID
        );
        toast.info(
          "Первый раз в CRM — заполните данные клиента"
        );
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error.message ||
          "Не удалось найти подписчика"
      );
    } finally {
      setLegacyLookupLoading(false);
    }
  }

  function validateLegacySubscriberShort() {
    if (!dialogLink.trim()) {
      return "Укажите ссылку на диалог";
    }

    const validationError =
      validateCommonFields();

    const ttDealTypeError =
      validateLegacyTtDealType();

    if (ttDealTypeError) {
      return ttDealTypeError;
    }

    if (validationError) {
      return validationError;
    }

    return validatePaymentSystemFields();
  }

  async function addLegacyPayment() {
    if (!actor) {
      return;
    }

    if (!legacyLookupDone) {
      toast.error(
        "Сначала введите ID из БС и нажмите «Найти»"
      );
      return;
    }

    const validationError =
      legacySubscriberProfile
        ? validateLegacySubscriberShort()
        : validateLegacyClientFields();

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const dealTypeLabel =
        getDealTypeLabel(
          legacyTtDealTypeId
        );

      const profile =
        legacySubscriberProfile;

      await createLegacyClientPayment({
        dialogLink,
        vkLink: profile?.vkLink || vkLink,
        legacyClientName:
          profile?.legacyClientName ||
          profile?.clientName ||
          clientName,
        legacyClientBsId: clientNote.trim(),
        course: profile?.course || course,
        tariff: profile?.tariff || tariff,
        dealType: dealTypeLabel,
        paymentAmount:
          resolvePaymentAmount(),
        paymentSystem,
        invoiceNumber,
        comment: paymentComment,
        manager,
        paymentDate,
        startDate: isRejectDeal
          ? ""
          : getStartDateValue(),
        firstContactDate:
          profile?.firstContact ||
          profile?.firstContactDate ||
          firstContact,
        sourceId:
          profile?.sourceId ||
          sourceId ||
          null,
        sourceName:
          profile?.sourceName ||
          profile?.source ||
          sourceName,
        budget: profile
          ? Number(profile.budget || 0)
          : parseMoneyNumber(budget),
        userData: actor,
      });

      toast.success(
        isRejectDeal
          ? `${dealTypeLabel} сохранён`
          : `Оплата сохранена: ${formatMoney(
              resolvePaymentAmount()
            )}`
      );

      setDialogLink("");
      setPaymentComment("");
      setClientNote("");
      setLegacySubscriberProfile(null);
      setLegacyLookupDone(false);
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
        paymentAmount:
          resolvePaymentAmount(),
        paymentSystem,
        invoiceNumber,
        comment: paymentComment,
        clientNote: clientNote.trim(),
        manager,
        paymentDate,
        startDate: isRejectDeal
          ? ""
          : getStartDateValue(),
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
        isRejectDeal
          ? `${dealTypeLabel} сохранён`
          : `Оплата сохранена: ${formatMoney(
              resolvePaymentAmount()
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
        userData: actor,
      });

      await createPayment({
        client,
        dealType: dealTypeLabel,
        paymentAmount:
          resolvePaymentAmount(),
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
        isRejectDeal
          ? `${dealTypeLabel} сохранён`
          : `Оплата сохранена: ${formatMoney(
              resolvePaymentAmount()
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

    if (!legacyLookupDone) {
      toast.error(
        "Сначала введите ID из БС и нажмите «Найти»"
      );
      return;
    }

    const validationError =
      legacySubscriberProfile
        ? validateLegacySubscriberShort()
        : validateLegacyClientFields();

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
            <div className="mb-4 bg-violet-500/10 border border-violet-500/30 p-4 rounded-xl text-sm text-violet-100 space-y-2">
              <p>
                Клиент из Google ТТ — карточки в CRM{" "}
                <strong>нет</strong>. Ищем по ссылке на
                диалог или ID из Bluesales.
              </p>
              <p>
                Ссылка на диалог <strong>одна и та же</strong>.
                После первого внесения повторные доплаты —
                снова «Найти» по этой ссылке.
              </p>
              <p>
                Тип для колонки B в Google ТТ выбирается
                отдельно: «Доплата новая», «Доплата ББ»,
                «Апсэйл» и т.д.
              </p>
            </div>

            <FormSection title="1. Найти клиента">
              <button
                type="button"
                onClick={resetLegacyEntryMode}
                className="text-sm text-slate-400 hover:text-slate-200 mb-2"
              >
                ← Другой тип сделки
              </button>

              <input
                placeholder="Ссылка на диалог Bluesales"
                value={dialogLink}
                onChange={(e) =>
                  handleLegacyDialogLinkChange(
                    e.target.value
                  )
                }
                className={inputClass}
              />

              <input
                placeholder="ID клиента из Bluesales (если знаете)"
                value={clientNote}
                onChange={(e) =>
                  handleLegacyBsIdChange(
                    e.target.value
                  )
                }
                className={inputClass}
              />

              <button
                type="button"
                onClick={lookupLegacySubscriber}
                disabled={
                  legacyLookupLoading ||
                  (
                    !clientNote.trim() &&
                    !dialogLink.trim()
                  )
                }
                className="
                  w-full bg-slate-800 hover:bg-slate-700
                  border border-slate-600 p-3.5
                  rounded-xl font-semibold
                  disabled:opacity-50
                "
              >
                {legacyLookupLoading
                  ? "Поиск..."
                  : "Найти"}
              </button>
            </FormSection>

            {legacyLookupDone &&
              legacySubscriberProfile && (
              <>
                <div className="mb-4 bg-green-500/10 border border-green-500/30 p-4 rounded-xl text-sm text-green-100">
                  Найден:{" "}
                  <strong>
                    {legacySubscriberProfile.legacyClientName ||
                      legacySubscriberProfile.clientName}
                  </strong>
                  {legacySubscriberProfile.course && (
                    <>
                      {" "}
                      · {legacySubscriberProfile.course}
                    </>
                  )}
                  {legacySubscriberProfile.tariff && (
                    <>
                      {" "}
                      · {legacySubscriberProfile.tariff}
                    </>
                  )}
                  {Number(
                    legacySubscriberProfile.budget ||
                      0
                  ) > 0 && (
                    <div className="text-green-200/80 mt-2">
                      Бюджет:{" "}
                      {formatMoney(
                        legacySubscriberProfile.budget
                      )}{" "}
                      · в CRM внесено:{" "}
                      {formatMoney(
                        legacySubscriberProfile.totalPaidInCrm ||
                          0
                      )}
                      {legacySubscriberProfile.remainInCrm !=
                        null && (
                        <>
                          {" "}
                          · остаток:{" "}
                          {formatMoney(
                            legacySubscriberProfile.remainInCrm
                          )}
                        </>
                      )}
                    </div>
                  )}
                  <div className="text-green-200/80 mt-2">
                    Подсказка типа для ТТ:{" "}
                    <strong>
                      {getDealTypeLabel(
                        legacyTtDealTypeId
                      )}
                    </strong>
                    {" "}
                    — проверьте и при необходимости
                    смените ниже.
                  </div>
                </div>

                <FormSection title="2. Оплата">
                  <LegacyTtDealTypeSelect
                    value={legacyTtDealTypeId}
                    onChange={
                      setLegacyTtDealTypeId
                    }
                  />

                  <input
                    placeholder="Ссылка на диалог *"
                    value={dialogLink}
                    onChange={(e) =>
                      handleLegacyDialogLinkChange(
                        e.target.value
                      )
                    }
                    className={inputClass}
                  />

                  {!isRejectDealType(
                    legacyTtDealTypeId
                  ) && (
                    <MoneyInput
                      placeholder="Сумма оплаты *"
                      required
                      value={paymentAmount}
                      onChange={setPaymentAmount}
                      className={inputClass}
                    />
                  )}

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
                      : "Сохранить доплату"}
                  </button>
                </FormSection>
              </>
            )}

            {legacyLookupDone &&
              !legacySubscriberProfile && (
              <>
                <div className="mb-4 bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-sm text-amber-100">
                  Первый раз в CRM — заполните данные
                  клиента один раз. Следующие доплаты —
                  «Найти» по той же ссылке на диалог.
                </div>

                <FormSection title="2. Карточка клиента">
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

                  {!isRejectDealType(
                    legacyTtDealTypeId
                  ) && (
                    <MoneyInput
                      placeholder="Бюджет (сумма тарифа) *"
                      required
                      value={budget}
                      onChange={setBudget}
                      className={inputClass}
                    />
                  )}

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

                  <label className="block">
                    <span className="text-sm text-slate-400">
                      Откуда (traffic) *
                    </span>
                    <div className="mt-1">
                      <TrafficSourceSelect
                        value={sourceId}
                        sourceName={sourceName}
                        onChange={
                          handleSourceChange
                        }
                        sources={
                          trafficSources
                        }
                        onCreateSource={
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

                <FormSection title="3. Оплата">
                  <LegacyTtDealTypeSelect
                    value={legacyTtDealTypeId}
                    onChange={
                      setLegacyTtDealTypeId
                    }
                  />

                  {!isRejectDealType(
                    legacyTtDealTypeId
                  ) && (
                    <MoneyInput
                      placeholder="Сумма оплаты *"
                      required
                      value={paymentAmount}
                      onChange={setPaymentAmount}
                      className={inputClass}
                    />
                  )}

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
                      : "Сохранить подписчика и оплату"}
                  </button>
                </FormSection>
              </>
            )}
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
                    allowCreate={isLeadership}
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
                        Клиент не найден по ссылке на
                        диалог.
                      </p>
                      <p>
                        Если это клиент из Google ТТ
                        (июнь и раньше) — выберите
                        сделку{" "}
                        <strong>
                          «Клиент из таблицы (без
                          карточки CRM)»
                        </strong>
                        . Ссылка на диалог та же, но
                        карточки клиента в CRM нет.
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
                        клиент (здесь)
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
                  {!isRejectDeal && (
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
                  )}

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

                    {!isRejectDeal && (
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
                    )}
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
                              isLeadership
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
                          ? isRejectDeal
                            ? "Сохранить отказ"
                            : "Сохранить оплату (старый клиент)"
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
        title={
          isRejectDeal
            ? "Сохранить отказ?"
            : "Проверьте сумму оплаты"
        }
        message={
          isRejectDeal
            ? `Сохранить «${activeDealTypeLabel}» без суммы?`
            : `Сохранить оплату на ${formatMoney(
                resolvePaymentAmount()
              )}?`
        }
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
