const COURSE_TT_EXPORT_LABELS = {
  АЕ: "Ae",
  "Экстерн АЕ": "Extern Ae",
};

function formatCourseForTt(course) {
  const value = String(course || "").trim();

  if (!value) {
    return "";
  }

  return (
    COURSE_TT_EXPORT_LABELS[value] ||
    value
  );
}

module.exports = {
  formatCourseForTt,
  COURSE_TT_EXPORT_LABELS,
};
