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
  getManagerById,
} from "../../constants/managers";
import {
  normalizeManagerFields,
} from "./managerMigration";

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

/** Canonical manager id for app logic (aliases resolved). */
export function getCurrentManagerId(userData) {
  if (!userData) {
    return null;
  }

  const fromDoc = userData.managerId
    ? resolveManagerIdFromLegacy(
        userData.managerId
      )
    : null;

  if (
    fromDoc &&
    getManagerById(fromDoc)
  ) {
    return fromDoc;
  }

  if (userData.role === ROLES.MANAGER) {
    if (userData.name) {
      const fromName =
        resolveManagerIdFromLegacy(
          userData.name
        );

      if (fromName) {
        return fromName;
      }
    }

    if (userData.email) {
      const fromEmail =
        resolveManagerIdFromEmail(
          userData.email
        );

      if (fromEmail) {
        return fromEmail;
      }
    }
  }

  if (userData.managerId) {
    return (
      resolveManagerIdFromLegacy(
        userData.managerId
      ) || userData.managerId
    );
  }

  return null;
}

/**
 * Raw managerId from Firestore users/{uid}.
 * Security rules compare against this value, not canonical aliases.
 */
export function getFirestoreManagerId(userData) {
  if (!userData) {
    return null;
  }

  if (userData.firestoreManagerId) {
    return userData.firestoreManagerId;
  }

  return getCurrentManagerId(userData);
}

export function getManagerIdsForScopedQuery(
  userData
) {
  const rawId =
    userData?.firestoreManagerId ??
    null;
  const resolvedId =
    getCurrentManagerId(userData);

  return [
    ...new Set(
      [rawId, resolvedId].filter(Boolean)
    ),
  ];
}

export function getManagerNamesForScopedQuery(
  userData
) {
  const names = new Set();

  if (userData?.name?.trim()) {
    names.add(userData.name.trim());
  }

  const managerId =
    getCurrentManagerId(userData);
  const managerName =
    getManagerNameById(managerId);

  if (managerName) {
    names.add(managerName);
  }

  return [...names];
}

export function getManagerScopeKeys(userData) {
  return {
    managerIds:
      getManagerIdsForScopedQuery(userData),
    managerNames:
      getManagerNamesForScopedQuery(
        userData
      ),
  };
}

export function normalizeUserRole(userData) {
  if (!userData) {
    return null;
  }

  const role = isValidRoleValue(userData.role)
    ? userData.role
    : ROLES.MANAGER;

  const firestoreManagerId =
    userData.managerId || null;

  let managerId = firestoreManagerId;
  let name = userData.name || "";

  if (managerId) {
    managerId =
      resolveManagerIdFromLegacy(managerId) ||
      managerId;
  }

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
    firestoreManagerId:
      role === ROLES.MANAGER
        ? firestoreManagerId
        : null,
    name,
  };
}

/** Manager id + display name for Firestore writes (managers always own their rows). */
export function resolveManagerFieldsForWrite(
  userData,
  selectedManager = ""
) {
  if (isLeadership(userData)) {
    return normalizeManagerFields({
      manager: selectedManager,
    });
  }

  const fromProfile =
    getCurrentManagerId(userData);

  if (fromProfile) {
    return {
      managerId: fromProfile,
      manager:
        getManagerNameById(fromProfile) ||
        userData?.name?.trim() ||
        selectedManager?.trim() ||
        "",
    };
  }

  return normalizeManagerFields({
    manager: selectedManager,
  });
}

function isValidRoleValue(role) {
  return (
    role === ROLES.ADMIN ||
    role === ROLES.ROP ||
    role === ROLES.MANAGER
  );
}
