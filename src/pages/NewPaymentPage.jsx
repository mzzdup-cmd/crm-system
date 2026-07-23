import {
  useState,
  useEffect,
  useMemo,
  useRef,
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
  getPaymentsByClientId,
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
  resolveClientStreamStartDate,
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
  isOptionalStartDateDealType,
  isDeferredPaymentProfileDealType,
  isRejectDealType,
  inheritsClientStream,
  needsBudgetFieldForExistingDeal,
  resolveDealTypeId,
  showCuratorStartDateField,
} from "../constants/dealTypes";

import {
  BB_BOOKING_STAGE,
} from "../domain/client/bbBookingLogic";

import {
  suggestLegacyTopupDealTypeId,
} from "../domain/payment/legacySubscriberLookup";

import {
  buildInstallmentBreakdown,
  resolveNextInstallmentDue,
  resolveSuggestedTopupDealType,
} from "../domain/payment/paymentInstallmentPlan";

import {
  resolveSchedulePlan,
} from "../domain/client/bluesalesSchedule";

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

import CuratorStartDateField
from "../components/payments/CuratorStartDateField";

import TrafficSourceSelect
from "../components/traffic/TrafficSourceSelect";

import { VkLinkInput }
from "../components/vk/VkLinkInput";

import { useTrafficSources }
from "../hooks/useTrafficSources";

import { usePermissions }
from "../hooks/usePermissions";

import {
  maybeNotifyMissingVkLink,
} from "../services/missingVkReminderService";

import {
  addTrafficSource,
} from "../services/trafficSourceService";

import {
  formatMoney,
  parseMoneyNumber,
} from "../utils/moneyFormat";

const inputClass =
  "w-full bg-surface-raised p-3.5 rounded-xl";

function FieldLabel({
  children,
  done = false,
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-1">
      <span className="text-sm text-neutral-400">
        {children}
      </span>
      {done ? (
        <span
          className="text-green-400 text-sm font-bold shrink-0"
          aria-label="Заполнено"
        >
          ✓
        </span>
      ) : null}
    </div>
  );
}

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

function DeferredFieldHint({ visible }) {
  if (!visible) {
    return null;
  }

  return (
    <p className="text-neutral-500 text-xs mt-1">
      Можно заполнить позже
    </p>
  );
}

function ClientInCrmBadge({ client }) {
  if (!client) {
    return null;
  }

  return (
    <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl text-sm space-y-2">
      <div className="text-green-400 font-bold">
        ✓ Есть в CRM
      </div>
      <div>
        {client.name || "—"} ·{" "}
        {client.course || "—"}
      </div>
      <div className="text-neutral-400">
        Остаток: {getRemain(client)} ₽
      </div>
      {client.clientNote && (
        <div className="text-neutral-400">
          ID БС: {client.clientNote}
        </div>
      )}
      {client.fromTt && (
        <div className="text-violet-300 text-xs">
          Из ТТ
        </div>
      )}
      <p className="text-neutral-500 text-xs pt-1">
        Тип сделки выберите сами — может быть
        доплата, отказ или другой.
      </p>
    </div>
  );
}

function PaymentPlanModeBlock({
  paymentPlanMode,
  setPaymentPlanMode,
  nextInstallmentDue,
  planRemain,
  effectiveBudget,
  isBbDeal,
  paymentAmount,
  setPaymentAmount,
}) {
  const bookingAmount =
    isBbDeal &&
    paymentPlanMode === "partial"
      ? parseMoneyNumber(paymentAmount)
      : 0;

  return (
    <div className="mb-4 bg-surface-raised/80 border border-neutral-700/60 rounded-xl p-4 space-y-3">
      <div className="text-sm font-semibold">
        Оплата полная или частями
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="paymentPlanMode"
            checked={
              paymentPlanMode === "partial"
            }
            onChange={() =>
              setPaymentPlanMode("partial")
            }
          />
          <span>
            {isBbDeal
              ? "Частями (бронь + доплаты"
              : "Частями"}
            {!isBbDeal && (
              <>
                {" "}
                (
                {formatMoney(
                  nextInstallmentDue
                )}
                )
              </>
            )}
            {isBbDeal && ")"}
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="paymentPlanMode"
            checked={
              paymentPlanMode === "full"
            }
            onChange={() => {
              setPaymentPlanMode("full");
              setPaymentAmount(
                String(planRemain)
              );
            }}
          />
          <span>
            Полная (
            {formatMoney(planRemain)})
          </span>
        </label>
      </div>
      {paymentPlanMode === "partial" &&
        effectiveBudget > 0 && (
          <div className="text-xs text-neutral-400 space-y-1">
            {buildInstallmentBreakdown({
              budget: effectiveBudget,
              bookingAmount,
            }).lines.map((line) => (
              <div key={line.label}>
                {line.label}:{" "}
                {formatMoney(line.amount)}
              </div>
            ))}
            {isBbDeal && (
              <p className="text-neutral-500 pt-1">
                Для брони укажите сумму в поле
                ниже — в разбивке она учтётся
                автоматически.
              </p>
            )}
          </div>
        )}
    </div>
  );
}

function LegacyTtDealTypeSelect({
  value,
  onChange,
}) {
  return (
    <label className="block">
      <span className="text-sm text-neutral-400">
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
      <p className="text-neutral-500 text-xs mt-1.5">
        Этот тип попадёт в колонку B Google ТТ
      </p>
    </label>
  );
}

export default function NewPaymentPage() {
  const { user, userData, loading: authLoading } =
    useAuth();
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
    useState(false);

  const [dealTypeId, setDealTypeId] =
    useState("");

  const [dialogLink, setDialogLink] =
    useState("");

  const [foundClient, setFoundClient] =
    useState(null);

  const [dialogLookupStatus, setDialogLookupStatus] =
    useState("");

  const [dialogBlockedOwner, setDialogBlockedOwner] =
    useState(null);

  const [dialogCollision, setDialogCollision] =
    useState(null);

  const dialogLookupTimerRef =
    useRef(null);
  const dialogLookupRequestRef =
    useRef(0);

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

  const [curatorStartDate, setCuratorStartDate] =
    useState("");

  const [selectedStream, setSelectedStream] =
    useState("");

  const [paymentAmount, setPaymentAmount] =
    useState("");

  const [paymentPlanMode, setPaymentPlanMode] =
    useState("partial");

  const [clientPayments, setClientPayments] =
    useState([]);

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

  const [isFromTtImportMode, setIsFromTtImportMode] =
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
        uid: user?.uid || userData.uid,
        email:
          user?.email ||
          userData.email ||
          null,
      }
    : null;

  const createdByUid =
    user?.uid || actor?.uid || null;

  const isNewClient =
    isNewClientDealType(dealTypeId);

  const isExistingClient =
    isExistingClientDealType(dealTypeId);

  const isLegacy =
    isLegacyDealType(dealTypeId);

  const needsManualClientProfileFields =
    isLegacyClientMode ||
    isFromTtImportMode;

  const dealTypeKnown =
    hasDealTypeSelected(dealTypeId);

  const isBbDeal =
    isBbDealType(dealTypeId);

  const isDeferredProfile =
    isDeferredPaymentProfileDealType(
      dealTypeId
    );

  const curatorDealTypeId =
    isLegacy &&
    isLegacyTableTtDealType(
      legacyTtDealTypeId
    )
      ? legacyTtDealTypeId
      : dealTypeId;

  const showCuratorStartDate =
    showCuratorStartDateField(
      curatorDealTypeId
    );

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

  const streamDealTypeId =
    isLegacy &&
    isLegacyTableTtDealType(
      legacyTtDealTypeId
    )
      ? legacyTtDealTypeId
      : dealTypeId;

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
    if (!pendingSaleId) {
      return;
    }

    if (authLoading) {
      return;
    }

    if (!userData) {
      setLoadingPending(false);
      toast.error(
        "Не удалось загрузить профиль. Обновите страницу."
      );
      navigate("/pending-sales");
      return;
    }

    loadPendingSale(pendingSaleId);
  }, [pendingSaleId, userData, authLoading]);

  async function finalizePendingSaleConfirmation(
    paymentId
  ) {
    if (!pendingSaleId) {
      return false;
    }

    await confirmPendingSale(
      pendingSaleId,
      { paymentId }
    );

    toast.success("Оплата подтверждена");
    navigate("/pending-sales");
    return true;
  }

  useEffect(() => {
    if (
      !paymentDate ||
      isBbDealType(dealTypeId) ||
      isOptionalStartDateDealType(
        dealTypeId
      )
    ) {
      return;
    }

    if (
      inheritsClientStream(dealTypeId) &&
      foundClient
    ) {
      const inherited =
        resolveClientStreamStartDate(
          foundClient,
          clientPayments
        );

      if (inherited) {
        setSelectedStream(inherited);
        return;
      }
    }

    setSelectedStream(
      getDefaultStream(paymentDate)
    );
  }, [
    paymentDate,
    dealTypeId,
    foundClient,
    clientPayments,
  ]);

  useEffect(() => {
    if (!isLegacy) {
      setLegacySubscriberProfile(null);
      setLegacyLookupDone(false);
      setLegacyTtDealTypeId(
        DEFAULT_LEGACY_TT_DEAL_TYPE_ID
      );
    }
  }, [dealTypeId, isLegacy]);

  useEffect(() => {
    if (!foundClient?.id) {
      setClientPayments([]);
      return;
    }

    let cancelled = false;

    getPaymentsByClientId(
      foundClient.id
    )
      .then((payments) => {
        if (!cancelled) {
          setClientPayments(payments);
        }
      })
      .catch((error) => {
        console.warn(
          "Client payments load failed:",
          error
        );
      });

    return () => {
      cancelled = true;
    };
  }, [foundClient?.id]);

  const effectiveBudget = Number(
    budget ||
      foundClient?.budget ||
      0
  );

  const planRemain = foundClient
    ? getRemain(foundClient)
    : effectiveBudget;

  const showPaymentPlanMode =
    !isRejectDeal &&
    !isLegacy &&
    !isLegacyClientMode &&
    effectiveBudget > 0 &&
    (isNewClient ||
      (Boolean(foundClient) &&
        planRemain > 0));

  const nextInstallmentDue = useMemo(() => {
    if (!showPaymentPlanMode) {
      return 0;
    }

    if (foundClient) {
      return resolveNextInstallmentDue(
        foundClient,
        clientPayments
      );
    }

    return (
      resolveSchedulePlan(
        effectiveBudget
      ).amount || 0
    );
  }, [
    showPaymentPlanMode,
    foundClient,
    clientPayments,
    effectiveBudget,
  ]);

  const suggestedTopupDealType =
    foundClient
      ? resolveSuggestedTopupDealType(
          foundClient,
          clientPayments
        )
      : null;

  useEffect(() => {
    if (
      !showPaymentPlanMode ||
      paymentPlanMode !== "partial" ||
      !nextInstallmentDue ||
      isBbDeal
    ) {
      return;
    }

    setPaymentAmount(
      String(nextInstallmentDue)
    );

    if (suggestedTopupDealType) {
      setDealTypeId(
        suggestedTopupDealType
      );
    }
  }, [
    showPaymentPlanMode,
    paymentPlanMode,
    nextInstallmentDue,
    suggestedTopupDealType,
    foundClient?.id,
    isNewClient,
    effectiveBudget,
    isBbDeal,
  ]);

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
      dealTypeId: streamDealTypeId,
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

    const needsProfileBudget =
      !isRejectDeal &&
      !isLegacyClientMode &&
      !isExistingClientDealType(
        dealTypeId
      );

    if (needsProfileBudget && !budget) {
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

    const optionalStartDate =
      isOptionalStartDateDealType(
        streamDealTypeId
      );

    if (
      !optionalStartDate &&
      paymentDate &&
      !getStartDateValue()
    ) {
      return "Выберите поток";
    }

    if (!manager) {
      return "Выберите менеджера";
    }

    if (
      needsBudgetFieldForExistingDeal(
        dealTypeId
      ) &&
      !isDeferredPaymentProfileDealType(
        dealTypeId
      ) &&
      !budget
    ) {
      return "Укажите бюджет (сумма тарифа)";
    }

    return null;
  }

  async function loadPendingSale(id) {
    setLoadingPending(true);

    try {
      const sale =
        await getPendingSaleById(id);

      if (!sale) {
        toast.error(
          "Временная продажа не найдена"
        );
        navigate("/pending-sales");
        return;
      }

      if (
        !canConfirmPendingSale(
          userData,
          sale
        )
      ) {
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

      if (sale.dialogLink) {
        findClient(sale.dialogLink).catch(
          (error) => {
            console.warn(
              "Pending sale client lookup failed:",
              error
            );
          }
        );
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error.message ||
          "Не удалось загрузить временную продажу"
      );
      navigate("/pending-sales");
    } finally {
      setLoadingPending(false);
    }
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

  function enableLegacyClientMode() {
    setIsLegacyClientMode(true);
    setIsFromTtImportMode(false);
    setFoundClient(null);
    setDialogLookupStatus("");
    setDialogBlockedOwner(null);
    setDialogCollision(null);
  }

  function enableFromTtImportMode() {
    setIsFromTtImportMode(true);
    setIsLegacyClientMode(false);
    setFoundClient(null);
    setDialogLookupStatus("");
    setDialogBlockedOwner(null);
    setDialogCollision(null);
  }

  async function findClient(
    link,
    bsIdOverride = null
  ) {
    const requestId =
      ++dialogLookupRequestRef.current;

    setDialogLink(link);

    if (isLegacyClientMode) {
      setFoundClient(null);
      setDialogLookupStatus("");
      setDialogBlockedOwner(null);
      setDialogCollision(null);
      return;
    }

    setDialogLookupStatus("");
    setDialogBlockedOwner(null);
    setDialogCollision(null);
    setFoundClient(null);

    const explicitBsId =
      bsIdOverride?.trim?.() || "";

    if (!explicitBsId) {
      setClientNote("");
    }

    const lookup =
      await findClientByDialogLink(
        link,
        userData,
        explicitBsId
          ? { bsId: explicitBsId }
          : {}
      );

    if (
      requestId !==
      dialogLookupRequestRef.current
    ) {
      return;
    }

    setFoundClient(lookup.client);
    setDialogLookupStatus(
      lookup.status || ""
    );
    setDialogBlockedOwner(
      lookup.blockedOwner || null
    );
    setDialogCollision(
      lookup.collision || null
    );

    if (lookup.client && !isNewClient) {
      applyClientSource(lookup.client);

      const clientManager =
        lookup.client.manager ||
        getManagerNameById(
          lookup.client.managerId
        );

      if (clientManager) {
        setManager(clientManager);
      }
    }

    if (lookup.client && isNewClient) {
      if (lookup.client.name) {
        setClientName(lookup.client.name);
      }
      if (lookup.client.vkLink) {
        setVkLink(lookup.client.vkLink);
      }
      if (lookup.client.clientNote) {
        setClientNote(lookup.client.clientNote);
      }
    }
  }

  async function findClientWithBsId(bsId) {
    if (!dialogLink.trim()) {
      return;
    }

    await findClient(
      dialogLink,
      bsId
    );
  }

  function scheduleDialogLookup(
    link,
    bsIdOverride = null
  ) {
    if (dialogLookupTimerRef.current) {
      clearTimeout(
        dialogLookupTimerRef.current
      );
    }

    dialogLookupTimerRef.current =
      setTimeout(() => {
        findClient(
          link,
          bsIdOverride
        );
      }, 400);
  }

  useEffect(() => {
    return () => {
      if (dialogLookupTimerRef.current) {
        clearTimeout(
          dialogLookupTimerRef.current
        );
      }
    };
  }, []);

  function resetAfterSubmit() {
    setPaymentAmount("");
    setPaymentSystem("");
    setInvoiceNumber("");
    setPaymentComment("");
    setClientNote("");
    setPaymentDate("");
    setManualStartDate("");
    setCuratorStartDate("");
    setSelectedStream("");
    setIsLegacyClientMode(false);
    setIsFromTtImportMode(false);
    setDialogLookupStatus("");
    setDialogCollision(null);
  }

  function showVkSuccessHint(client) {
    if (client?.vkLink?.trim()) {
      return;
    }

    toast.info(
      "VK можно заполнить позже — напоминание создано"
    );
  }

  function showStartDateSuccessHint() {
    if (
      !isOptionalStartDateDealType(
        dealTypeId
      )
    ) {
      return;
    }

    if (getStartDateValue()?.trim()) {
      return;
    }

    toast.info(
      "Дату старта можно указать позже в «Продажи → Оплаты»"
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
        startDate: getStartDateValue(),
        curatorStartDate,
        firstContactDate: firstContact,
        budget: 0,
        ...getSourcePayload(),
        userData: actor,
        createdByUid,
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
      const message =
        error?.code === "permission-denied"
          ? "Нет прав на сохранение. Обновите страницу (Ctrl+Shift+R) и войдите снова."
          : error.message ||
            "Ошибка при сохранении";
      toast.error(message);
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

    if (payment.dialogLink?.trim()) {
      setDialogLink(payment.dialogLink.trim());
    }

    setLegacyTtDealTypeId(
      suggestLegacyTopupDealTypeId(
        payment.dealType
      )
    );
    if (payment.budget) {
      setBudget(String(payment.budget));
    }

    if (payment.startDate) {
      setSelectedStream(payment.startDate);
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

  function handleLegacySearchDialogLinkChange(
    value
  ) {
    setDialogLink(value);
    resetLegacyLookup();
  }

  function handleLegacyPaymentDialogLinkChange(
    value
  ) {
    setDialogLink(value);
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
        createdByUid,
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
        dialogLink:
          dialogLink.trim() ||
          profile?.dialogLink?.trim() ||
          "",
        vkLink: profile?.vkLink || vkLink,
        legacyClientName:
          profile?.legacyClientName ||
          profile?.clientName ||
          clientName,
        legacyClientBsId:
          clientNote.trim() ||
          profile?.legacyClientBsId ||
          profile?.clientNote ||
          "",
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
        startDate: getStartDateValue(),
        curatorStartDate,
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
        createdByUid,
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
      const message =
        error?.code === "permission-denied"
          ? "Нет прав на сохранение. Обновите страницу (Ctrl+Shift+R) и войдите снова."
          : error.message ||
            "Ошибка при сохранении";
      toast.error(message);
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
        startDate: getStartDateValue(),
        curatorStartDate,
        budget: needsBudgetFieldForExistingDeal(
          dealTypeId
        )
          ? parseMoneyNumber(budget)
          : null,
        ...getSourcePayload(),
        userData: actor,
        createdByUid,
      });

      if (
        await finalizePendingSaleConfirmation(
          result.payment?.id
        )
      ) {
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
      showStartDateSuccessHint();
    } catch (error) {
      toast.error(
        error.message ||
          "Ошибка при сохранении"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function addFromTtClientAndPayment() {
    if (!actor || !isFromTtImportMode) {
      return;
    }

    if (!dialogLink.trim()) {
      toast.error(
        "Укажите ссылку на диалог"
      );
      return;
    }

    if (!clientName.trim()) {
      toast.error("Укажите имя клиента");
      return;
    }

    if (!clientNote.trim()) {
      toast.error(
        "Укажите ID клиента из БС"
      );
      return;
    }

    if (!course) {
      toast.error("Выберите курс");
      return;
    }

    if (!tariff) {
      toast.error("Выберите тариф");
      return;
    }

    if (
      !isRejectDeal &&
      needsBudgetFieldForExistingDeal(
        dealTypeId
      ) &&
      !parseMoneyNumber(budget)
    ) {
      toast.error("Укажите бюджет");
      return;
    }

    if (!firstContact) {
      toast.error(
        "Укажите дату первого контакта"
      );
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
      const paymentAmountValue =
        resolvePaymentAmount();

      const client = await addClient({
        name: clientName.trim(),
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
        fromTt: true,
        ...getSourcePayload(),
        userData: actor,
        createdByUid,
      });

      const paymentResult =
        await createPayment({
          client,
          dealType: dealTypeLabel,
          paymentAmount:
            paymentAmountValue,
          paymentSystem,
          invoiceNumber,
          comment: paymentComment,
          clientNote:
            clientNote.trim(),
          manager,
          paymentDate,
          startDate,
          curatorStartDate,
          budget:
            needsBudgetFieldForExistingDeal(
              dealTypeId
            )
              ? parseMoneyNumber(
                  budget
                )
              : null,
          ...getSourcePayload(),
          userData: actor,
          createdByUid,
        });

      toast.success(
        isRejectDeal
          ? `${dealTypeLabel} сохранён`
          : `Клиент из ТТ сохранён: ${formatMoney(
              paymentAmountValue
            )}`
      );

      setIsFromTtImportMode(false);
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

  function requestSaveFromTt() {
    if (!actor || !isFromTtImportMode) {
      return;
    }

    if (!dialogLink.trim()) {
      toast.error(
        "Укажите ссылку на диалог"
      );
      return;
    }

    if (!clientName.trim()) {
      toast.error("Укажите имя клиента");
      return;
    }

    if (!clientNote.trim()) {
      toast.error(
        "Укажите ID клиента из БС"
      );
      return;
    }

    if (!course) {
      toast.error("Выберите курс");
      return;
    }

    if (!tariff) {
      toast.error("Выберите тариф");
      return;
    }

    if (
      !isRejectDeal &&
      needsBudgetFieldForExistingDeal(
        dealTypeId
      ) &&
      !parseMoneyNumber(budget)
    ) {
      toast.error("Укажите бюджет");
      return;
    }

    if (!firstContact) {
      toast.error(
        "Укажите дату первого контакта"
      );
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

    setConfirmSave("fromTt");
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

    if (
      !isDeferredProfile &&
      !budget
    ) {
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
        subscriptionStage: isBbDeal
          ? BB_BOOKING_STAGE
          : null,
        ...getSourcePayload(),
        userData: actor,
        createdByUid,
      });

      const paymentResult = await createPayment({
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
        curatorStartDate,
        ...getSourcePayload(),
        userData: actor,
        createdByUid,
      });

      try {
        await maybeNotifyMissingVkLink({
          client,
          payment: paymentResult?.payment,
          managerName: manager,
          userData: actor,
        });
      } catch (error) {
        console.warn(
          "Missing VK reminder skipped:",
          error
        );
      }

      if (
        await finalizePendingSaleConfirmation(
          paymentResult?.payment?.id
        )
      ) {
        return;
      }

      toast.success(
        isRejectDeal
          ? `${dealTypeLabel} сохранён`
          : `Оплата сохранена: ${formatMoney(
              resolvePaymentAmount()
            )}`
      );
      showVkSuccessHint(client);
      showStartDateSuccessHint();

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

    if (
      !isDeferredProfile &&
      !budget
    ) {
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
    } else if (confirmSave === "fromTt") {
      await addFromTtClientAndPayment();
    }

    setConfirmSave(null);
  }

  if (
    loadingPending ||
    (pendingSaleId && authLoading)
  ) {
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
        <div className="bg-brand/10 border border-brand/30 p-4 rounded-2xl text-sm">
          <div className="font-bold text-brand mb-1">
            Временная продажа
          </div>
          <div className="text-neutral-300">
            KPI и выручка будут начислены:{" "}
            <strong>
              {getManagerNameById(
                pendingSale.ownerManagerId
              )}
            </strong>
          </div>
          <Link
            to="/pending-sales"
            className="text-brand text-xs mt-2 inline-block hover:underline"
          >
            ← Назад к списку
          </Link>
        </div>
      )}

      <div className="bg-surface p-5 md:p-6 rounded-2xl max-w-2xl space-y-1">
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
                className="text-sm text-neutral-400 hover:text-neutral-200 mb-2"
              >
                ← Другой тип сделки
              </button>

              <input
                placeholder="Ссылка на диалог Bluesales"
                value={dialogLink}
                onChange={(e) =>
                  handleLegacySearchDialogLinkChange(
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
                  w-full bg-surface-raised hover:bg-surface-hover
                  border border-neutral-600 p-3.5
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
                    placeholder="Ссылка на диалог или ID диалога (например 106329923) *"
                    value={dialogLink}
                    onChange={(e) =>
                      handleLegacyPaymentDialogLinkChange(
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
                    <span className="text-sm text-neutral-400">
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

                    <StartDateField
                      dealTypeId={
                        streamDealTypeId
                      }
                      paymentDate={
                        paymentDate
                      }
                      isLegacyClientMode
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

                  <VkLinkInput
                    placeholder="Ссылка VK *"
                    value={vkLink}
                    onChange={setVkLink}
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
                    placeholder="Ссылка на диалог или ID диалога (например 106329923) *"
                    value={dialogLink}
                    onChange={(e) =>
                      setDialogLink(
                        e.target.value
                      )
                    }
                    className={inputClass}
                  />

                  <label className="block">
                    <span className="text-sm text-neutral-400">
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
                    <span className="text-sm text-neutral-400">
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
                    <span className="text-sm text-neutral-400">
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

                  <StartDateField
                    dealTypeId={streamDealTypeId}
                    paymentDate={paymentDate}
                    isLegacyClientMode
                    selectedStream={selectedStream}
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
                  {isDeferredProfile
                    ? "Тариф (необязательно)"
                    : "Тариф *"}
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

              <DeferredFieldHint
                visible={isDeferredProfile}
              />

              <MoneyInput
                placeholder={
                  isDeferredProfile
                    ? "Бюджет (необязательно)"
                    : "Бюджет *"
                }
                required={!isDeferredProfile}
                value={budget}
                onChange={setBudget}
                className={inputClass}
              />

              {showPaymentPlanMode && (
                <PaymentPlanModeBlock
                  paymentPlanMode={
                    paymentPlanMode
                  }
                  setPaymentPlanMode={
                    setPaymentPlanMode
                  }
                  nextInstallmentDue={
                    nextInstallmentDue
                  }
                  planRemain={planRemain}
                  effectiveBudget={
                    effectiveBudget
                  }
                  isBbDeal={isBbDeal}
                  paymentAmount={
                    paymentAmount
                  }
                  setPaymentAmount={
                    setPaymentAmount
                  }
                />
              )}

              <MoneyInput
                placeholder="Сумма оплаты *"
                required
                value={paymentAmount}
                onChange={setPaymentAmount}
                className={inputClass}
              />
            </FormSection>

            <FormSection title="Клиент">
              <label className="block">
                <FieldLabel
                  done={Boolean(
                    dialogLink.trim()
                  )}
                >
                  Ссылка на диалог *
                </FieldLabel>
                <input
                  placeholder="https://..."
                  value={dialogLink}
                  onChange={(e) =>
                    scheduleDialogLookup(
                      e.target.value
                    )
                  }
                  className={inputClass}
                />
              </label>

              {foundClient && (
                <ClientInCrmBadge
                  client={foundClient}
                />
              )}

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

              <VkLinkInput
                placeholder="Ссылка VK"
                value={vkLink}
                onChange={setVkLink}
                className={inputClass}
                showHint={false}
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
                <span className="text-sm text-neutral-400">
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
                <span className="text-sm text-neutral-400">
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
                dealTypeId={streamDealTypeId}
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

              {showCuratorStartDate && (
                <CuratorStartDateField
                  value={curatorStartDate}
                  onChange={
                    setCuratorStartDate
                  }
                  inputClass={inputClass}
                />
              )}
            </FormSection>

            <FormSection title="Источник">
              <label className="block">
                <span className="text-sm text-neutral-400">
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
                  w-full crm-btn-primary
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
                <FieldLabel done={dealTypeKnown}>
                  Тип сделки *
                </FieldLabel>
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
                <label className="block">
                  <FieldLabel
                    done={Boolean(
                      dialogLink.trim()
                    )}
                  >
                    Ссылка на диалог *
                  </FieldLabel>
                  <input
                    placeholder="https://..."
                    value={dialogLink}
                    onChange={(e) =>
                      scheduleDialogLookup(
                        e.target.value
                      )
                    }
                    className={inputClass}
                  />
                </label>

                {foundClient &&
                  !isLegacyClientMode &&
                  !isFromTtImportMode && (
                  <ClientInCrmBadge
                    client={foundClient}
                  />
                )}

                {dialogLink &&
                  !foundClient &&
                  !isLegacyClientMode &&
                  !isFromTtImportMode &&
                  dialogLookupStatus ===
                    "bs_id_mismatch" && (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-sm text-amber-100 space-y-2">
                      <p>
                        По ссылке в CRM числится{" "}
                        <strong>
                          {dialogCollision?.client
                            ?.name ||
                            "другой клиент"}
                        </strong>
                        {dialogCollision?.paymentBsId
                          ? ` (ID БС ${dialogCollision.paymentBsId})`
                          : ""}
                        , но вы вносите ID БС{" "}
                        <strong>
                          {clientNote.trim()}
                        </strong>
                        . Это разные люди.
                      </p>
                      <p>
                        Если клиент только в Google ТТ
                        — нажмите «Продолжить как
                        старый клиент» и заполните
                        данные вручную.
                      </p>
                      <button
                        type="button"
                        onClick={
                          enableLegacyClientMode
                        }
                        className="
                          w-full bg-amber-500/20
                          hover:bg-amber-500/30
                          border border-amber-500/40
                          p-3 rounded-xl font-semibold
                          text-amber-50
                        "
                      >
                        Продолжить как старый клиент
                      </button>
                    </div>
                  )}

                {dialogLink &&
                  !foundClient &&
                  !isLegacyClientMode &&
                  dialogLookupStatus ===
                    "dialog_client_mismatch" && (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-sm text-amber-100 space-y-2">
                      <p>
                        В CRM есть битая запись: у
                        оплаты указана эта ссылка (
                        {dialogCollision?.paymentDialogId ||
                          "?"}
                        ), но в карточке клиента{" "}
                        <strong>
                          {dialogCollision?.client
                            ?.name ||
                            "другой человек"}
                        </strong>{" "}
                        — другая (
                        {dialogCollision?.clientDialogId ||
                          "?"}
                        ). Карточка клиента важнее
                        старой оплаты.
                      </p>
                      <p>
                        Если это ваш лид только из
                        Google ТТ — нажмите «Продолжить
                        как старый клиент».
                      </p>
                      <button
                        type="button"
                        onClick={
                          enableLegacyClientMode
                        }
                        className="
                          w-full bg-amber-500/20
                          hover:bg-amber-500/30
                          border border-amber-500/40
                          p-3 rounded-xl font-semibold
                          text-amber-50
                        "
                      >
                        Продолжить как старый клиент
                      </button>
                    </div>
                  )}

                {dialogLink &&
                  !foundClient &&
                  !isLegacyClientMode &&
                  dialogLookupStatus ===
                    "access_denied" && (
                    <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-sm text-red-100 space-y-2">
                      <p>
                        По этой ссылке в CRM уже есть
                        запись
                        {dialogBlockedOwner?.managerLabel
                          ? ` у менеджера ${dialogBlockedOwner.managerLabel}`
                          : " у другого менеджера"}
                        {dialogBlockedOwner?.dealType
                          ? ` (${dialogBlockedOwner.dealType})`
                          : ""}
                        . Это не обязательно ваша
                        продажа — коллега мог внести
                        этого клиента раньше.
                      </p>
                      <p>
                        Если клиент из Google ТТ и вы
                        его ещё не вносили — вернитесь
                        на шаг «Тип сделки» и выберите{" "}
                        <strong>
                          «Клиент из таблицы (без
                          карточки CRM)»
                        </strong>
                        , затем снова вставьте ссылку.
                      </p>
                      <p>
                        Если это ваш диалог, а менеджер
                        указан неверно — напишите
                        руководителю.
                      </p>
                    </div>
                  )}

                {dialogLink &&
                  !foundClient &&
                  !isLegacyClientMode &&
                  dialogLookupStatus !==
                    "access_denied" &&
                  dialogLookupStatus !==
                    "bs_id_mismatch" &&
                  dialogLookupStatus !==
                    "dialog_client_mismatch" && (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-sm text-amber-100 space-y-3">
                      <p>
                        Клиент не найден в CRM по
                        этой ссылке. Если он был в
                        Google ТТ — нажмите кнопку
                        ниже и заполните карточку.
                      </p>
                      <button
                        type="button"
                        onClick={
                          enableFromTtImportMode
                        }
                        className="
                          w-full bg-amber-500/20
                          hover:bg-amber-500/30
                          border border-amber-500/40
                          p-3 rounded-xl font-semibold
                          text-amber-50
                        "
                      >
                        Продолжить как из ТТ
                      </button>
                    </div>
                  )}

                {isFromTtImportMode && (
                  <div className="bg-violet-500/10 border border-violet-500/30 p-4 rounded-xl text-sm text-violet-100">
                    ☑ Клиент из Google ТТ — будет
                    создана карточка с пометкой{" "}
                    <strong>«Из ТТ»</strong>.
                    Заполните данные полностью.
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

                {(isLegacyClientMode ||
                  isFromTtImportMode) && (
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

                    <VkLinkInput
                      placeholder="Ссылка VK *"
                      value={vkLink}
                      onChange={setVkLink}
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
                  onChange={(e) => {
                    const value =
                      e.target.value;
                    setClientNote(value);

                    if (
                      !isLegacyClientMode &&
                      dialogLink.trim()
                    ) {
                      findClientWithBsId(
                        value
                      );
                    }
                  }}
                  className={inputClass}
                />
              </FormSection>

              {(foundClient ||
                isLegacyClientMode ||
                isFromTtImportMode) && (
                <>
                  {!isRejectDeal && (
                    <FormSection title="Сделка">
                      {needsBudgetFieldForExistingDeal(
                        dealTypeId
                      ) && (
                        <label className="block">
                          <FieldLabel
                            done={
                              parseMoneyNumber(
                                budget
                              ) > 0
                            }
                          >
                            Бюджет (сумма тарифа)
                            {isDeferredPaymentProfileDealType(
                              dealTypeId
                            )
                              ? ""
                              : " *"}
                          </FieldLabel>
                          <MoneyInput
                            placeholder=""
                            required={
                              !isDeferredPaymentProfileDealType(
                                dealTypeId
                              )
                            }
                            value={budget}
                            onChange={setBudget}
                            className={inputClass}
                          />
                          <DeferredFieldHint
                            visible={isDeferredPaymentProfileDealType(
                              dealTypeId
                            )}
                          />
                        </label>
                      )}

                      {showPaymentPlanMode && (
                        <PaymentPlanModeBlock
                          paymentPlanMode={
                            paymentPlanMode
                          }
                          setPaymentPlanMode={
                            setPaymentPlanMode
                          }
                          nextInstallmentDue={
                            nextInstallmentDue
                          }
                          planRemain={
                            planRemain
                          }
                          effectiveBudget={
                            effectiveBudget
                          }
                          isBbDeal={isBbDeal}
                          paymentAmount={
                            paymentAmount
                          }
                          setPaymentAmount={
                            setPaymentAmount
                          }
                        />
                      )}

                      <label className="block">
                        <FieldLabel
                          done={
                            parseMoneyNumber(
                              paymentAmount
                            ) > 0
                          }
                        >
                          {dealTypeId ===
                          "refund"
                            ? "Сумма возврата *"
                            : "Сумма оплаты *"}
                        </FieldLabel>
                        <MoneyInput
                          placeholder=""
                          required
                          value={paymentAmount}
                          onChange={
                            setPaymentAmount
                          }
                          className={inputClass}
                        />
                      </label>
                    </FormSection>
                  )}

                  <FormSection title="Даты">
                    <label className="block">
                      <FieldLabel
                        done={Boolean(
                          paymentDate
                        )}
                      >
                        Дата оплаты *
                      </FieldLabel>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) =>
                          setPaymentDate(
                            e.target.value
                          )
                        }
                        className={inputClass}
                      />
                    </label>

                    {needsManualClientProfileFields && (
                      <label className="block">
                        <span className="text-sm text-neutral-400">
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
                      dealTypeId={
                        streamDealTypeId
                      }
                      paymentDate={
                        paymentDate
                      }
                      isLegacyClientMode={
                        isLegacyClientMode
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

                    {showCuratorStartDate && (
                      <CuratorStartDateField
                        value={
                          curatorStartDate
                        }
                        onChange={
                          setCuratorStartDate
                        }
                        inputClass={
                          inputClass
                        }
                      />
                    )}
                  </FormSection>

                  {needsManualClientProfileFields && (
                    <FormSection title="Источник">
                      <label className="block">
                        <span className="text-sm text-neutral-400">
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
                    <label className="block">
                      <FieldLabel
                        done={Boolean(
                          paymentSystem
                        )}
                      >
                        Платежная система *
                      </FieldLabel>
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
                          Выберите систему
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
                    </label>

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
                        isFromTtImportMode
                          ? requestSaveFromTt
                          : isLegacyClientMode
                            ? requestSaveLegacyClient
                            : requestSaveExisting
                      }
                      disabled={submitting}
                      className="
                        w-full crm-btn-primary
                        hover:bg-green-600 p-4
                        rounded-xl font-bold
                        disabled:opacity-50
                      "
                    >
                      {submitting
                        ? "Сохранение..."
                        : isFromTtImportMode
                          ? isRejectDeal
                            ? "Сохранить отказ (из ТТ)"
                            : "Сохранить клиента из ТТ"
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
            <FieldLabel done={false}>
              Тип сделки *
            </FieldLabel>
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
