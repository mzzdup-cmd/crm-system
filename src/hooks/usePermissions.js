import { useAuth }
from "../context/AuthContext";

import {
  isAdmin,
  isManager,
  getCurrentManagerId,
} from "../domain/auth/roleHelpers";

import {
  canViewAll,
  canManageTeam,
  canAccessClient,
  canAccessPayment,
  canAccessByManagerId,
} from "../domain/auth/permissionHelpers";

export function usePermissions() {
  const {
    userData,
    loading,
  } = useAuth();

  const admin = isAdmin(userData);
  const manager = isManager(userData);
  const managerId =
    getCurrentManagerId(userData);

  return {
    userData,
    loading,
    role: userData?.role ?? null,
    displayName: userData?.name ?? "",
    managerId,
    isAdmin: admin,
    isManager: manager,
    canViewAll: canViewAll(userData),
    canManageTeam: canManageTeam(userData),
    canAccessClient: (client) =>
      canAccessClient(userData, client),
    canAccessPayment: (payment) =>
      canAccessPayment(userData, payment),
    canAccessByManagerId: (
      targetManagerId,
      targetManagerName
    ) =>
      canAccessByManagerId(
        userData,
        targetManagerId,
        targetManagerName
      ),
  };
}
