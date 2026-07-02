import { auth } from "../../services/firebase.js";

export function resolveAuditUser(userData) {
  const authUid =
    auth.currentUser?.uid || null;

  return {
    ...userData,
    uid:
      authUid ||
      userData?.uid ||
      userData?.id ||
      null,
  };
}
