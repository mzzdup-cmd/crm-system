import {
  DELIVERY_CHANNELS,
} from "../constants/notifications";

/**
 * Foundation for future delivery channels.
 * Currently all notifications are in-app only.
 */

export async function deliverNotification(
  notification,
  channels = [DELIVERY_CHANNELS.IN_APP]
) {
  const results = {
    in_app: true,
    push: null,
    telegram: null,
    email: null,
  };

  if (channels.includes(DELIVERY_CHANNELS.PUSH)) {
    results.push = await deliverPush(notification);
  }

  if (channels.includes(DELIVERY_CHANNELS.TELEGRAM)) {
    results.telegram = await deliverTelegram(notification);
  }

  if (channels.includes(DELIVERY_CHANNELS.EMAIL)) {
    results.email = await deliverEmail(notification);
  }

  return results;
}

export async function deliverPush(_notification) {
  // Future: Firebase Cloud Messaging
  return {
    status: "not_configured",
    message: "Push delivery not enabled",
  };
}

export async function deliverTelegram(_notification) {
  // Future: Telegram Bot API
  return {
    status: "not_configured",
    message: "Telegram delivery not enabled",
  };
}

export async function deliverEmail(_notification) {
  // Future: SendGrid / Firebase Extensions
  return {
    status: "not_configured",
    message: "Email delivery not enabled",
  };
}

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator
  );
}

export async function requestPushPermission() {
  if (!isPushSupported()) {
    return "unsupported";
  }

  return Notification.requestPermission();
}
