import {
  ROLES,
  ROLE_LABELS,
} from "../../constants/roles";
import {
  resolveManagerIdFromLegacy,
  resolveManagerIdFromEmail,
} from "./managerMigration";
import {
  getManagerNameById,
} from "../../constants/managers";

export function isAdmin(userData) {
  return userData?.role === ROLES.ADMIN;
}

export function isRop(userData) {
  return userData?.role === ROLES.ROP;
}

export function isManager(userData) {
  return userData?.role === ROLES.MANAGER;
}

export function isLeadership(userData) {
  return (
    isAdmin(userData) ||
    isRop(userData)
  );
}

export function getRoleLabel(userData) {
  if (!userData?.role) {
    return "";
  }

  return (
    ROLE_LABELS[userData.role] ||
    userData.role
  );
}

export function getCurrentManagerId(userData) {
  if (!userData) {
    return null;
  }

  if (userData.managerId) {
    return userData.managerId;
  }

  if (userData.role === ROLES.MANAGER) {
    if (userData.name) {
      const fromName = resolveManagerIdFromLegacy(
        userData.name
      );

      if (fromName) {
        return fromName;
      }
    }

    if (userData.email) {
      return resolveManagerIdFromEmail(
        userData.email
      );
    }
  }

  return null;
}

export function normalizeUserRole(userData) {
  if (!userData) {
    return null;
  }

  const role = isValidRoleValue(userData.role)
    ? userData.role
    : ROLES.MANAGER;

  let managerId = userData.managerId || null;
  let name = userData.name || "";

  if (role === ROLES.MANAGER) {
    if (!managerId && name) {
      managerId =
        resolveManagerIdFromLegacy(name);
    }

    if (!managerId && userData.email) {
      managerId = resolveManagerIdFromEmail(
        userData.email
      );
    }

    if (managerId && !name) {
      name =
        getManagerNameById(managerId) ||
        name;
    }
  }

  if (
    role === ROLES.ADMIN ||
    role === ROLES.ROP
  ) {
    managerId = null;
  }

  return {
    ...userData,
    role,
    managerId,
    name,
  };
}

function isValidRoleValue(role) {
  return (
    role === ROLES.ADMIN ||
    role === ROLES.ROP ||
    role === ROLES.MANAGER
  );
}
