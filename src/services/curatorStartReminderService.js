import {
  NOTIFICATION_TYPES,
} from "../constants/notifications";

import {
  createNotificationIfMissing,
} from "./notificationService";

import {
  getUsersByManagerIds,
} from "./userService";

import {
  canAccessPayment,
} from "../domain/auth/permissionHelpers";

import {
  getManagerIdByName,
} from "../constants/managers";

import {
  getTodayDateString,
} from "../domain/schedule/scheduleLogic";

function buildCuratorStartDedupKey(
  paymentId,
  date
) {
  return `curator_start_${paymentId}_${date}`;
}

function buildCuratorStartBody({
  clientName,
  dialogLink,
  vkLink,
}) {
  const parts = [clientName || "Клиент"];

  if (dialogLink?.trim()) {
    parts.push(dialogLink.trim());
  }

  if (vkLink?.trim()) {
    parts.push(vkLink.trim());
  }

  parts.push("Отправить куратору");

  return parts.join(" · ");
}

export async function notifyCuratorStart({
  userId,
  payment,
  client = null,
}) {
  if (
    !userId ||
    !payment?.id ||
    !payment.curatorStartDate?.trim()
  ) {
    return null;
  }

  const clientName =
    payment.clientName ||
    payment.legacyClientName ||
    client?.name ||
    "Клиент";

  const dialogLink =
    payment.dialogLink ||
    client?.dialogLink ||
    "";

  const vkLink =
    payment.vkLink ||
    client?.vkLink ||
    "";

  return createNotificationIfMissing({
    userId,
    dedupKey: buildCuratorStartDedupKey(
      payment.id,
      payment.curatorStartDate
    ),
    type:
      NOTIFICATION_TYPES.CURATOR_START,
    title: "Отправить куратору",
    body: buildCuratorStartBody({
      clientName,
      dialogLink,
      vkLink,
    }),
    link: `/payments?edit=${payment.id}`,
    priority: "high",
    resolved: false,
    data: {
      paymentId: payment.id,
      clientId:
        payment.clientId ||
        client?.id ||
        null,
      clientName,
      dialogLink,
      vkLink,
      curatorStartDate:
        payment.curatorStartDate,
      managerId: payment.managerId || null,
      createdAt: Date.now(),
    },
    channels: ["in_app"],
  });
}

export async function maybeNotifyCuratorStart({
  payment,
  client = null,
  managerName,
  userData = null,
}) {
  const today = getTodayDateString();

  if (
    !payment?.curatorStartDate?.trim() ||
    payment.curatorStartDate !== today
  ) {
    return null;
  }

  const managerId =
    payment?.managerId ||
    getManagerIdByName(managerName);

  if (!managerId) {
    return null;
  }

  const users =
    await getUsersByManagerIds([
      managerId,
    ]);

  const userId =
    userData?.uid || users[0]?.uid;

  if (!userId) {
    return null;
  }

  return notifyCuratorStart({
    userId,
    payment,
    client,
  });
}

export async function syncCuratorStartRemindersForUser(
  userData,
  payments = [],
  clients = []
) {
  if (!userData?.uid || !payments.length) {
    return;
  }

  const today = getTodayDateString();
  const clientsById = Object.fromEntries(
    clients.map((client) => [
      client.id,
      client,
    ])
  );

  const dueToday = payments.filter(
    (payment) =>
      !payment.deletedAt &&
      payment.curatorStartDate === today &&
      canAccessPayment(
        userData,
        payment
      )
  );

  await Promise.all(
    dueToday.map((payment) =>
      notifyCuratorStart({
        userId: userData.uid,
        payment,
        client:
          clientsById[payment.clientId] ||
          null,
      }).catch((error) => {
        console.warn(
          "Curator start reminder skipped:",
          payment.id,
          error
        );
      })
    )
  );
}
