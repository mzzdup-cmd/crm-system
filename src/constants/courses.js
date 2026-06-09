export const COURSES = [
  "Монтаж",
  "Экстерн Монтаж",
  "АЕ",
  "Экстерн АЕ",
  "3Д",
  "Экстерн 3Д",
  "Ретушь",
  "Экстерн Ретушь",
  "МобСъемка",
  "Экстерн МобСъемка",
  "Сайты",
  "Экстерн Сайты",
];

export const EXTERN_COURSES = COURSES.filter(
  (course) => course.startsWith("Экстерн")
);

export const SUBSCRIPTION_COURSES = COURSES.filter(
  (course) => !course.startsWith("Экстерн")
);

export function isExternCourse(course) {
  return EXTERN_COURSES.includes(course);
}

export function isSubscriptionCourse(course) {
  return SUBSCRIPTION_COURSES.includes(course);
}
