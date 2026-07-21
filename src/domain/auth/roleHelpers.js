import {
  ROLES,
  ROLE_LABELS,
} from "../../constants/roles";
import { auth } from "../../services/firebase.js";
import {
  resolveManagerIdFromLegacy,
  resolveManagerIdFromEmail,
  normalizeManagerFields,
  expandManagerIdAliases,
  canonicalManagerId,
} from "./managerMigration";
import {
  getManagerNameById,
} from "../../constants/managers";
import {
  getFirestoreManagerIdByEmail,
} from "../../constants/firestoreManagerIds";
import {
  getProvisionProfileForEmail,
} from "../../constants/provisionProfiles";

function getProvisionRoleForUser(userData) {
  return getProvisionProfileForEmail(
    userData?.email
  )?.role;
}

function hasProvisionRole(
  userData,
  role
) {
  return (
    getProvisionRoleForUser(userData)
    === role
  );
}

export function isAdmin(userData) {
  return (
    userData?.role === ROLES.ADMIN
    || hasProvisionRole(
      userData,
      ROLES.ADMIN
    )
  );
}

export function isRop(userData) {
  return (
    userData?.role === ROLES.ROP
    || hasProvisionRole(
      userData,
      ROLES.ROP
    )
  );
}

export function isManager(userData) {
  if (userData?.role === ROLES.MANAGER) {
    return true;
  }

  if (
    isLeadership(userData) ||
    userData?.role === ROLES.ADMIN ||
    userData?.role === ROLES.ROP
  ) {
    return false;
  }

  return Boolean(
    getFirestoreManagerId(userData) ||
    userData?.managerId ||
    userData?.firestoreManagerId
  );
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

function resolveManagerIdFromDisplayName(name) {
  switch (name) {
    case "Катя":
    case "Катя Бакаева":
      return "katya_bakaeva";
    case "Руслан":
    case "Руслан Романюк":
    case "Руслан Р":
      return "ruslan_romanyuk";
    case "Полина":
    case "Полина Пенькова":
      return "polina_penkova";
    case "Полина Пламадяла":
      return "polina_plamadya";
    case "Сергей Гребенщиков":
    case "Сергей Г":
      return "sergey_grebenshchikov";
    case "Денис Мануйлов":
    case "Денис М":
      return "denis_manuilov";
    case "Андрей Волков":
    case "Андрей В":
      return "andrey_volkov";
    case "Александр Симанов":
    case "Александр С":
      return "alexander_simanov";
    case "Виолетта Петрова":
    case "Виолетта П":
      return "vilu_petrova";
    default:
      return null;
  }
}

function managerIdFromAuthEmail(authEmail) {
  if (!authEmail) {
    return null;
  }

  const local = authEmail
    .toLowerCase()
    .split("@")[0];

  switch (local) {
    case "katya":
    case "katya_bakaeva":
      return "katya_bakaeva";
    case "denis":
    case "denis_manuilov":
      return "denis_manuilov";
    case "ruslan":
    case "ruslan_romanyuk":
      return "ruslan_romanyuk";
    case "alexander":
    case "alexander_simanov":
      return "alexander_simanov";
    case "sergey":
    case "sergey_grebenshchikov":
      return "sergey_grebenshchikov";
    case "andrey":
    case "andrey_volkov":
      return "andrey_volkov";
    case "polina.p":
    case "polina_penkova":
      return "polina_penkova";
    case "polina.pl":
    case "polina_plamadya":
      return "polina_plamadya";
    case "vilu":
    case "vilu_petrova":
    case "violeta":
    case "violeta_petrova":
      return "vilu_petrova";
    default:
      return null;
  }
}

/** Same priority as firestore.rules effectiveOwnerManagerId(). */
export function getEffectiveOwnerManagerId(userData) {
  if (!userData) {
    return null;
  }

  const authEmail =
    auth.currentUser?.email ??
    userData.email ??
    null;

  const fromEmail =
    managerIdFromAuthEmail(authEmail);

  if (fromEmail != null) {
    return fromEmail;
  }

  const fromName =
    resolveManagerIdFromDisplayName(
      userData.name
    );

  if (fromName != null) {
    return fromName;
  }

  const rawManagerId =
    userData.firestoreManagerId ??
    userData.managerId;

  if (
    rawManagerId != null &&
    rawManagerId !== ""
  ) {
    return canonicalManagerId(rawManagerId);
  }

  return null;
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

  if (fromDoc) {
    return canonicalManagerId(fromDoc);
  }

  if (userData.role === ROLES.MANAGER) {
    if (userData.name) {
      const fromName =
        resolveManagerIdFromLegacy(
          userData.name
        );

      if (fromName) {
        return canonicalManagerId(
          fromName
        );
      }
    }

    if (userData.email) {
      const fromEmail =
        resolveManagerIdFromEmail(
          userData.email
        );

      if (fromEmail) {
        return canonicalManagerId(
          fromEmail
        );
      }
    }
  }

  if (userData.managerId) {
    return canonicalManagerId(
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

  const fromEmail =
    getFirestoreManagerIdByEmail(
      userData.email
    );

  if (fromEmail) {
    return fromEmail;
  }

  if (userData.managerId) {
    return userData.managerId;
  }

  return null;
}

export function getManagerIdsForScopedQuery(
  userData
) {
  const firestoreId =
    getFirestoreManagerId(userData);
  const resolvedId =
    getCurrentManagerId(userData);

  return [
    ...new Set(
      [firestoreId, resolvedId]
        .flatMap((id) =>
          expandManagerIdAliases(id)
        )
        .filter(Boolean)
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

  const provisionRole =
    getProvisionRoleForUser(userData);

  const role = isValidRoleValue(provisionRole)
    ? provisionRole
    : isValidRoleValue(userData.role)
      ? userData.role
      : ROLES.MANAGER;

  const firestoreManagerId =
    userData.managerId || null;

  let managerId = firestoreManagerId;
  let name = userData.name || "";

  if (managerId) {
    managerId = canonicalManagerId(
      resolveManagerIdFromLegacy(
        managerId
      ) || managerId
    );
  }

  if (role === ROLES.MANAGER) {
    if (!managerId && name) {
      const resolved =
        resolveManagerIdFromLegacy(name);

      if (resolved) {
        managerId =
          canonicalManagerId(resolved);
      }
    }

    if (!managerId && userData.email) {
      const fromEmail =
        resolveManagerIdFromEmail(
          userData.email
        );

      if (fromEmail) {
        managerId =
          canonicalManagerId(fromEmail);
      }
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

/** managerId for Firestore writes — matches rules effectiveOwnerManagerId(). */
export function resolveOwnershipManagerFieldsForWrite(
  userData,
  selectedManager = ""
) {
  if (isLeadership(userData)) {
    return normalizeManagerFields({
      manager: selectedManager,
    });
  }

  const managerId =
    getFirestoreManagerId(userData) ??
    getEffectiveOwnerManagerId(userData) ??
    getCurrentManagerId(userData);

  if (managerId) {
    const canonicalId =
      canonicalManagerId(managerId);

    return {
      managerId: canonicalId,
      manager:
        getManagerNameById(canonicalId) ||
        userData?.name?.trim() ||
        selectedManager?.trim() ||
        "",
    };
  }

  return normalizeManagerFields({
    manager: selectedManager,
  });
}

/** Canonical manager id for client/payment create rules. */
export function resolveManagerFieldsForWrite(
  userData,
  selectedManager = ""
) {
  return resolveOwnershipManagerFieldsForWrite(
    userData,
    selectedManager
  );
}

function isValidRoleValue(role) {
  return (
    role === ROLES.ADMIN ||
    role === ROLES.ROP ||
    role === ROLES.MANAGER
  );
}
