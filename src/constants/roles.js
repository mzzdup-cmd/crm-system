export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
};

export const ADMIN_ONLY_PATHS = [
  "/analytics",
  "/bonuses",
  "/night-shifts",
  "/rating",
  "/management",
  "/traffic",
];

export function isValidRole(role) {
  return (
    role === ROLES.ADMIN ||
    role === ROLES.MANAGER
  );
}
