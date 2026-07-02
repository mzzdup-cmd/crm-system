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

export function getManagerById(id) {
  if (id === "vilu_petrova") {
    return {
      id: "vilu_petrova",
      name: "Виолетта Петрова",
    };
  }

  return MANAGERS.find(
    (manager) => manager.id === id
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
