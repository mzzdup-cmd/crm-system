const LEGACY_MANAGER_ALIASES = {
  Катя: "katya_bakaeva",
  Руслан: "ruslan_romanyuk",
  "Руслан Р": "ruslan_romanyuk",
  Полина: "polina_penkova",
  "Сергей Г": "sergey_grebenshchikov",
  "Денис М": "denis_manuilov",
  "Андрей В": "andrey_volkov",
  "Александр С": "alexander_simanov",
  "Виолетта П": "violeta_petrova",
  "Полина Пламадяла": "polina_plamadya",
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
};

function resolveManagerIdFromLegacy(value) {
  if (!value) {
    return null;
  }

  return (
    LEGACY_MANAGER_ALIASES[value] ||
    value
  );
}

function canonicalManagerId(managerId) {
  if (!managerId) {
    return null;
  }

  const resolved =
    resolveManagerIdFromLegacy(managerId) ||
    managerId;

  switch (resolved) {
    case "polina_plamadyala":
      return "polina_plamadya";
    case "vilu_petrova":
    case "violeta_petrova":
    case "vilu":
    case "violeta":
      return "violeta_petrova";
    case "denis":
      return "denis_manuilov";
    case "ruslan":
      return "ruslan_romanyuk";
    case "alexander":
      return "alexander_simanov";
    case "sergey":
      return "sergey_grebenshchikov";
    case "andrey":
      return "andrey_volkov";
    case "katya":
      return "katya_bakaeva";
    case "Денис М":
      return "denis_manuilov";
    default:
      return resolved;
  }
}

module.exports = {
  LEGACY_MANAGER_ALIASES,
  canonicalManagerId,
  resolveManagerIdFromLegacy,
};
