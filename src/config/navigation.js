import { ROLES } from "../constants/roles";

export const MOBILE_BOTTOM_NAV = [
  {
    path: "/",
    label: "Главная",
    shortLabel: "Главная",
    icon: "🏠",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    path: "/payments",
    label: "Продажи",
    shortLabel: "Продажи",
    icon: "💳",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    path: "/new-payment",
    label: "Новая оплата",
    shortLabel: "Оплата",
    icon: "➕",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    path: "/calendar",
    label: "Календарь",
    shortLabel: "Кален.",
    icon: "📅",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
];

export const NAV_ITEMS = [
  {
    path: "/",
    label: "Главная",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    path: "/payments",
    label: "Продажи",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    path: "/new-payment",
    label: "Новая оплата",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    path: "/pending-sales",
    label: "Быстрые продажи",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    path: "/notifications",
    label: "Уведомления",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    path: "/salary",
    label: "Зарплата",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    path: "/calendar",
    label: "Календарь",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    path: "/time-off",
    label: "Запросы",
    roles: [ROLES.MANAGER],
  },
  {
    path: "/knowledge",
    label: "База знаний",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    path: "/analytics",
    label: "MM Аналитика",
    roles: [ROLES.ADMIN],
    adminOnly: true,
  },
  {
    path: "/management",
    label: "Управление",
    roles: [ROLES.ADMIN],
    adminOnly: true,
  },
];

export function getNavItemsForRole(role) {
  return NAV_ITEMS.filter((item) =>
    item.roles.includes(role)
  );
}
