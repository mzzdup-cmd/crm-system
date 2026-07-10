function formatCourseForTt(course) {
  const value = String(course || "").trim();

  if (!value) {
    return "";
  }

  // Only «Ae» is Latin in TT; «Экстерн» stays Russian.
  return value.replace(/А[Ее]/g, "Ae");
}

module.exports = {
  formatCourseForTt,
};
