import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
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

export async function getUserData(uid) {

  const userRef = doc(db, "users", uid);

  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {

    return normalizeUserData(
      uid,
      snapshot.data()
    );

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
