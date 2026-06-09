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
  compact = false,
}) {
  const config = getNotificationConfig(
    notification.type
  );

  const content = (
    <div
      className={`
        flex gap-3 p-4 rounded-xl transition-all duration-200
        hover:bg-slate-800/80
        ${
          notification.read
            ? "opacity-70"
            : "bg-slate-800/40"
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

          <div className="text-xs text-slate-500 shrink-0">

            {formatTime(notification.createdAt)}

          </div>

        </div>

        <div
          className={`
            text-slate-300 mt-1
            ${compact ? "text-sm line-clamp-2" : "text-sm"}
          `}
        >

          {notification.body}

        </div>

        {

          !notification.read && (

            <div className="mt-2 w-2 h-2 rounded-full bg-cyan-400" />

          )

        }

      </div>

    </div>
  );

  function handleClick() {
    if (!notification.read && onRead) {
      onRead(notification.id);
    }
  }

  if (notification.link) {
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
    <button
      type="button"
      onClick={handleClick}
      className="block w-full text-left"
    >
      {content}
    </button>
  );
}
