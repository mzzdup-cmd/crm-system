import {
  useEffect,
  useRef,
} from "react";

import { Link } from "react-router-dom";

import NotificationItem
from "./NotificationItem";

export default function NotificationDropdown({
  open,
  onClose,
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleClickOutside(event) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target)
      ) {
        onClose();
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const recent = notifications.slice(0, 8);

  return (
    <div
      ref={panelRef}
      className="
        absolute right-0 top-full mt-2 z-50
        w-[min(100vw-2rem,24rem)]
        bg-slate-900 border border-slate-700
        rounded-2xl shadow-2xl
        animate-slide-in-right
        overflow-hidden
      "
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">

        <div className="font-bold">

          Уведомления

          {

            unreadCount > 0 && (

              <span className="ml-2 text-cyan-400 text-sm">

                {unreadCount}

              </span>

            )

          }

        </div>

        {

          unreadCount > 0 && (

            <button
              type="button"
              onClick={onMarkAllRead}
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >

              Прочитать все

            </button>

          )

        }

      </div>

      <div className="max-h-80 overflow-y-auto">

        {

          recent.length === 0

            ? (

              <div className="p-6 text-center text-slate-400 text-sm">

                Нет уведомлений

              </div>

            )

            : (

              recent.map((notification) => (

                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={onMarkRead}
                  compact
                />

              ))

            )

        }

      </div>

      <div className="border-t border-slate-800 p-3">

        <Link
          to="/notifications"
          onClick={onClose}
          className="
            block text-center text-sm
            text-cyan-400 hover:text-cyan-300
            py-2 rounded-xl hover:bg-slate-800
          "
        >

          Все уведомления →

        </Link>

      </div>

    </div>
  );
}
