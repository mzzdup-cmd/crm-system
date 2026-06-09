import {
  trackEvent,
} from "./monitoringService";

const errorBuffer = [];
const MAX_BUFFER = 20;

export function captureError(
  error,
  context = {}
) {
  const payload = {
    message:
      error?.message ||
      String(error),
    stack: error?.stack || null,
    context,
    timestamp: Date.now(),
    url: window.location.href,
    userAgent: navigator.userAgent,
  };

  errorBuffer.push(payload);

  if (errorBuffer.length > MAX_BUFFER) {
    errorBuffer.shift();
  }

  if (import.meta.env.DEV) {
    console.error(
      "[CRM Error]",
      payload
    );
  }

  trackEvent("app_error", {
    message: payload.message.slice(0, 100),
    context: JSON.stringify(context).slice(
      0,
      200
    ),
  });
}

export function initErrorTracking() {
  window.addEventListener(
    "error",
    (event) => {
      captureError(
        event.error || event.message,
        { type: "window.error" }
      );
    }
  );

  window.addEventListener(
    "unhandledrejection",
    (event) => {
      captureError(
        event.reason,
        { type: "unhandledrejection" }
      );
    }
  );
}

export function getRecentErrors() {
  return [...errorBuffer];
}
