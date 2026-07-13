import test from "node:test";
import assert from "node:assert/strict";

import {
  CALENDAR_EVENT_TYPES,
} from "../../src/constants/calendar.js";

import {
  dayHasMajorCalendarAlert,
  getMajorCalendarAlerts,
  isMajorCalendarAlert,
} from "../../src/domain/calendar/calendarAlerts.js";

test("traffic upsell mailing types are major alerts", () => {
  assert.equal(
    isMajorCalendarAlert({
      type: CALENDAR_EVENT_TYPES.TRAFFIC,
      title: "План",
    }),
    true
  );
  assert.equal(
    isMajorCalendarAlert({
      type: CALENDAR_EVENT_TYPES.UPSELL,
      title: "День",
    }),
    true
  );
  assert.equal(
    isMajorCalendarAlert({
      type: CALENDAR_EVENT_TYPES.MAILING,
      title: "Рассылка",
    }),
    true
  );
});

test("legacy titled events still trigger red day", () => {
  assert.equal(
    isMajorCalendarAlert({
      type: CALENDAR_EVENT_TYPES.ANNOUNCEMENT,
      title: "Трафик",
    }),
    true
  );
});

test("regular meeting is not a major alert", () => {
  assert.equal(
    isMajorCalendarAlert({
      type: CALENDAR_EVENT_TYPES.MEETING,
      title: "Созвон",
    }),
    false
  );
});

test("dayHasMajorCalendarAlert checks event list", () => {
  const alerts = getMajorCalendarAlerts([
    {
      id: "1",
      type: CALENDAR_EVENT_TYPES.MEETING,
      title: "Созвон",
    },
    {
      id: "2",
      type: CALENDAR_EVENT_TYPES.TRAFFIC,
      title: "Трафик",
    },
  ]);

  assert.equal(alerts.length, 1);
  assert.equal(
    dayHasMajorCalendarAlert([
      {
        type: CALENDAR_EVENT_TYPES.TRAFFIC,
        title: "Трафик",
      },
    ]),
    true
  );
});
