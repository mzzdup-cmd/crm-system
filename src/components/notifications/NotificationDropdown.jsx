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
        absolute left-full top-0 ml-2 z-[100]
        w-[min(calc(100vw-2rem),20rem)]
        bg-surface border border-neutral-700
        rounded-2xl shadow-2xl
        overflow-hidden
      "
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">

        <div className="font-bold">

          Уведомления

          {

            unreadCount > 0 && (

              <span className="ml-2 text-brand text-sm">

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
              className="text-xs text-brand hover:text-brand"
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

              <div className="p-6 text-center text-neutral-400 text-sm">

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

      <div className="border-t border-neutral-800 p-3">

        <Link
          to="/notifications"
          onClick={onClose}
          className="
            block text-center text-sm
            text-brand hover:text-brand
            py-2 rounded-xl hover:bg-surface-raised
          "
        >

          Все уведомления →

        </Link>

      </div>

    </div>
  );
}
