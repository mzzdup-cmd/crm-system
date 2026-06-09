import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";

import { db } from "./firebase";
import {
  buildTrafficDocument,
} from "../domain/schedule/trafficLogic";
import {
  getTodayDateString,
} from "../domain/schedule/scheduleLogic";

function mapTrafficDoc(snapshot) {
  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export async function getTrafficByDate(date) {
  const ref = doc(db, "traffic", date);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return mapTrafficDoc(snapshot);
}

export async function getTodayTraffic() {
  const date = getTodayDateString();

  return getTrafficByDate(date);
}

export async function saveTraffic(
  date,
  schedule,
  trafficAmount
) {
  const payload = buildTrafficDocument(
    date,
    schedule,
    trafficAmount
  );

  const ref = doc(db, "traffic", date);

  await setDoc(ref, payload, {
    merge: true,
  });

  return payload;
}

export async function updateTrafficAmount(
  date,
  schedule,
  trafficAmount
) {
  return saveTraffic(
    date,
    schedule,
    trafficAmount
  );
}

export async function getRecentTraffic(count = 7) {
  const snapshot = await getDocs(
    query(
      collection(db, "traffic"),
      orderBy("date", "desc"),
      limit(count)
    )
  );

  return snapshot.docs.map(mapTrafficDoc);
}
