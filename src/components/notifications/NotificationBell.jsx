import {
  useState,
  useMemo,
} from "react";

import { useNotifications }
from "../../hooks/useNotifications";

import {
  NOTIFICATION_TYPES,
} from "../../constants/notifications";

import NotificationDropdown
from "./NotificationDropdown";

export default function NotificationBell({
  className = "",
}) {
  const [open, setOpen] = useState(false);

  const {
    notifications,
    missingVkReminders,
    unreadCount,
    markRead,
    markResolved,
    markAllRead,
  } = useNotifications();

  const visibleNotifications = useMemo(() => {
    const otherActive = notifications.filter(
      (item) =>
        !item.resolved &&
        item.type !==
          NOTIFICATION_TYPES.MISSING_VK_LINK
    );

    return [
      ...missingVkReminders,
      ...otherActive,
    ].sort(
      (a, b) =>
        Number(b.createdAt || 0) -
        Number(a.createdAt || 0)
    );
  }, [notifications, missingVkReminders]);

  function handleMarkRead(id) {
    if (
      String(id).startsWith(
        "missing_vk_client_"
      )
    ) {
      return Promise.resolve();
    }

    return markRead(id);
  }

  function handleMarkResolved(id) {
    if (
      String(id).startsWith(
        "missing_vk_client_"
      )
    ) {
      return Promise.resolve();
    }

    return markResolved(id);
  }

  return (
    <div className={`relative z-30 ${className}`}>

      <button
        type="button"
        aria-label="Уведомления"
        onClick={() => setOpen((v) => !v)}
        className="
          relative p-2.5 rounded-xl
          bg-surface-raised/80 hover:bg-surface-hover
          transition-colors
        "
      >
        <span className="text-lg">🔔</span>

        {

          unreadCount > 0 && (

            <span
              className="
                absolute -top-1 -right-1
                min-w-[1.25rem] h-5 px-1
                flex items-center justify-center
                rounded-full bg-red-500
                text-[10px] font-bold
              "
            >

              {

                unreadCount > 99
                  ? "99+"
                  : unreadCount

              }

            </span>

          )

        }

      </button>

      <NotificationDropdown
        open={open}
        onClose={() => setOpen(false)}
        notifications={visibleNotifications}
        unreadCount={unreadCount}
        onMarkRead={handleMarkRead}
        onMarkResolved={handleMarkResolved}
        onMarkAllRead={markAllRead}
      />

    </div>
  );
}
