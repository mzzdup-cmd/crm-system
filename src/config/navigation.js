import { ROLES } from "../constants/roles";

const STAFF_ROLES = [
  ROLES.ADMIN,
  ROLES.ROP,
  ROLES.MANAGER,
];

const LEADERSHIP_ROLES = [
  ROLES.ADMIN,
  ROLES.ROP,
];

export const MOBILE_BOTTOM_NAV = [
  {
    path: "/",
    label: "Главная",
    shortLabel: "Главная",
    icon: "🏠",
    roles: STAFF_ROLES,
  },
  {
    path: "/payments",
    label: "Продажи",
    shortLabel: "Продажи",
    icon: "💳",
    roles: STAFF_ROLES,
  },
  {
    path: "/new-payment",
    label: "Новая оплата",
    shortLabel: "Оплата",
    icon: "➕",
    roles: STAFF_ROLES,
  },
  {
    path: "/calendar",
    label: "Календарь",
    shortLabel: "Кален.",
    icon: "📅",
    roles: STAFF_ROLES,
  },
];

export const NAV_ITEMS = [
  {
    path: "/",
    label: "Главная",
    roles: STAFF_ROLES,
  },
  {
    path: "/payments",
    label: "Продажи",
    roles: STAFF_ROLES,
  },
  {
    path: "/new-payment",
    label: "Новая оплата",
    roles: STAFF_ROLES,
  },
  {
    path: "/pending-sales",
    label: "Быстрые продажи",
    roles: STAFF_ROLES,
  },
  {
    path: "/notifications",
    label: "Уведомления",
    roles: STAFF_ROLES,
  },
  {
    path: "/salary",
    label: "Зарплата",
    roles: STAFF_ROLES,
  },
  {
    path: "/calendar",
    label: "Календарь",
    roles: STAFF_ROLES,
  },
  {
    path: "/time-off",
    label: "Запросы",
    roles: [ROLES.MANAGER],
  },
  {
    path: "/knowledge",
    label: "База знаний",
    roles: STAFF_ROLES,
  },
  {
    path: "/analytics",
    label: "MM Аналитика",
    roles: LEADERSHIP_ROLES,
    leadershipOnly: true,
  },
  {
    path: "/management",
    label: "Управление",
    roles: LEADERSHIP_ROLES,
    leadershipOnly: true,
  },
];

export function getNavItemsForRole(role) {
  return NAV_ITEMS.filter((item) =>
    item.roles.includes(role)
  );
}
