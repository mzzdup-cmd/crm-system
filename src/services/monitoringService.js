import {
  getAnalytics,
  logEvent,
  isSupported,
  setUserProperties,
} from "firebase/analytics";

import app from "./firebase";

let analyticsInstance = null;
let initialized = false;

export async function initMonitoring() {
  if (initialized) {
    return analyticsInstance;
  }

  initialized = true;

  if (await isSupported()) {
    analyticsInstance = getAnalytics(app);
  }

  return analyticsInstance;
}

export function trackPageView(path, title) {
  if (!analyticsInstance) {
    return;
  }

  logEvent(analyticsInstance, "page_view", {
    page_path: path,
    page_title: title || path,
    app_env:
      import.meta.env.VITE_APP_ENV ||
      "development",
  });
}

export function trackEvent(
  eventName,
  params = {}
) {
  if (!analyticsInstance) {
    return;
  }

  logEvent(analyticsInstance, eventName, {
    ...params,
    app_env:
      import.meta.env.VITE_APP_ENV ||
      "development",
  });
}

export function setMonitoringUser({
  uid,
  role,
  managerId,
}) {
  if (!analyticsInstance || !uid) {
    return;
  }

  setUserProperties(analyticsInstance, {
    user_role: role || "unknown",
    manager_id: managerId || "none",
  });
}

export function getAnalyticsInstance() {
  return analyticsInstance;
}
