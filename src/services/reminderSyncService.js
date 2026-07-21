import {
  createNotificationIfMissing,
  notifySubstitutionReminder,
  upsertReminderNotifications,
  resolveNotificationByDedupKey,
} from "./notificationService";

import {
  buildReminderNotificationsFromClients,
} from "../domain/notifications/reminderLogic";

import {
  getManagerShiftInfo,
  getTodayDateString,
} from "../domain/schedule/scheduleLogic";

import {
  isOverdue,
  indexPaymentsByClientId,
} from "../domain/client/clientStatus";

import {
  TRAFFIC_OVERLOAD_THRESHOLD,
} from "../constants/notifications";

import {
  getManagerNameById,
} from "../constants/managers";

import {
  getCoveringManagerIds,
} from "../domain/calendar/replacementLogic";

import {
  getUsersByRole,
  getUsersByManagerIds,
} from "./userService";

let lastSyncKey = "";
let syncInProgress = false;

function buildReminderSyncKey(
  userData,
  clients,
  payments,
  today
) {
  const paymentsByClientId =
    indexPaymentsByClientId(payments);
  const overdueIds = clients
    .filter((client) =>
      isOverdue(
        client,
        new Date(`${today}T12:00:00`),
        paymentsByClientId
      )
    )
    .map((client) => client.id)
    .sort()
    .join(",");

  return `${userData.uid}_${today}_${clients.length}_${payments.length}_${overdueIds}`;
}

export async function syncClientReminders(
  userData,
  clients,
  payments = []
) {
  if (!userData?.uid || !clients?.length) {
    return;
  }

  const today = getTodayDateString();
  const syncKey = buildReminderSyncKey(
    userData,
    clients,
    payments,
    today
  );

  if (syncKey === lastSyncKey || syncInProgress) {
    return;
  }

  syncInProgress = true;

  try {
    const todayDate = new Date(`${today}T12:00:00`);
    const paymentsByClientId =
      indexPaymentsByClientId(payments);

    const notifications =
      buildReminderNotificationsFromClients(
        clients,
        userData.uid,
        todayDate,
        payments
      );

    await upsertReminderNotifications(
      notifications
    );

    const activeOverdueIds = new Set(
      clients
        .filter((client) =>
          isOverdue(
            client,
            todayDate,
            paymentsByClientId
          )
        )
        .map((client) => client.id)
    );

    await Promise.all(
      clients.map((client) => {
        if (activeOverdueIds.has(client.id)) {
          return null;
        }

        return resolveNotificationByDedupKey(
          userData.uid,
          `overdue_${client.id}`
        );
      })
    );

    lastSyncKey = syncKey;
  } finally {
    syncInProgress = false;
  }
}

export async function syncScheduleNotifications({
  schedule,
  previousSchedule,
}) {
  if (!schedule) {
    return;
  }

  const date = schedule.date || getTodayDateString();
  const prevOffDays =
    previousSchedule?.offDays || [];
  const nextOffDays = schedule.offDays || [];

  const changedManagers = [
    ...prevOffDays.filter(
      (id) => !nextOffDays.includes(id)
    ),
    ...nextOffDays.filter(
      (id) => !prevOffDays.includes(id)
    ),
  ];

  if (!changedManagers.length) {
    return;
  }

  const users = await getUsersByManagerIds(
    changedManagers
  );

  await Promise.all(
    users.map((user) =>
      createNotificationIfMissing({
        userId: user.uid,
        dedupKey: `schedule_${date}_${user.uid}`,
        type: "schedule_change",
        title: "Изменение расписания",
        body: `Обновлено расписание на ${date}`,
        link: "/",
        priority: "low",
        data: { date },
        channels: ["in_app"],
      })
    )
  );

  await syncSubstitutionNotifications({
    schedule,
  });
}

export async function syncSubstitutionNotifications({
  schedule,
}) {
  if (!schedule?.shifts) {
    return;
  }

  const date =
    schedule.date || getTodayDateString();
  const coveringIds =
    getCoveringManagerIds(schedule);

  if (!coveringIds.length) {
    return;
  }

  const users = await getUsersByManagerIds(
    coveringIds
  );

  await Promise.all(
    users.map((user) => {
      const shiftInfo = getManagerShiftInfo(
        schedule,
        user.managerId
      );

      if (!shiftInfo?.coveringFor) {
        return null;
      }

      return notifySubstitutionReminder({
        userId: user.uid,
        date,
        coveringFor:
          shiftInfo.coveringFor,
        shiftStart: shiftInfo.shift?.start,
        shiftEnd: shiftInfo.shift?.end,
      });
    })
  );
}

export async function syncTrafficOverloadNotifications({
  traffic,
}) {
  if (!traffic?.load?.perManager) {
    return;
  }

  const date = traffic.date || getTodayDateString();

  const overloaded = Object.entries(
    traffic.load.perManager
  ).filter(
    ([, data]) =>
      data.share >= TRAFFIC_OVERLOAD_THRESHOLD
  );

  if (!overloaded.length) {
    return;
  }

  const managerIds = overloaded.map(
    ([managerId]) => managerId
  );

  const users = await getUsersByManagerIds(
    managerIds
  );

  await Promise.all(
    users.map((user) => {
      const entry = overloaded.find(
        ([managerId]) =>
          managerId === user.managerId
      );

      if (!entry) {
        return null;
      }

      const [, data] = entry;

      return createNotificationIfMissing({
        userId: user.uid,
        dedupKey: `traffic_${date}_${user.managerId}`,
        type: "traffic_overload",
        title: "Высокая нагрузка трафика",
        body: `Доля ${Math.round(data.share * 100)}% · ${getManagerNameById(user.managerId)}`,
        link: "/",
        priority: "high",
        data: {
          managerId: user.managerId,
          share: data.share,
          date,
        },
        channels: ["in_app"],
      });
    })
  );

  const admins = await getUsersByRole("admin");

  await Promise.all(
    admins.map((admin) =>
      createNotificationIfMissing({
        userId: admin.uid,
        dedupKey: `traffic_admin_${date}`,
        type: "traffic_overload",
        title: "Перегрузка трафика команды",
        body: `${overloaded.length} менеджер(ов) выше порога ${Math.round(TRAFFIC_OVERLOAD_THRESHOLD * 100)}%`,
        link: "/management",
        priority: "high",
        data: { date, count: overloaded.length },
        channels: ["in_app"],
      })
    )
  );
}

export async function syncManagerShiftNotifications({
  userData,
  schedule,
}) {
  if (!userData?.uid || !schedule) {
    return;
  }

  const managerId = userData.managerId;

  if (!managerId) {
    return;
  }

  const shiftInfo = getManagerShiftInfo(
    schedule,
    managerId
  );

  if (!shiftInfo?.coveringFor) {
    return;
  }

  const date = schedule.date || getTodayDateString();

  await notifySubstitutionReminder({
    userId: userData.uid,
    date,
    coveringFor: shiftInfo.coveringFor,
    shiftStart: shiftInfo.shift?.start,
    shiftEnd: shiftInfo.shift?.end,
  });
}

export async function notifyAdminsSyncFailures(
  failedLogs
) {
  if (!failedLogs?.length) {
    return;
  }

  const admins = await getUsersByRole("admin");

  await Promise.all(
    admins.flatMap((admin) =>
      failedLogs.slice(0, 5).map((log) =>
        createNotificationIfMissing({
          userId: admin.uid,
          dedupKey: `sync_failed_${log.paymentId || log.id}`,
          type: "sync_failed",
          title: "Ошибка Google Sheets",
          body: `Payment ${log.paymentId || "—"} не синхронизирован`,
          link: "/management",
          priority: "high",
          data: {
            paymentId: log.paymentId,
            error: log.error || "",
          },
          channels: ["in_app"],
        })
      )
    )
  );
}
