import {
  getManagerById,
  getManagerByName,
  MANAGERS,
} from "../../constants/managers";

/**
 * Legacy display names used before managerId normalization.
 * Maps short / inconsistent strings → stable managerId.
 */
export const LEGACY_MANAGER_ALIASES = {
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

export function resolveManagerIdFromLegacy(value) {
  if (!value) {
    return null;
  }

  if (getManagerById(value)) {
    return value;
  }

  if (LEGACY_MANAGER_ALIASES[value]) {
    return LEGACY_MANAGER_ALIASES[value];
  }

  const byName = getManagerByName(value);

  if (byName) {
    return byName.id;
  }

  const partialMatch = MANAGERS.find(
    (manager) =>
      value.startsWith(
        manager.name.split(" ")[0]
      )
  );

  return partialMatch?.id ?? null;
}

export function resolveManagerFromLegacy(value) {
  const managerId =
    resolveManagerIdFromLegacy(value);

  if (!managerId) {
    return {
      managerId: null,
      manager: value || "",
    };
  }

  const manager = getManagerById(managerId);

  return {
    managerId,
    manager: manager?.name || value,
  };
}

export function normalizeManagerFields(data = {}) {
  if (data.managerId) {
    const manager = getManagerById(data.managerId);

    return {
      managerId: data.managerId,
      manager:
        manager?.name ||
        data.manager ||
        "",
    };
  }

  if (data.manager) {
    return resolveManagerFromLegacy(
      data.manager
    );
  }

  return {
    managerId: null,
    manager: "",
  };
}

export function needsManagerIdMigration(data) {
  return Boolean(
    data?.manager &&
    !data?.managerId
  );
}
