export const MANAGERS = [
  { id: "denis_manuilov", name: "Денис Мануйлов" },
  { id: "ruslan_romanyuk", name: "Руслан Романюк" },
  { id: "alexander_simanov", name: "Александр Симанов" },
  { id: "sergey_grebenshchikov", name: "Сергей Гребенщиков" },
  { id: "andrey_volkov", name: "Андрей Волков" },
  { id: "polina_penkova", name: "Полина Пенькова" },
  { id: "katya_bakaeva", name: "Катя Бакаева" },
  { id: "polina_plamadya", name: "Полина Пламадяла" },
  { id: "violeta_petrova", name: "Виолетта Петрова" },
];

export const MANAGER_NAMES = MANAGERS.map(
  (manager) => manager.name
);

/** Display lookup — keep in sync with managerMigration.canonicalManagerId(). */
function lookupManagerId(id) {
  switch (id) {
    case "vilu_petrova":
    case "vilu":
    case "violeta":
    case "violeta_petrova":
      return "violeta_petrova";
    case "polina_plamadyala":
      return "polina_plamadya";
    default:
      return id;
  }
}

export function getManagerById(id) {
  if (!id) {
    return null;
  }

  return (
    MANAGERS.find(
      (manager) =>
        manager.id ===
        lookupManagerId(id)
    ) ?? null
  );
}

export function getManagerByName(name) {
  return MANAGERS.find(
    (manager) => manager.name === name
  );
}

export function getManagerIdByName(name) {
  return getManagerByName(name)?.id ?? null;
}

export function getManagerNameById(id) {
  return getManagerById(id)?.name ?? null;
}
