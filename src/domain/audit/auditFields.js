export function buildCreateAudit(userData) {
  const now = Date.now();
  const uid =
    userData?.uid ||
    userData?.id ||
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
