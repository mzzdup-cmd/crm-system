import {
  useState,
} from "react";

import { useNotifications }
from "../../hooks/useNotifications";

import NotificationDropdown
from "./NotificationDropdown";

export default function NotificationBell({
  className = "",
}) {
  const [open, setOpen] = useState(false);

  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
  } = useNotifications();

  return (
    <div className={`relative z-30 ${className}`}>

      <button
        type="button"
        aria-label="Уведомления"
        onClick={() => setOpen((v) => !v)}
        className="
          relative p-2.5 rounded-xl
          bg-slate-800/80 hover:bg-slate-700
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
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
      />

    </div>
  );
}
