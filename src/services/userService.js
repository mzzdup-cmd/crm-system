import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  deleteField,
} from "firebase/firestore";

import { db } from "./firebase";
import {
  normalizeUserRole,
} from "../domain/auth/roleHelpers";
import {
  expandManagerIdAliases,
} from "../domain/auth/managerMigration";
import {
  getProvisionProfileForEmail,
} from "../constants/provisionProfiles";

export function normalizeUserData(
  uid,
  data
) {
  if (!data) {
    return null;
  }

  return normalizeUserRole({
    ...data,
    uid,
  });
}

function mapUserDoc(snapshot) {
  return normalizeUserData(
    snapshot.id,
    snapshot.data()
  );
}

async function repairProvisionProfile(
  uid,
  raw
) {
  const template =
    getProvisionProfileForEmail(
      raw?.email
    );

  if (!template || !raw?.email) {
    return raw;
  }

  const isLeadershipProfile =
    template.role === "admin" ||
    template.role === "rop";
  const roleMismatch =
    raw.role !== template.role;
  const hasStaleManagerId =
    isLeadershipProfile &&
    Boolean(raw.managerId);

  if (
    !roleMismatch &&
    !hasStaleManagerId
  ) {
    return raw;
  }

  const patch = {
    role: template.role,
    name:
      raw.name ||
      template.name ||
      "",
    updatedAt: Date.now(),
  };

  if (isLeadershipProfile) {
    patch.managerId = deleteField();
  } else if (
    template.managerId &&
    !raw.managerId
  ) {
    patch.managerId =
      template.managerId;
  }

  await setDoc(
    doc(db, "users", uid),
    patch,
    { merge: true }
  );

  const refreshed = await getDoc(
    doc(db, "users", uid)
  );

  if (!refreshed.exists()) {
    return raw;
  }

  return refreshed.data();
}

export async function getUserData(uid) {

  const userRef = doc(db, "users", uid);

  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    const raw = await repairProvisionProfile(
      uid,
      snapshot.data()
    );

    return normalizeUserData(uid, raw);
  }

  return null;
}

/**
 * Create users/{uid} on first login when Auth exists but Firestore profile is missing.
 */
export async function ensureUserProfile(
  authUser
) {
  if (!authUser?.uid || !authUser?.email) {
    return null;
  }

  const existing = await getUserData(
    authUser.uid
  );

  if (existing) {
    return existing;
  }

  const template =
    getProvisionProfileForEmail(
      authUser.email
    );

  if (!template) {
    console.warn(
      "[userService] no provision profile for email:",
      authUser.email
    );
    return null;
  }

  const profile = {
    email: authUser.email,
    ...template,
    updatedAt: Date.now(),
  };

  await setDoc(
    doc(db, "users", authUser.uid),
    profile,
    { merge: true }
  );

  return normalizeUserData(
    authUser.uid,
    profile
  );
}

export async function getUsersByRole(role) {
  const usersQuery = query(
    collection(db, "users"),
    where("role", "==", role)
  );

  const snapshot = await getDocs(usersQuery);

  return snapshot.docs.map(mapUserDoc);
}

export async function getUserByManagerId(
  managerId
) {
  const users =
    await getUsersByManagerIds([
      managerId,
    ]);

  return users[0] || null;
}

export async function getUsersByManagerIds(
  managerIds
) {
  if (!managerIds?.length) {
    return [];
  }

  const uniqueIds = [
    ...new Set(
      managerIds.flatMap((managerId) =>
        expandManagerIdAliases(managerId)
      )
    ),
  ];
  const results = [];

  for (const managerId of uniqueIds) {
    const usersQuery = query(
      collection(db, "users"),
      where("managerId", "==", managerId)
    );

    const snapshot = await getDocs(usersQuery);

    snapshot.docs.forEach((docSnap) => {
      results.push(mapUserDoc(docSnap));
    });
  }

  return results;
}
