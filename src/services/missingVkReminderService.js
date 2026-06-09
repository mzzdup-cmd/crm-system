import {
  NOTIFICATION_TYPES,
} from "../constants/notifications";

import {
  createNotificationIfMissing,
  resolveNotificationByDedupKey,
} from "./notificationService";

import {
  getUsersByManagerIds,
} from "./userService";

import {
  getManagerIdByName,
} from "../constants/managers";

function buildMissingVkDedupKey(clientId) {
  return `missing_vk_${clientId}`;
}

export async function notifyMissingVkLink({
  userId,
  client,
  paymentId,
  managerId,
}) {
  if (!userId || !client?.id) {
    return null;
  }

  if (client.vkLink?.trim()) {
    return null;
  }

  const clientName =
    client.name ||
    client.clientName ||
    "Клиент";

  return createNotificationIfMissing({
    userId,
    dedupKey: buildMissingVkDedupKey(
      client.id
    ),
    type:
      NOTIFICATION_TYPES.MISSING_VK_LINK,
    title: "Нужно дозаполнить VK",
    body: "Не забудьте добавить VK ссылку клиенту",
    link: `/client/${client.id}`,
    priority: "medium",
    resolved: false,
    data: {
      clientId: client.id,
      dialogLink:
        client.dialogLink || "",
      clientName,
      paymentId: paymentId || null,
      managerId:
        managerId ||
        client.managerId ||
        null,
      createdAt: Date.now(),
    },
    channels: ["in_app"],
  });
}

export async function maybeNotifyMissingVkLink({
  client,
  payment,
  managerName,
}) {
  if (client.vkLink?.trim()) {
    return null;
  }

  const managerId =
    payment?.managerId ||
    client.managerId ||
    getManagerIdByName(managerName);

  if (!managerId) {
    return null;
  }

  const users =
    await getUsersByManagerIds([
      managerId,
    ]);

  const userId = users[0]?.uid;

  if (!userId) {
    return null;
  }

  return notifyMissingVkLink({
    userId,
    client,
    paymentId: payment?.id,
    managerId,
  });
}

export async function resolveMissingVkRemindersForClient(
  client
) {
  if (!client?.id || !client.vkLink?.trim()) {
    return;
  }

  const managerId = client.managerId;

  if (!managerId) {
    return;
  }

  const users =
    await getUsersByManagerIds([
      managerId,
    ]);

  await Promise.all(
    users.map((user) =>
      resolveNotificationByDedupKey(
        user.uid,
        buildMissingVkDedupKey(
          client.id
        )
      )
    )
  );
}

export function countActiveMissingVkReminders(
  notifications
) {
  return notifications.filter(
    (item) =>
      item.type ===
        NOTIFICATION_TYPES.MISSING_VK_LINK &&
      !item.resolved
  ).length;
}
