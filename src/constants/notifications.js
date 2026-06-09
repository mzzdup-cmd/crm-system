export const NOTIFICATION_TYPES = {
  OVERDUE_PAYMENT: "overdue_payment",
  NEXT_PAYMENT_REMINDER: "next_payment_reminder",
  NEW_PAYMENT: "new_payment",
  SYNC_FAILED: "sync_failed",
  SUBSTITUTION_REMINDER: "substitution_reminder",
  TRAFFIC_OVERLOAD: "traffic_overload",
  SCHEDULE_CHANGE: "schedule_change",
  PENDING_SALE: "pending_sale",
  MISSING_VK_LINK: "missing_vk_link",
};

export const NOTIFICATION_PRIORITY = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
};

export const DELIVERY_CHANNELS = {
  IN_APP: "in_app",
  PUSH: "push",
  TELEGRAM: "telegram",
  EMAIL: "email",
};

export const TRAFFIC_OVERLOAD_THRESHOLD = 0.35;

export const NOTIFICATION_LIMIT = 50;

export const REMINDER_DAYS_BEFORE = [1, 0];
