const admin = require("firebase-admin");

const {
  NOTIFICATION_TYPES,
} = require("./notificationConstants");

function getDb() {
  return admin.firestore();
}

function buildNotificationDocId(
  userId,
  dedupKey
) {
  return `${userId}__${dedupKey}`;
}

async function createNotificationIfMissing(
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

  const ref = getDb()
    .collection("notifications")
    .doc(docId);

  const existing = await ref.get();

  if (existing.exists) {
    return docId;
  }

  await ref.set({
    read: false,
    channels: ["in_app"],
    createdAt: Date.now(),
    userId,
    dedupKey,
    ...rest,
  });

  return docId;
}

async function getUsersByRole(role) {
  const snapshot = await getDb()
    .collection("users")
    .where("role", "==", role)
    .get();

  return snapshot.docs.map((doc) => ({
    uid: doc.id,
    ...doc.data(),
  }));
}

async function getUsersByManagerId(managerId) {
  if (!managerId) {
    return [];
  }

  const snapshot = await getDb()
    .collection("users")
    .where("managerId", "==", managerId)
    .get();

  return snapshot.docs.map((doc) => ({
    uid: doc.id,
    ...doc.data(),
  }));
}

async function notifyPaymentCreated(
  paymentId,
  paymentData
) {
  const managerId = paymentData.managerId;
  const users = await getUsersByManagerId(
    managerId
  );

  const managerNotifications = users.map(
    (user) =>
      createNotificationIfMissing({
        userId: user.uid,
        dedupKey: `payment_${paymentId}`,
        type: NOTIFICATION_TYPES.NEW_PAYMENT,
        title: "Новая оплата",
        body: `${paymentData.clientName || "Клиент"} · ${paymentData.amount || 0} ₽`,
        link: "/payments",
        priority: "medium",
        data: {
          paymentId,
          clientId: paymentData.clientId,
          amount: paymentData.amount,
        },
        channels: ["in_app"],
      })
  );

  const admins = await getUsersByRole("admin");

  const adminNotifications = admins.map(
    (adminUser) =>
      createNotificationIfMissing({
        userId: adminUser.uid,
        dedupKey: `payment_admin_${paymentId}`,
        type: NOTIFICATION_TYPES.NEW_PAYMENT,
        title: "Новая оплата в системе",
        body: `${paymentData.clientName || "Клиент"} · ${paymentData.manager || ""} · ${paymentData.amount || 0} ₽`,
        link: "/payments",
        priority: "low",
        data: {
          paymentId,
          managerId,
        },
        channels: ["in_app"],
      })
  );

  await Promise.all([
    ...managerNotifications,
    ...adminNotifications,
  ]);
}

async function notifySyncFailed(
  paymentId,
  errorMessage
) {
  const admins = await getUsersByRole("admin");

  await Promise.all(
    admins.map((adminUser) =>
      createNotificationIfMissing({
        userId: adminUser.uid,
        dedupKey: `sync_failed_${paymentId}`,
        type: NOTIFICATION_TYPES.SYNC_FAILED,
        title: "Ошибка Google Sheets",
        body: `Payment ${paymentId}: ${(errorMessage || "").slice(0, 80)}`,
        link: "/management",
        priority: "high",
        data: {
          paymentId,
          error: errorMessage || "",
        },
        channels: ["in_app"],
      })
    )
  );
}

module.exports = {
  createNotificationIfMissing,
  notifyPaymentCreated,
  notifySyncFailed,
  getUsersByRole,
  getUsersByManagerId,
};
