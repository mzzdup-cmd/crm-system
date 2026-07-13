import test from "node:test";
import assert from "node:assert/strict";

import {
  CALENDAR_EVENT_TYPES,
} from "../../src/constants/calendar.js";

import {
  buildDayCalendarLines,
} from "../../src/domain/calendar/buildDayCalendarLines.js";

test("empty day has no lines", () => {
  const lines = buildDayCalendarLines({
    date: "2026-07-05",
    schedule: null,
    events: [],
  });

  assert.equal(lines.length, 0);
});

test("traffic event adds alert line", () => {
  const lines = buildDayCalendarLines({
    date: "2026-07-01",
    schedule: null,
    events: [
      {
        id: "t1",
        type: CALENDAR_EVENT_TYPES.TRAFFIC,
        title: "Трафик",
      },
    ],
  });

  assert.equal(lines.length, 1);
  assert.equal(lines[0].kind, "alert");
  assert.equal(lines[0].label, "Трафик");
});

test("off day shows manager line with cover tooltip", () => {
  const lines = buildDayCalendarLines({
    date: "2026-07-07",
    schedule: {
      date: "2026-07-07",
      offDays: ["katya_bakaeva"],
      shifts: {
        violeta_petrova: {
          active: true,
          coveringFor: "katya_bakaeva",
          start: "11:00",
          end: "21:00",
        },
      },
      substitutions: [
        {
          from: "katya_bakaeva",
          to: "violeta_petrova",
        },
      ],
    },
    events: [],
  });

  const offLine = lines.find(
    (line) => line.kind === "off"
  );

  assert.ok(offLine);
  assert.match(
    offLine.label,
    /Катя Бакаева — выходной/
  );
  assert.match(
    offLine.tooltip,
    /Виолетта Петрова/
  );
});
