import {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,
} from "../../constants/notifications";

export const NOTIFICATION_TYPE_CONFIG = {
  [NOTIFICATION_TYPES.OVERDUE_PAYMENT]: {
    label: "Просрочка",
    icon: "⚠️",
    priority: NOTIFICATION_PRIORITY.HIGH,
    color: "text-red-400",
  },
  [NOTIFICATION_TYPES.NEXT_PAYMENT_REMINDER]: {
    label: "Напоминание",
    icon: "📅",
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    color: "text-yellow-400",
  },
  [NOTIFICATION_TYPES.NEW_PAYMENT]: {
    label: "Новая оплата",
    icon: "💳",
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    color: "text-green-400",
  },
  [NOTIFICATION_TYPES.SYNC_FAILED]: {
    label: "Ошибка синхронизации",
    icon: "🔗",
    priority: NOTIFICATION_PRIORITY.HIGH,
    color: "text-orange-400",
  },
  [NOTIFICATION_TYPES.SUBSTITUTION_REMINDER]: {
    label: "Замена",
    icon: "🔄",
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    color: "text-brand",
  },
  [NOTIFICATION_TYPES.TRAFFIC_OVERLOAD]: {
    label: "Нагрузка трафика",
    icon: "📊",
    priority: NOTIFICATION_PRIORITY.HIGH,
    color: "text-orange-400",
  },
  [NOTIFICATION_TYPES.SCHEDULE_CHANGE]: {
    label: "Изменение расписания",
    icon: "📋",
    priority: NOTIFICATION_PRIORITY.LOW,
    color: "text-neutral-300",
  },
  [NOTIFICATION_TYPES.PENDING_SALE]: {
    label: "Временная продажа",
    icon: "⚡",
    priority: NOTIFICATION_PRIORITY.HIGH,
    color: "text-brand",
  },
  [NOTIFICATION_TYPES.MISSING_VK_LINK]: {
    label: "Нужно дозаполнить",
    icon: "🔗",
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    color: "text-amber-400",
  },
  [NOTIFICATION_TYPES.MISSING_START_DATE]: {
    label: "Указать поток",
    icon: "📆",
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    color: "text-amber-400",
  },
  [NOTIFICATION_TYPES.CURATOR_START]: {
    label: "Куратору",
    icon: "📤",
    priority: NOTIFICATION_PRIORITY.HIGH,
    color: "text-purple-400",
  },
};

export function getNotificationConfig(type) {
  return (
    NOTIFICATION_TYPE_CONFIG[type] || {
      label: "Уведомление",
      icon: "🔔",
      priority: NOTIFICATION_PRIORITY.LOW,
      color: "text-neutral-300",
    }
  );
}
