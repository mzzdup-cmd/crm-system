import { ROLES } from "../../constants/roles";
import {
  resolveManagerIdFromLegacy,
} from "./managerMigration";
import {
  getManagerNameById,
} from "../../constants/managers";

export function isAdmin(userData) {
  return userData?.role === ROLES.ADMIN;
}

export function isManager(userData) {
  return userData?.role === ROLES.MANAGER;
}

export function getCurrentManagerId(userData) {
  if (!userData) {
    return null;
  }

  if (userData.managerId) {
    return userData.managerId;
  }

  if (userData.name) {
    return resolveManagerIdFromLegacy(
      userData.name
    );
  }

  return null;
}

export function normalizeUserRole(userData) {
  if (!userData) {
    return null;
  }

  const role =
    userData.role === ROLES.ADMIN
      ? ROLES.ADMIN
      : ROLES.MANAGER;

  let managerId = userData.managerId || null;
  let name = userData.name || "";

  if (role === ROLES.MANAGER) {
    if (!managerId && name) {
      managerId =
        resolveManagerIdFromLegacy(name);
    }

    if (managerId && !name) {
      name =
        getManagerNameById(managerId) ||
        name;
    }
  }

  return {
    ...userData,
    role,
    managerId:
      role === ROLES.ADMIN
        ? null
        : managerId,
    name,
  };
}
