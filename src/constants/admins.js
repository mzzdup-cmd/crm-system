export const ADMINS = [
  { id: "daniil_kokorin", name: "Даниил Кокорин" },
  { id: "anastasia_borodina", name: "Анастасия Бородина" },
  { id: "denis_shchelokov", name: "Денис Щёлоков" },
  { id: "vladislav_demchenko", name: "Владислав Демченко" },
];

export const ADMIN_NAMES = ADMINS.map(
  (admin) => admin.name
);

export function getAdminById(id) {
  return ADMINS.find(
    (admin) => admin.id === id
  );
}

export function getAdminByName(name) {
  return ADMINS.find(
    (admin) => admin.name === name
  );
}
