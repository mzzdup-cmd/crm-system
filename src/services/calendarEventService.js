import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

import { db } from "./firebase";

import {
  buildCreateAudit,
  buildUpdateAudit,
} from "../domain/audit/auditFields";

import {
  eventOverlapsRange,
} from "../domain/calendar/calendarMonth";

function mapEventDoc(snapshot) {
  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export function subscribeCalendarEvents(
  { startDate, endDate },
  callback
) {
  const eventsQuery = query(
    collection(db, "calendarEvents"),
    where("startDate", "<=", endDate),
    orderBy("startDate", "asc")
  );

  return onSnapshot(
    eventsQuery,
    (snapshot) => {
      const items = snapshot.docs
        .map(mapEventDoc)
        .filter((event) =>
          eventOverlapsRange(
            event,
            startDate,
            endDate
          )
        );

      callback(items);
    },
    (error) => {
      console.error(
        "Calendar events subscription error:",
        error
      );
      callback([]);
    }
  );
}

export async function createCalendarEvent(
  payload,
  userData
) {
  const docRef = await addDoc(
    collection(db, "calendarEvents"),
    {
      ...payload,
      endDate:
        payload.endDate || payload.startDate,
      ...buildCreateAudit(userData),
      updatedAt: Date.now(),
    }
  );

  return {
    id: docRef.id,
    ...payload,
  };
}

export async function updateCalendarEvent(
  eventId,
  payload,
  userData
) {
  const ref = doc(
    db,
    "calendarEvents",
    eventId
  );

  await updateDoc(ref, {
    ...payload,
    endDate:
      payload.endDate || payload.startDate,
    ...buildUpdateAudit(userData),
    updatedAt: Date.now(),
  });
}

export async function deleteCalendarEvent(
  eventId
) {
  await deleteDoc(
    doc(db, "calendarEvents", eventId)
  );
}
