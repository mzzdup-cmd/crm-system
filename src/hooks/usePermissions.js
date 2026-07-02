import { useAuth }
from "../context/AuthContext";

import {
  isAdmin,
  isManager,
  isRop,
  isLeadership,
  getCurrentManagerId,
  getFirestoreManagerId,
  getRoleLabel,
} from "../domain/auth/roleHelpers";

import {
  getManagerNameById,
} from "../constants/managers";

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
  const rop = isRop(userData);
  const leadership = isLeadership(userData);
  const manager = isManager(userData);
  const managerId =
    getCurrentManagerId(userData);
  const firestoreManagerId =
    getFirestoreManagerId(userData);

  const displayName =
    userData?.name ||
    getManagerNameById(managerId) ||
    "";

  return {
    userData,
    loading,
    role: userData?.role ?? null,
    roleLabel: getRoleLabel(userData),
    displayName,
    managerId,
    firestoreManagerId,
    isAdmin: admin,
    isRop: rop,
    isLeadership: leadership,
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
