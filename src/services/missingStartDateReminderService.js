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

import {
  isOptionalStartDateDealType,
} from "../constants/dealTypes";

function buildMissingStartDateDedupKey(
  paymentId
) {
  return `missing_start_date_${paymentId}`;
}

export function paymentNeedsStartDate(
  payment
) {
  if (!payment?.id) {
    return false;
  }

  if (
    !isOptionalStartDateDealType(
      payment.dealType
    )
  ) {
    return false;
  }

  return !payment.startDate?.trim();
}

export async function notifyMissingStartDate({
  userId,
  payment,
  clientId = null,
}) {
  if (!userId || !payment?.id) {
    return null;
  }

  if (!paymentNeedsStartDate(payment)) {
    return null;
  }

  const clientName =
    payment.clientName ||
    payment.legacyClientName ||
    "Клиент";

  return createNotificationIfMissing({
    userId,
    dedupKey: buildMissingStartDateDedupKey(
      payment.id
    ),
    type:
      NOTIFICATION_TYPES.MISSING_START_DATE,
    title: "Нужно указать дату старта",
    body: `${clientName} · ${payment.dealType} — укажите поток / дату старта`,
    link: "/payments",
    priority: "medium",
    resolved: false,
    data: {
      paymentId: payment.id,
      clientId:
        clientId ||
        payment.clientId ||
        null,
      clientName,
      dealType: payment.dealType || "",
      managerId: payment.managerId || null,
      createdAt: Date.now(),
    },
    channels: ["in_app"],
  });
}

export async function maybeNotifyMissingStartDate({
  payment,
  managerName,
  userData = null,
}) {
  if (!paymentNeedsStartDate(payment)) {
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

  return notifyMissingStartDate({
    userId,
    payment,
    clientId: payment.clientId,
  });
}

export async function resolveMissingStartDateReminder(
  payment,
  userData = null
) {
  if (!payment?.id) {
    return;
  }

  const dedupKey =
    buildMissingStartDateDedupKey(
      payment.id
    );

  const userIds = new Set();

  if (userData?.uid) {
    userIds.add(userData.uid);
  }

  if (payment.managerId) {
    const users =
      await getUsersByManagerIds([
        payment.managerId,
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

export function countPaymentsMissingStartDate(
  payments = []
) {
  return payments.filter(
    paymentNeedsStartDate
  ).length;
}
