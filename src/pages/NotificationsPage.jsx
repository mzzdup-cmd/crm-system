import { useNotifications }
from "../hooks/useNotifications";

import NotificationItem
from "../components/notifications/NotificationItem";

import EmptyState
from "../components/ui/EmptyState";

import RealtimeIndicator
from "../components/ui/RealtimeIndicator";

import { NOTIFICATION_TYPES }
from "../constants/notifications";

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    connected,
    markRead,
    markAllRead,
  } = useNotifications();

  const fillInReminders =
    notifications.filter(
      (item) =>
        item.type ===
          NOTIFICATION_TYPES.MISSING_VK_LINK &&
        !item.resolved
    );

  const otherNotifications =
    notifications.filter(
      (item) =>
        item.type !==
          NOTIFICATION_TYPES.MISSING_VK_LINK ||
        item.resolved
    );

  return (
    <div className="space-y-6">

      <div className="flex flex-wrap items-start justify-between gap-4">

        <div>

          <h1 className="text-3xl md:text-4xl font-bold">

            Уведомления

          </h1>

          <p className="text-slate-400 mt-2 flex items-center gap-3">

            <span>

              {

                unreadCount
                  ? `${unreadCount} непрочитанных`
                  : "Все прочитано"

              }

            </span>

            <RealtimeIndicator connected={connected} />

          </p>

        </div>

        {

          unreadCount > 0 && (

            <button
              type="button"
              onClick={markAllRead}
              className="
                px-4 py-2 rounded-xl
                bg-cyan-500/20 text-cyan-300
                hover:bg-cyan-500/30 transition-colors
              "
            >

              Прочитать все

            </button>

          )

        }

      </div>

      {fillInReminders.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-amber-400">
            Нужно дозаполнить
          </h2>

          <div className="space-y-2 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-2">
            {fillInReminders.map(
              (notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={
                    notification
                  }
                  onRead={markRead}
                />
              )
            )}
          </div>
        </section>
      )}

      {

        notifications.length === 0

          ? (

            <EmptyState
              icon="🔔"
              title="Уведомлений пока нет"
              description="Здесь появятся просрочки, напоминания об оплате, новые платежи и системные алерты."
            />

          )

          : (

            <section className="space-y-3">
              {fillInReminders.length >
                0 && (
                <h2 className="text-lg font-bold">
                  Остальные
                </h2>
              )}

              <div className="space-y-2">
                {otherNotifications.map(
                  (notification) => (
                    <NotificationItem
                      key={
                        notification.id
                      }
                      notification={
                        notification
                      }
                      onRead={markRead}
                    />
                  )
                )}
              </div>
            </section>

          )

      }

    </div>
  );
}
