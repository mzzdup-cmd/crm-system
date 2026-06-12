import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

import { db } from "./firebase";

function mapScheduleDoc(snapshot) {
  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export function subscribeSchedulesInRange(
  startDate,
  endDate,
  callback
) {
  const schedulesQuery = query(
    collection(db, "schedule"),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "asc")
  );

  return onSnapshot(
    schedulesQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map(mapScheduleDoc)
      );
    },
    (error) => {
      console.error(
        "Schedule range subscription error:",
        error
      );
      callback([]);
    }
  );
}
