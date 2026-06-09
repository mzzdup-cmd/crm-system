import { ROLES } from "../constants/roles";

export const MOBILE_BOTTOM_NAV = [
  {
    path: "/",
    label: "Dashboard",
    shortLabel: "Home",
    icon: "🏠",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    path: "/clients",
    label: "Клиенты",
    shortLabel: "Клиенты",
    icon: "👥",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    path: "/deals",
    label: "Сделки",
    shortLabel: "Сделки",
    icon: "💼",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    path: "/payments",
    label: "Платежи",
    shortLabel: "Оплаты",
    icon: "💳",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
];

export const NAV_ITEMS = [
  {
    path: "/",
    label: "Dashboard",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    path: "/clients",
    label: "Клиенты",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    path: "/deals",
    label: "Сделки",
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
    path: "/subscriptions",
    label: "Подписки",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    path: "/notifications",
    label: "Уведомления",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    path: "/payments",
    label: "Платежи",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    path: "/salary",
    label: "Зарплата",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    path: "/time-off",
    label: "Запросы",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    path: "/knowledge",
    label: "База знаний",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    path: "/analytics",
    label: "MM Analytics",
    roles: [ROLES.ADMIN],
    adminOnly: true,
  },
  {
    path: "/management",
    label: "Управление",
    roles: [ROLES.ADMIN],
    adminOnly: true,
  },
  {
    path: "/traffic",
    label: "Traffic",
    roles: [ROLES.ADMIN],
    adminOnly: true,
  },
  {
    path: "/rating",
    label: "Рейтинг",
    roles: [ROLES.ADMIN],
    adminOnly: true,
  },
  {
    path: "/night-shifts",
    label: "Ночные смены",
    roles: [ROLES.ADMIN],
    adminOnly: true,
  },
  {
    path: "/bonuses",
    label: "Бонусы",
    roles: [ROLES.ADMIN],
    adminOnly: true,
  },
];

export function getNavItemsForRole(role) {
  return NAV_ITEMS.filter((item) =>
    item.roles.includes(role)
  );
}
