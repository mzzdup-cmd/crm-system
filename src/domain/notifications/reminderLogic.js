import {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,
  REMINDER_DAYS_BEFORE,
} from "../../constants/notifications";

import {
  getRemain,
  isOverdue,
  hasDebt,
  getDaysUntilPayment,
} from "../client/clientStatus";

import {
  getManagerNameById,
} from "../../constants/managers";

export function getDaysOverdue(
  client,
  today = new Date()
) {
  if (!isOverdue(client, today)) {
    return 0;
  }

  const paymentDate = new Date(
    client.nextPaymentDate
  );

  return Math.ceil(
    (today - paymentDate) /
      (1000 * 60 * 60 * 24)
  );
}

export function buildOverdueNotification(
  client,
  userId
) {
  const daysOverdue = getDaysOverdue(client);
  const debt = getRemain(client);
  const managerName =
    client.manager ||
    getManagerNameById(client.managerId) ||
    "—";

  return {
    userId,
    type: NOTIFICATION_TYPES.OVERDUE_PAYMENT,
    dedupKey: `overdue_${client.id}`,
    title: "Просроченная подписка",
    body: `${client.name || client.course || "Клиент"} · долг ${debt.toLocaleString("ru-RU")} ₽ · ${daysOverdue} дн.`,
    priority: NOTIFICATION_PRIORITY.HIGH,
    link: `/client/${client.id}`,
    data: {
      clientId: client.id,
      clientName: client.name || "",
      course: client.course || "",
      manager: managerName,
      managerId: client.managerId || "",
      debt,
      daysOverdue,
    },
    channels: ["in_app"],
  };
}

export function buildPaymentReminderNotification(
  client,
  userId,
  daysUntil
) {
  const debt = getRemain(client);
  const managerName =
    client.manager ||
    getManagerNameById(client.managerId) ||
    "—";

  const whenLabel =
    daysUntil === 0
      ? "Сегодня"
      : "Завтра";

  return {
    userId,
    type: NOTIFICATION_TYPES.NEXT_PAYMENT_REMINDER,
    dedupKey: `reminder_${client.id}_${client.nextPaymentDate}`,
    title: `Оплата ${whenLabel.toLowerCase()}`,
    body: `${client.name || client.course || "Клиент"} · ${debt.toLocaleString("ru-RU")} ₽ · ${client.course || ""}`,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    link: `/client/${client.id}`,
    data: {
      clientId: client.id,
      clientName: client.name || "",
      course: client.course || "",
      manager: managerName,
      managerId: client.managerId || "",
      amount: debt,
      daysUntil,
      nextPaymentDate: client.nextPaymentDate,
    },
    channels: ["in_app"],
  };
}

export function buildReminderNotificationsFromClients(
  clients,
  userId,
  today = new Date()
) {
  const notifications = [];

  clients.forEach((client) => {
    if (isOverdue(client, today)) {
      notifications.push(
        buildOverdueNotification(client, userId)
      );
      return;
    }

    if (!hasDebt(client)) {
      return;
    }

    const daysUntil = getDaysUntilPayment(
      client.nextPaymentDate,
      today
    );

    if (
      daysUntil !== null &&
      REMINDER_DAYS_BEFORE.includes(daysUntil)
    ) {
      notifications.push(
        buildPaymentReminderNotification(
          client,
          userId,
          daysUntil
        )
      );
    }
  });

  return notifications;
}

export function buildTodayTasks(clients, today = new Date()) {
  const overdue = [];
  const dueToday = [];
  const dueTomorrow = [];

  clients.forEach((client) => {
    if (isOverdue(client, today)) {
      overdue.push({
        ...client,
        daysOverdue: getDaysOverdue(client, today),
        debt: getRemain(client),
      });
      return;
    }

    if (!hasDebt(client)) {
      return;
    }

    const daysUntil = getDaysUntilPayment(
      client.nextPaymentDate,
      today
    );

    if (daysUntil === 0) {
      dueToday.push({
        ...client,
        debt: getRemain(client),
      });
    } else if (daysUntil === 1) {
      dueTomorrow.push({
        ...client,
        debt: getRemain(client),
      });
    }
  });

  return {
    overdue,
    dueToday,
    dueTomorrow,
    total:
      overdue.length +
      dueToday.length +
      dueTomorrow.length,
  };
}

export function buildActiveSubscriptions(clients) {
  return clients
    .filter((client) => hasDebt(client))
    .map((client) => ({
      ...client,
      debt: getRemain(client),
      overdue: isOverdue(client),
    }));
}
