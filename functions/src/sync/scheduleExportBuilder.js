/**
 * Schedule + traffic export for MM Dashboard (Schedule tab).
 * Does not modify Sync A:Q.
 */

const MANAGER_IDS = [
  "denis_manuilov",
  "ruslan_romanyuk",
  "alexander_simanov",
  "sergey_grebenshchikov",
  "andrey_volkov",
  "polina_penkova",
  "katya_bakaeva",
  "polina_plamadya",
  "violeta_petrova",
];

const MANAGER_NAMES = {
  denis_manuilov: "Денис Мануйлов",
  ruslan_romanyuk: "Руслан Романюк",
  alexander_simanov: "Александр Симанов",
  sergey_grebenshchikov: "Сергей Гребенщиков",
  andrey_volkov: "Андрей Волков",
  polina_penkova: "Полина Пенькова",
  katya_bakaeva: "Катя Бакаева",
  polina_plamadya: "Полина Пламадяла",
  violeta_petrova: "Виолетта Петрова",
};

const GROUP_OFFDAY_MANAGER_IDS = [
  "denis_manuilov",
  "ruslan_romanyuk",
  "alexander_simanov",
  "sergey_grebenshchikov",
  "polina_plamadya",
];

const SCHEDULE_HEADERS = [
  "Дата",
  "Менеджер_ID",
  "Менеджер",
  "Выходной",
  "Доля",
];

function computeGroupTrafficDistribution(offDays = []) {
  const distribution = {};
  const groupOffDays = offDays.filter((id) =>
    GROUP_OFFDAY_MANAGER_IDS.includes(id)
  );
  const working = GROUP_OFFDAY_MANAGER_IDS.filter(
    (id) => !groupOffDays.includes(id)
  );

  if (groupOffDays.length === 0) {
    const equalShare = 1 / GROUP_OFFDAY_MANAGER_IDS.length;
    GROUP_OFFDAY_MANAGER_IDS.forEach((id) => {
      distribution[id] = equalShare;
    });
    return distribution;
  }

  const baseShare = 1 / GROUP_OFFDAY_MANAGER_IDS.length;
  const extraLoad =
    (groupOffDays.length * baseShare) /
    Math.max(working.length, 1);

  GROUP_OFFDAY_MANAGER_IDS.forEach((id) => {
    if (groupOffDays.includes(id)) {
      distribution[id] = 0;
      return;
    }
    distribution[id] = baseShare + extraLoad;
  });

  return distribution;
}

function buildDefaultSchedule(date) {
  const offDays = [];
  const trafficDistribution =
    computeGroupTrafficDistribution(offDays);

  return {
    date,
    offDays,
    trafficDistribution,
  };
}

function resolveSchedule(date, stored) {
  if (!stored) {
    return buildDefaultSchedule(date);
  }

  const offDays = stored.offDays || [];
  const trafficDistribution =
    stored.trafficDistribution ||
    computeGroupTrafficDistribution(offDays);

  return {
    date,
    offDays,
    trafficDistribution,
  };
}

function getMoscowMonthDates(referenceDate = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "numeric",
  }).formatToParts(referenceDate);

  const year = Number(
    parts.find((p) => p.type === "year").value
  );
  const month = Number(
    parts.find((p) => p.type === "month").value
  );
  const lastDay = new Date(year, month, 0).getDate();
  const dates = [];

  for (let day = 1; day <= lastDay; day += 1) {
    dates.push(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    );
  }

  return { year, month, dates };
}

async function fetchScheduleMap(db, dates) {
  const entries = await Promise.all(
    dates.map(async (date) => {
      const snap = await db
        .collection("schedule")
        .doc(date)
        .get();
      return [date, snap.exists ? snap.data() : null];
    })
  );

  return Object.fromEntries(entries);
}

function buildScheduleExportRows(scheduleByDate) {
  const rows = [];

  Object.entries(scheduleByDate).forEach(
    ([date, stored]) => {
      const schedule = resolveSchedule(
        date,
        stored
      );
      const offSet = new Set(
        schedule.offDays || []
      );
      const distribution =
        schedule.trafficDistribution || {};

      MANAGER_IDS.forEach((managerId) => {
        const isOff = offSet.has(managerId);
        let share = 0;

        if (!isOff) {
          const fromDistribution = Number(
            distribution[managerId] ?? 0
          );

          if (fromDistribution > 0) {
            share = fromDistribution;
          } else {
            const workingCount = MANAGER_IDS.filter(
              (id) => !offSet.has(id)
            ).length;
            share = workingCount
              ? 1 / workingCount
              : 0;
          }
        }

        rows.push([
          date,
          managerId,
          MANAGER_NAMES[managerId] || managerId,
          isOff ? "TRUE" : "FALSE",
          share,
        ]);
      });
    }
  );

  return rows;
}

async function buildScheduleExportTable(db) {
  const { dates } = getMoscowMonthDates();
  const scheduleByDate =
    await fetchScheduleMap(db, dates);
  const rows = buildScheduleExportRows(
    scheduleByDate
  );

  return {
    headers: SCHEDULE_HEADERS,
    rows,
    dateCount: dates.length,
  };
}

module.exports = {
  SCHEDULE_HEADERS,
  buildScheduleExportTable,
  getMoscowMonthDates,
  MANAGER_IDS,
  MANAGER_NAMES,
};
