import { resolveAuditUser } from "./resolveAuditUser.js";

export function buildCreateAudit(
  userData,
  preferredUid = null
) {
  const now = Date.now();
  const resolved = resolveAuditUser(
    userData || {}
  );
  const uid =
    preferredUid ||
    resolved.uid ||
    null;

  if (!uid) {
    return {
      createdAt: now,
      updatedAt: now,
    };
  }

  return {
    createdAt: now,
    createdByUid: uid,
    updatedAt: now,
    updatedByUid: uid,
  };
}

/** Guaranteed audit fields for Firestore create rules. */
export function buildWriteAuditFields(
  userData,
  preferredUid = null
) {
  const fields = buildCreateAudit(
    userData,
    preferredUid
  );

  if (!fields.createdByUid) {
    throw new Error(
      "Не удалось определить пользователя. Войдите заново."
    );
  }

  return fields;
}

export function buildUpdateAudit(userData) {
  return {
    updatedAt: Date.now(),
    updatedByUid: userData?.uid || null,
  };
}

export function buildDeleteAudit(userData) {
  return {
    deletedAt: Date.now(),
    deletedByUid: userData?.uid || null,
    updatedAt: Date.now(),
    updatedByUid: userData?.uid || null,
  };
}
