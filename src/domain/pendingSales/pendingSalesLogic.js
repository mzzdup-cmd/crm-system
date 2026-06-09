import {
  isAdmin,
  getCurrentManagerId,
} from "../auth/roleHelpers";

import {
  getManagerShiftInfo,
} from "../schedule/scheduleLogic";

import {
  getManagerNameById,
} from "../../constants/managers";

import {
  PENDING_SALE_STATUS,
} from "../../constants/pendingSales";

export function getCoveringTargets(
  schedule,
  managerId
) {
  if (!schedule || !managerId) {
    return [];
  }

  const shiftInfo = getManagerShiftInfo(
    schedule,
    managerId
  );

  if (shiftInfo?.coveringFor) {
    return [shiftInfo.coveringFor];
  }

  return [];
}

export function canCreatePendingSale(
  userData,
  schedule,
  ownerManagerId
) {
  if (!userData || !ownerManagerId) {
    return false;
  }

  const creatorId =
    getCurrentManagerId(userData);

  if (!creatorId) {
    return false;
  }

  if (creatorId === ownerManagerId) {
    return false;
  }

  if (isAdmin(userData)) {
    return true;
  }

  const targets = getCoveringTargets(
    schedule,
    creatorId
  );

  return targets.includes(ownerManagerId);
}

export function getQuickSaleButtonLabel(
  coveringTargets
) {
  if (coveringTargets?.length === 1) {
    const name =
      getManagerNameById(
        coveringTargets[0]
      ) || "коллегу";

    return `⚡ Быстрая продажа за ${name}`;
  }

  return "⚡ Быстрая продажа";
}

export function getQuickSaleModalTitle(
  ownerManagerId
) {
  if (!ownerManagerId) {
    return "⚡ Быстрая продажа";
  }

  const name =
    getManagerNameById(ownerManagerId) ||
    "коллегу";

  return `⚡ Быстрая продажа за ${name}`;
}

export function canConfirmPendingSale(
  userData,
  pendingSale
) {
  if (!userData || !pendingSale) {
    return false;
  }

  if (pendingSale.status !== PENDING_SALE_STATUS.PENDING) {
    return false;
  }

  if (isAdmin(userData)) {
    return true;
  }

  const managerId =
    getCurrentManagerId(userData);

  return (
    managerId &&
    pendingSale.ownerManagerId === managerId
  );
}

export function validatePendingSaleInput({
  ownerManagerId,
  dialogLink,
  amount,
  paymentDate,
}) {
  if (!ownerManagerId) {
    return "Выберите менеджера";
  }

  if (!dialogLink?.trim()) {
    return "Укажите ссылку на диалог";
  }

  if (!amount || Number(amount) <= 0) {
    return "Укажите сумму";
  }

  if (!paymentDate) {
    return "Укажите дату";
  }

  return null;
}
