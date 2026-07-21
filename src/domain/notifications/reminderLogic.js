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
  resolveOverdueDeadline,
  indexPaymentsByClientId,
  resolveOverdueInstallmentAmount,
} from "../client/clientStatus";

import {
  getManagerNameById,
} from "../../constants/managers";

export function getDaysOverdue(
  client,
  today = new Date(),
  paymentsOrMap = null
) {
  if (
    !isOverdue(
      client,
      today,
      paymentsOrMap
    )
  ) {
    return 0;
  }

  const paymentDate = new Date(
    resolveOverdueDeadline(
      client,
      today,
      paymentsOrMap
    ) || client.nextPaymentDate
  );

  return Math.ceil(
    (today - paymentDate) /
      (1000 * 60 * 60 * 24)
  );
}

export function buildOverdueNotification(
  client,
  userId,
  today = new Date(),
  paymentsOrMap = null
) {
  const daysOverdue = getDaysOverdue(
    client,
    today,
    paymentsOrMap
  );
  const overdueAmount =
    resolveOverdueInstallmentAmount(
      client,
      paymentsOrMap
    );
  const managerName =
    client.manager ||
    getManagerNameById(client.managerId) ||
    "—";

  return {
    userId,
    type: NOTIFICATION_TYPES.OVERDUE_PAYMENT,
    dedupKey: `overdue_${client.id}`,
    title: "Просроченная подписка",
    body: `${client.name || client.course || "Клиент"} · просрочка ${overdueAmount.toLocaleString("ru-RU")} ₽ · ${daysOverdue} дн.`,
    priority: NOTIFICATION_PRIORITY.HIGH,
    link: `/client/${client.id}`,
    data: {
      clientId: client.id,
      clientName: client.name || "",
      course: client.course || "",
      manager: managerName,
      managerId: client.managerId || "",
      debt: overdueAmount,
      overdueAmount,
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
  today = new Date(),
  payments = []
) {
  const notifications = [];
  const paymentsByClientId =
    indexPaymentsByClientId(payments);

  clients.forEach((client) => {
    if (
      isOverdue(
        client,
        today,
        paymentsByClientId
      )
    ) {
      notifications.push(
        buildOverdueNotification(
          client,
          userId,
          today,
          paymentsByClientId
        )
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

export function buildTodayTasks(
  clients,
  today = new Date(),
  payments = []
) {
  const overdue = [];
  const dueToday = [];
  const dueTomorrow = [];
  const paymentsByClientId =
    indexPaymentsByClientId(payments);

  clients.forEach((client) => {
    if (
      isOverdue(
        client,
        today,
        paymentsByClientId
      )
    ) {
      overdue.push({
        ...client,
        daysOverdue: getDaysOverdue(
          client,
          today,
          paymentsByClientId
        ),
        debt: resolveOverdueInstallmentAmount(
          client,
          paymentsByClientId
        ),
        overdueAmount:
          resolveOverdueInstallmentAmount(
            client,
            paymentsByClientId
          ),
        totalRemain: getRemain(client),
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

export function buildActiveSubscriptions(
  clients,
  today = new Date(),
  payments = []
) {
  const paymentsByClientId =
    indexPaymentsByClientId(payments);

  return clients
    .filter((client) => hasDebt(client))
    .map((client) => ({
      ...client,
      debt: getRemain(client),
      overdue: isOverdue(
        client,
        today,
        paymentsByClientId
      ),
    }));
}
