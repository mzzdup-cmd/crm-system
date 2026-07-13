import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";

import { db } from "./firebase";

import {
  NOTIFICATION_LIMIT,
  DELIVERY_CHANNELS,
} from "../constants/notifications";

import {
  getManagerNameById,
} from "../constants/managers";

function mapNotificationDoc(snapshot) {
  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

function buildNotificationDocId(
  userId,
  dedupKey
) {
  return `${userId}__${dedupKey}`;
}

export function normalizeNotificationPayload(
  data
) {
  return {
    read: false,
    channels: [DELIVERY_CHANNELS.IN_APP],
    createdAt: Date.now(),
    ...data,
  };
}

export async function createNotificationIfMissing(
  payload
) {
  const {
    userId,
    dedupKey,
    ...rest
  } = payload;

  if (!userId || !dedupKey) {
    return null;
  }

  const docId = buildNotificationDocId(
    userId,
    dedupKey
  );

  const ref = doc(
    db,
    "notifications",
    docId
  );

  const existing = await getDoc(ref);

  if (existing.exists()) {
    return existing.id;
  }

  await setDoc(ref, normalizeNotificationPayload({
    userId,
    dedupKey,
    ...rest,
  }));

  return docId;
}

export async function upsertReminderNotifications(
  notifications
) {
  const results = await Promise.all(
    notifications.map((notification) =>
      createNotificationIfMissing(notification)
    )
  );

  return results.filter(Boolean);
}

export function subscribeToNotifications(
  userId,
  callback,
  maxCount = NOTIFICATION_LIMIT
) {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const notificationsQuery = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(maxCount)
  );

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map(mapNotificationDoc)
      );
    },
    (error) => {
      console.error(
        "Notifications subscription error:",
        error
      );
      callback([]);
    }
  );
}

export async function markNotificationRead(
  notificationId
) {
  const ref = doc(
    db,
    "notifications",
    notificationId
  );

  await updateDoc(ref, {
    read: true,
    readAt: Date.now(),
  });
}

export async function markNotificationResolved(
  notificationId
) {
  const ref = doc(
    db,
    "notifications",
    notificationId
  );

  await updateDoc(ref, {
    read: true,
    readAt: Date.now(),
    resolved: true,
    resolvedAt: Date.now(),
  });
}

export async function resolveNotificationByDedupKey(
  userId,
  dedupKey
) {
  if (!userId || !dedupKey) {
    return null;
  }

  const docId = buildNotificationDocId(
    userId,
    dedupKey
  );

  const ref = doc(
    db,
    "notifications",
    docId
  );

  const existing = await getDoc(ref);

  if (!existing.exists()) {
    return null;
  }

  await updateDoc(ref, {
    read: true,
    readAt: Date.now(),
    resolved: true,
    resolvedAt: Date.now(),
  });

  return docId;
}

export async function markAllNotificationsRead(
  userId,
  notifications
) {
  const unread = notifications.filter(
    (item) => !item.read
  );

  if (!unread.length) {
    return;
  }

  const batch = writeBatch(db);

  unread.forEach((item) => {
    const ref = doc(
      db,
      "notifications",
      item.id
    );

    batch.update(ref, {
      read: true,
      readAt: Date.now(),
    });
  });

  await batch.commit();
}

export function countUnreadNotifications(
  notifications
) {
  return notifications.filter(
    (item) => !item.read
  ).length;
}

export async function notifyScheduleChange({
  userId,
  date,
  message,
  link = "/",
}) {
  return createNotificationIfMissing({
    userId,
    dedupKey: `schedule_${date}_${Date.now()}`,
    type: "schedule_change",
    title: "Изменение расписания",
    body: message,
    link,
    priority: "low",
    data: { date },
    channels: ["in_app"],
  });
}

export async function notifyTrafficOverload({
  userId,
  managerId,
  share,
  date,
}) {
  return createNotificationIfMissing({
    userId,
    dedupKey: `traffic_${date}_${managerId}`,
    type: "traffic_overload",
    title: "Высокая нагрузка трафика",
    body: `Доля ${Math.round(share * 100)}% на ${date}`,
    link: "/",
    priority: "high",
    data: { managerId, share, date },
    channels: ["in_app"],
  });
}

export async function notifySubstitutionReminder({
  userId,
  date,
  coveringFor,
  shiftStart,
  shiftEnd,
}) {
  const names = String(coveringFor || "")
    .split(",")
    .map((id) =>
      getManagerNameById(id.trim())
    )
    .filter(Boolean)
    .join(", ");

  const timeLabel =
    shiftStart && shiftEnd
      ? `${shiftStart}–${shiftEnd} MSK`
      : "";

  const body = timeLabel
    ? `Вы работаете за ${names} · ${timeLabel}`
    : `Вы работаете за ${names}`;

  return createNotificationIfMissing({
    userId,
    dedupKey: `substitution_${date}_${userId}`,
    type: "substitution_reminder",
    title: "Напоминание о замене",
    body,
    link: "/",
    priority: "medium",
    data: {
      date,
      coveringFor,
      shiftStart,
      shiftEnd,
    },
    channels: ["in_app"],
  });
}
