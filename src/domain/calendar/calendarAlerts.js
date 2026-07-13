import {
  CALENDAR_MAJOR_ALERT_TYPES,
  CALENDAR_TYPE_LABELS,
} from "../../constants/calendar.js";

const LEGACY_MAJOR_ALERT_TITLES = new Set([
  "трафик",
  "апсейл",
  "апсэйл",
  "рассылка",
]);

function normalizeAlertText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function isMajorCalendarAlert(event) {
  if (!event) {
    return false;
  }

  if (
    CALENDAR_MAJOR_ALERT_TYPES.includes(
      event.type
    )
  ) {
    return true;
  }

  const title = normalizeAlertText(event.title);
  const label = normalizeAlertText(
    CALENDAR_TYPE_LABELS[event.type]
  );

  return (
    LEGACY_MAJOR_ALERT_TITLES.has(title) ||
    LEGACY_MAJOR_ALERT_TITLES.has(label)
  );
}

export function getMajorCalendarAlerts(
  events = []
) {
  return events.filter(isMajorCalendarAlert);
}

export function dayHasMajorCalendarAlert(
  events = []
) {
  return getMajorCalendarAlerts(events).length > 0;
}

export function getMajorAlertLabel(event) {
  if (
    event?.type &&
    CALENDAR_TYPE_LABELS[event.type]
  ) {
    return CALENDAR_TYPE_LABELS[event.type];
  }

  return event?.title || "Оповещение";
}
