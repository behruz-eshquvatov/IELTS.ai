const { getTeacherStudentDirectory } = require("../services/teacherStudentDirectoryService");

async function listTeacherStudents(req, res) {
  const payload = await getTeacherStudentDirectory({
    teacherId: String(req.auth?.userId || ""),
    query: req.query || {},
  });

  return res.json(payload);
}

module.exports = {
  listTeacherStudents,
};
