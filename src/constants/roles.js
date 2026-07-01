export const ROLES = {
  ADMIN: "admin",
  ROP: "rop",
  MANAGER: "manager",
};

export const ROLE_LABELS = {
  admin: "Admin",
  rop: "РОП",
  manager: "Менеджер",
};

export const LEADERSHIP_PATHS = [
  "/analytics",
  "/bonuses",
  "/night-shifts",
  "/rating",
  "/management",
  "/traffic",
];

/** @deprecated use LEADERSHIP_PATHS */
export const ADMIN_ONLY_PATHS = LEADERSHIP_PATHS;

export function isValidRole(role) {
  return (
    role === ROLES.ADMIN ||
    role === ROLES.ROP ||
    role === ROLES.MANAGER
  );
}
