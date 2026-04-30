const mongoose = require("mongoose");
const { ClassMembership } = require("../models/classMembershipModel");
const { TeacherClass } = require("../models/teacherClassModel");

function toObjectId(value) {
  const safe = String(value || "").trim();
  if (!mongoose.Types.ObjectId.isValid(safe)) {
    return null;
  }
  return new mongoose.Types.ObjectId(safe);
}

async function getTeacherClasses(teacherId) {
  return TeacherClass.find({ teacherId: String(teacherId || "").trim() })
    .sort({ name: 1, createdAt: -1 })
    .lean();
}

async function getAccessibleStudentMemberships({ teacherId, classId = "" }) {
  const safeTeacherId = String(teacherId || "").trim();
  const query = {
    teacherId: safeTeacherId,
    status: "active",
  };

  if (classId) {
    const classObjectId = toObjectId(classId);
    if (!classObjectId) {
      return {
        classes: [],
        memberships: [],
        studentIds: [],
        classById: new Map(),
        classesByStudentId: new Map(),
      };
    }

    const classDoc = await TeacherClass.findOne({ _id: classObjectId, teacherId: safeTeacherId }).lean();
    if (!classDoc) {
      return {
        classes: [],
        memberships: [],
        studentIds: [],
        classById: new Map(),
        classesByStudentId: new Map(),
      };
    }

    query.classId = classDoc._id;
  }

  const memberships = await ClassMembership.find(query).lean();
  const classIds = Array.from(new Set(memberships.map((item) => String(item.classId || "")).filter(Boolean)));
  const classes = classIds.length
    ? await TeacherClass.find({ _id: { $in: classIds }, teacherId: safeTeacherId }).lean()
    : [];
  const classById = new Map(classes.map((item) => [String(item._id), item]));
  const classesByStudentId = new Map();
  const studentIds = [];

  memberships.forEach((membership) => {
    const studentId = String(membership.studentId || "").trim();
    const classDoc = classById.get(String(membership.classId || ""));
    if (!studentId || !classDoc) {
      return;
    }

    if (!classesByStudentId.has(studentId)) {
      classesByStudentId.set(studentId, []);
      studentIds.push(studentId);
    }

    classesByStudentId.get(studentId).push({
      classId: String(classDoc._id),
      name: String(classDoc.name || ""),
    });
  });

  return {
    classes,
    memberships,
    studentIds,
    classById,
    classesByStudentId,
  };
}

async function teacherCanAccessStudent({ teacherId, studentId, classId = "" }) {
  const access = await getAccessibleStudentMemberships({ teacherId, classId });
  return access.studentIds.includes(String(studentId || "").trim());
}

module.exports = {
  getTeacherClasses,
  getAccessibleStudentMemberships,
  teacherCanAccessStudent,
};
