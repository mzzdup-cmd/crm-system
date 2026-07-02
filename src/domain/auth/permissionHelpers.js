import {
  isLeadership,
  getEffectiveOwnerManagerId,
} from "./roleHelpers";

import {
  resolveManagerIdFromLegacy,
  expandManagerIdAliases,
} from "./managerMigration";

export function canViewAll(userData) {
  return isLeadership(userData);
}

export function canManageTeam(userData) {
  return isLeadership(userData);
}

function managerIdsMatch(
  leftId,
  rightId
) {
  if (!leftId || !rightId) {
    return false;
  }

  const leftAliases =
    expandManagerIdAliases(leftId);
  const rightAliases =
    expandManagerIdAliases(rightId);

  return leftAliases.some((left) =>
    rightAliases.includes(left)
  );
}

export function canAccessByManagerId(
  userData,
  managerId,
  managerName
) {
  if (!userData) {
    return false;
  }

  if (isLeadership(userData)) {
    return true;
  }

  const currentManagerId =
    getEffectiveOwnerManagerId(userData);

  if (
    currentManagerId &&
    managerId
  ) {
    return managerIdsMatch(
      currentManagerId,
      managerId
    );
  }

  if (
    managerName &&
    userData.name
  ) {
    return (
      managerName === userData.name
    );
  }

  return false;
}

export function canAccessClient(
  userData,
  client
) {
  if (!client || !userData) {
    return false;
  }

  if (isLeadership(userData)) {
    return true;
  }

  const clientManagerId =
    client.managerId ||
    resolveManagerIdFromLegacy(
      client.manager
    );

  return canAccessByManagerId(
    userData,
    clientManagerId,
    client.manager
  );
}

export function canAccessPayment(
  userData,
  payment
) {
  if (!payment || !userData) {
    return false;
  }

  if (isLeadership(userData)) {
    return true;
  }

  const paymentManagerId =
    payment.managerId ||
    resolveManagerIdFromLegacy(
      payment.manager
    );

  return canAccessByManagerId(
    userData,
    paymentManagerId,
    payment.manager
  );
}

export function filterByManagerAccess(
  items,
  userData,
  getManagerFields
) {
  if (canViewAll(userData)) {
    return items;
  }

  return items.filter((item) => {
    const { managerId, manager } =
      getManagerFields(item);

    return canAccessByManagerId(
      userData,
      managerId,
      manager
    );
  });
}
