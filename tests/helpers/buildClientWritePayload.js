import {
  getManagerById,
  getManagerNameById,
} from "../../src/constants/managers.js";

const ROLES = {
  ADMIN: "admin",
  ROP: "rop",
  MANAGER: "manager",
};

const LEGACY_MANAGER_ALIASES = {
  polina_plamadyala: "polina_plamadya",
  vilu_petrova: "violeta_petrova",
  denis: "denis_manuilov",
  ruslan: "ruslan_romanyuk",
  alexander: "alexander_simanov",
  sergey: "sergey_grebenshchikov",
  andrey: "andrey_volkov",
  katya: "katya_bakaeva",
  vilu: "violeta_petrova",
  violeta: "violeta_petrova",
  "Катя": "katya_bakaeva",
  "Руслан": "ruslan_romanyuk",
  "Руслан Р": "ruslan_romanyuk",
  "Полина": "polina_penkova",
  "Сергей Г": "sergey_grebenshchikov",
  "Денис М": "denis_manuilov",
  "Андрей В": "andrey_volkov",
  "Александр С": "alexander_simanov",
  "Виолетта П": "violeta_petrova",
  "Полина Пламадяла": "polina_plamadya",
};

const MANAGER_EMAIL_LOCAL_IDS = {
  denis: "denis_manuilov",
  ruslan: "ruslan_romanyuk",
  alexander: "alexander_simanov",
  sergey: "sergey_grebenshchikov",
  andrey: "andrey_volkov",
  "polina.p": "polina_penkova",
  "polina.pl": "polina_plamadya",
  katya: "katya_bakaeva",
  vilu: "violeta_petrova",
  violeta: "violeta_petrova",
};

function isLeadership(userData) {
  return (
    userData?.role === ROLES.ADMIN ||
    userData?.role === ROLES.ROP
  );
}

function resolveManagerIdFromLegacy(value) {
  if (!value) {
    return null;
  }

  if (getManagerById(value)) {
    return value;
  }

  if (LEGACY_MANAGER_ALIASES[value]) {
    return LEGACY_MANAGER_ALIASES[value];
  }

  return null;
}

function resolveManagerIdFromEmail(email) {
  if (!email || !email.includes("@")) {
    return null;
  }

  const local = email
    .split("@")[0]
    .trim()
    .toLowerCase();

  return MANAGER_EMAIL_LOCAL_IDS[local] ?? null;
}

function getCurrentManagerId(userData) {
  if (!userData) {
    return null;
  }

  const fromDoc = userData.managerId
    ? resolveManagerIdFromLegacy(
        userData.managerId
      )
    : null;

  if (fromDoc && getManagerById(fromDoc)) {
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

function normalizeManagerFields(data = {}) {
  if (data.managerId) {
    const resolvedId =
      resolveManagerIdFromLegacy(
        data.managerId
      ) || data.managerId;
    const manager =
      getManagerById(resolvedId);

    return {
      managerId: resolvedId,
      manager:
        manager?.name ||
        data.manager ||
        "",
    };
  }

  if (data.manager) {
    const managerId =
      resolveManagerIdFromLegacy(
        data.manager
      );

    if (managerId) {
      return {
        managerId,
        manager:
          getManagerById(managerId)?.name ||
          data.manager,
      };
    }

    return {
      managerId: null,
      manager: data.manager,
    };
  }

  return {
    managerId: null,
    manager: "",
  };
}

function managerIdFromAuthEmail(email) {
  if (!email || !email.includes("@")) {
    return null;
  }

  const local = email
    .split("@")[0]
    .trim()
    .toLowerCase();

  return MANAGER_EMAIL_LOCAL_IDS[local] ?? null;
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
    default:
      return resolveManagerIdFromLegacy(name);
  }
}

function getEffectiveOwnerManagerId(userData) {
  if (!userData) {
    return null;
  }

  const fromEmail = managerIdFromAuthEmail(
    userData.email
  );

  if (fromEmail) {
    return fromEmail;
  }

  const fromName =
    resolveManagerIdFromDisplayName(
      userData.name
    );

  if (fromName) {
    return fromName;
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

function resolveManagerFieldsForWrite(
  userData,
  selectedManager = ""
) {
  if (isLeadership(userData)) {
    return normalizeManagerFields({
      manager: selectedManager,
    });
  }

  const managerId =
    getEffectiveOwnerManagerId(userData);

  if (managerId) {
    return {
      managerId,
      manager:
        getManagerNameById(managerId) ||
        userData?.name?.trim() ||
        selectedManager?.trim() ||
        "",
    };
  }

  return normalizeManagerFields({
    manager: selectedManager,
  });
}

function buildCreateAudit(userData, authUid = null) {
  const now = Date.now();
  const uid =
    authUid ||
    userData?.uid ||
    userData?.id ||
    null;

  if (!uid) {
    return {
      createdAt: now,
      updatedAt: now,
    };
  }

  return {
    createdAt: now,
    createdByUid: uid,
    updatedAt: now,
    updatedByUid: uid,
  };
}

function normalizeClientPayload(data) {
  const { managerId, manager } =
    normalizeManagerFields(data);

  return {
    ...data,
    manager,
    managerId,
    amount: Number(data.amount || 0),
    budget: Number(data.budget || 0),
  };
}

/** Mirrors addClient() in clientService.js */
export function buildClientWritePayload({
  actor,
  form = {},
  authUid = null,
}) {
  const userData = actor;
  const rest = {
    name: "Test Client",
    dialogLink: "https://example.com/dialog",
    course: "Course A",
    tariff: "Tariff 1",
    budget: 10000,
    amount: 0,
    email: "",
    firstContact: "",
    clientNote: "",
    manager: "Катя Бакаева",
    dealType: "Новая",
    paymentDate: "2026-07-01",
    startDate: "2026-07-15",
    subscriptionStage: null,
    sourceId: "src1",
    sourceName: "Instagram",
    source: "Instagram",
    vkLink: "",
    ...form,
  };

  const managerFields = userData
    ? resolveManagerFieldsForWrite(
        userData,
        rest.manager
      )
    : normalizeManagerFields(rest);

  const payload = normalizeClientPayload({
    ...rest,
    ...managerFields,
    ...(rest.vkLink !== undefined
      ? { vkLink: rest.vkLink }
      : {}),
  });

  return {
    ...payload,
    nextPaymentDate: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...(userData
      ? buildCreateAudit(userData, authUid)
      : {}),
  };
}

/** Mirrors NewPaymentPage actor */
export function buildActor(userData, authUid) {
  return {
    ...userData,
    uid: authUid || userData.uid,
  };
}
