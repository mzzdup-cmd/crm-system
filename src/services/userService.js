import {
  doc,
  getDoc,
} from "firebase/firestore";

import { db } from "./firebase";

export async function getUserData(uid) {

  const userRef = doc(db, "users", uid);

  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {

    return snapshot.data();

  }

  return null;
}