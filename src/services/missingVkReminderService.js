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
  userData = null,
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

  const userId =
    userData?.uid || users[0]?.uid;

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

  const dedupKey = buildMissingVkDedupKey(
    client.id
  );

  const userIds = new Set();

  if (client.managerId) {
    const users =
      await getUsersByManagerIds([
        client.managerId,
      ]);

    users.forEach((user) => {
      if (user?.uid) {
        userIds.add(user.uid);
      }
    });
  }

  await Promise.all(
    [...userIds].map((userId) =>
      resolveNotificationByDedupKey(
        userId,
        dedupKey
      )
    )
  );
}

export async function syncMissingVkRemindersForUser(
  userData,
  clients = []
) {
  if (!userData?.uid || !clients.length) {
    return;
  }

  const clientsMissingVk = clients.filter(
    (client) =>
      client?.id && !client.vkLink?.trim()
  );

  await Promise.all(
    clientsMissingVk.map((client) =>
      notifyMissingVkLink({
        userId: userData.uid,
        client,
        managerId: client.managerId,
      }).catch((error) => {
        console.warn(
          "Missing VK reminder skipped:",
          client.id,
          error
        );
      })
    )
  );
}

export async function syncMissingVkResolutionForUser(
  userId,
  clients = []
) {
  if (!userId || !clients.length) {
    return;
  }

  const dedupKeys = clients
    .filter((client) =>
      client.vkLink?.trim()
    )
    .map((client) =>
      buildMissingVkDedupKey(client.id)
    );

  await Promise.all(
    dedupKeys.map((dedupKey) =>
      resolveNotificationByDedupKey(
        userId,
        dedupKey
      )
    )
  );
}

export function buildMissingVkNotificationFromClient(
  client
) {
  const clientName =
    client.name ||
    client.clientName ||
    "Клиент";

  return {
    id: `missing_vk_client_${client.id}`,
    type:
      NOTIFICATION_TYPES.MISSING_VK_LINK,
    title: "Нужно дозаполнить VK",
    body: `${clientName} — добавьте ссылку на VK`,
    link: `/client/${client.id}`,
    read: false,
    resolved: false,
    createdAt:
      client.updatedAt ||
      client.createdAt ||
      Date.now(),
    data: {
      clientId: client.id,
      fromClient: true,
    },
  };
}

export function mergeMissingVkReminders(
  notifications = [],
  clients = []
) {
  const active = notifications.filter(
    (item) =>
      !item.resolved &&
      item.type ===
        NOTIFICATION_TYPES.MISSING_VK_LINK
  );

  const coveredClientIds = new Set(
    active
      .map(
        (item) => item.data?.clientId
      )
      .filter(Boolean)
  );

  const fromClients = clients
    .filter(
      (client) =>
        client?.id &&
        !client.vkLink?.trim() &&
        !coveredClientIds.has(client.id)
    )
    .map(
      buildMissingVkNotificationFromClient
    );

  return [...active, ...fromClients];
}

export function countClientsMissingVk(
  clients = []
) {
  return clients.filter(
    (client) => !client.vkLink?.trim()
  ).length;
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
