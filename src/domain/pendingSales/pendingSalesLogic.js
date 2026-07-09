import {
  isLeadership,
  getEffectiveOwnerManagerId,
} from "../auth/roleHelpers";

import {
  managerIdsMatch,
} from "../auth/managerMigration";

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
    getEffectiveOwnerManagerId(userData);

  if (!creatorId) {
    return false;
  }

  if (managerIdsMatch(creatorId, ownerManagerId)) {
    return false;
  }

  if (isLeadership(userData)) {
    return true;
  }

  return (
    !!creatorId &&
    !managerIdsMatch(
      creatorId,
      ownerManagerId
    )
  );
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

  if (isLeadership(userData)) {
    return true;
  }

  const managerId =
    getEffectiveOwnerManagerId(userData);

  return (
    managerId &&
    managerIdsMatch(
      pendingSale.ownerManagerId,
      managerId
    )
  );
}

export function canDeletePendingSale(
  userData,
  pendingSale
) {
  if (!userData || !pendingSale) {
    return false;
  }

  return isLeadership(userData);
}

export function pendingSaleHasTtExport(
  pendingSale
) {
  if (!pendingSale) {
    return false;
  }

  return (
    pendingSale.syncedToTt === true ||
    pendingSale.syncedToSheets === true ||
    Boolean(pendingSale.ttRowNumber) ||
    Boolean(pendingSale.ttUpdatedRange)
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
