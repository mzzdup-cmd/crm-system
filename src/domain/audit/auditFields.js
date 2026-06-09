export function buildCreateAudit(userData) {
  const now = Date.now();

  return {
    createdAt: now,
    createdByUid: userData?.uid || null,
    updatedAt: now,
    updatedByUid: userData?.uid || null,
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
