export const CALENDAR_EVENT_TYPES = {
  DAY_OFF: "day_off",
  VACATION: "vacation",
  SUBSTITUTION: "substitution",
  ANNOUNCEMENT: "announcement",
  MAILING: "mailing",
  MEETING: "meeting",
  CUSTOM: "custom",
};

export const CALENDAR_IMPORTANCE = {
  NORMAL: "normal",
  HIGH: "high",
};

export const CALENDAR_TYPE_LABELS = {
  day_off: "Выходной",
  vacation: "Отпуск",
  substitution: "Замена",
  announcement: "Объявление",
  mailing: "Рассылка",
  meeting: "Созвон",
  custom: "Событие",
};

export const CALENDAR_TYPE_STYLES = {
  day_off: {
    chip: "bg-slate-500/20 text-slate-200 border-slate-500/40",
    dot: "bg-slate-400",
  },
  vacation: {
    chip: "bg-blue-500/20 text-blue-200 border-blue-500/40",
    dot: "bg-blue-400",
  },
  substitution: {
    chip: "bg-purple-500/20 text-purple-200 border-purple-500/40",
    dot: "bg-purple-400",
  },
  meeting: {
    chip: "bg-yellow-500/20 text-yellow-100 border-yellow-500/40",
    dot: "bg-yellow-400",
  },
  mailing: {
    chip: "bg-yellow-500/20 text-yellow-100 border-yellow-500/40",
    dot: "bg-amber-400",
  },
  announcement: {
    chip: "bg-yellow-500/20 text-yellow-100 border-yellow-500/40",
    dot: "bg-yellow-400",
  },
  custom: {
    chip: "bg-cyan-500/20 text-cyan-100 border-cyan-500/40",
    dot: "bg-cyan-400",
  },
  important: {
    chip: "bg-red-500/20 text-red-200 border-red-500/40",
    dot: "bg-red-400",
  },
};

export const WEEKDAY_LABELS = [
  "Пн",
  "Вт",
  "Ср",
  "Чт",
  "Пт",
  "Сб",
  "Вс",
];

export const MONTH_LABELS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
