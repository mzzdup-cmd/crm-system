import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "./firebase";
import {
  normalizeUserRole,
} from "../domain/auth/roleHelpers";

export function normalizeUserData(
  uid,
  data
) {
  if (!data) {
    return null;
  }

  return normalizeUserRole({
    uid,
    ...data,
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

  const uniqueIds = [...new Set(managerIds)];
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
