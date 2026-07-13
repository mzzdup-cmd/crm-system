import { Link } from "react-router-dom";

import {
  getNotificationConfig,
} from "../../domain/notifications/notificationTypes";

function formatTime(timestamp) {
  if (!timestamp) {
    return "";
  }

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) {
    return "сейчас";
  }

  if (diffMin < 60) {
    return `${diffMin} мин`;
  }

  const diffHours = Math.floor(diffMin / 60);

  if (diffHours < 24) {
    return `${diffHours} ч`;
  }

  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

export default function NotificationItem({
  notification,
  onRead,
  onResolve,
  compact = false,
}) {
  const config = getNotificationConfig(
    notification.type
  );

  const isDone = notification.resolved;

  function stopNavigation(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  async function handleMarkRead(event) {
    stopNavigation(event);

    if (!notification.read && onRead) {
      await onRead(notification.id);
    }
  }

  async function handleResolve(event) {
    stopNavigation(event);

    if (onResolve) {
      await onResolve(notification.id);
    }
  }

  const content = (
    <div
      className={`
        flex gap-3 p-4 rounded-xl transition-all duration-200
        hover:bg-surface-raised/80
        ${
          notification.read || isDone
            ? "opacity-70"
            : "bg-surface-raised/40"
        }
      `}
    >
      <div className="text-xl shrink-0 pt-0.5">

        {config.icon}

      </div>

      <div className="flex-1 min-w-0">

        <div className="flex items-start justify-between gap-2">

          <div
            className={`font-semibold text-sm ${config.color}`}
          >

            {notification.title}

          </div>

          <div className="text-xs text-neutral-500 shrink-0">

            {formatTime(notification.createdAt)}

          </div>

        </div>

        <div
          className={`
            text-neutral-300 mt-1
            ${compact ? "text-sm line-clamp-2" : "text-sm"}
          `}
        >

          {notification.body}

        </div>

        {isDone && (
          <div className="mt-2 text-xs text-green-400">
            Исполнено
          </div>
        )}

        {!isDone && (
          <div className="mt-3 flex flex-wrap gap-2">
            {!notification.read && (
              <button
                type="button"
                onClick={handleMarkRead}
                className="
                  px-2.5 py-1 rounded-lg text-xs
                  bg-surface-hover text-neutral-200
                  hover:bg-neutral-600 transition-colors
                "
              >
                Прочитано
              </button>
            )}

            {onResolve && (
              <button
                type="button"
                onClick={handleResolve}
                className="
                  px-2.5 py-1 rounded-lg text-xs
                  bg-brand/15 text-brand
                  hover:bg-brand/20 transition-colors
                "
              >
                Исполнено
              </button>
            )}
          </div>
        )}

        {

          !notification.read && !isDone && (

            <div className="mt-2 w-2 h-2 rounded-full bg-brand" />

          )

        }

      </div>

    </div>
  );

  function handleClick() {
    if (!notification.read && onRead && !isDone) {
      onRead(notification.id);
    }
  }

  if (notification.link && !isDone) {
    return (
      <Link
        to={notification.link}
        onClick={handleClick}
        className="block"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="block w-full text-left">
      {content}
    </div>
  );
}
