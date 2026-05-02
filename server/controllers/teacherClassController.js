const mongoose = require("mongoose");
const User = require("../models/userModel");
const StudentProfile = require("../models/studentProfileModel");
const StudentUnitProgress = require("../models/studentUnitProgressModel");
const StudentTaskAttempt = require("../models/studentTaskAttemptModel");
const StudentAnalytics = require("../models/studentAnalyticsModel");
const { TeacherClass, TEACHER_CLASS_STATUSES } = require("../models/teacherClassModel");
const { ClassMembership } = require("../models/classMembershipModel");
const { ClassJoinRequest } = require("../models/classJoinRequestModel");
const Notification = require("../models/notificationModel");
const { fetchTeacherClassHomeworkOverview } = require("../services/teacherClassHomeworkService");

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeText(value, maxLength = 400) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function buildTeacherProfileResponse(userDoc) {
  return {
    id: String(userDoc?._id || ""),
    fullName: normalizeText(userDoc?.fullName || "Teacher", 80) || "Teacher",
    email: String(userDoc?.email || "").trim().toLowerCase(),
    organization: String(userDoc?.organization || userDoc?.organizationName || ""),
    organizationId: userDoc?.organizationId ? String(userDoc.organizationId) : "",
    organizationName: String(userDoc?.organizationName || userDoc?.organization || ""),
    passwordMasked: "************",
    createdAt: userDoc?.createdAt || null,
    updatedAt: userDoc?.updatedAt || null,
  };
}

function toObjectId(value) {
  const safe = String(value || "").trim();
  if (!mongoose.Types.ObjectId.isValid(safe)) {
    return null;
  }
  return new mongoose.Types.ObjectId(safe);
}

function mapClassForClient(classDoc, options = {}) {
  return {
    _id: String(classDoc?._id || ""),
    teacherId: String(classDoc?.teacherId || ""),
    organizationId: classDoc?.organizationId ? String(classDoc.organizationId) : "",
    name: String(classDoc?.name || ""),
    description: String(classDoc?.description || ""),
    startTime: String(classDoc?.startTime || ""),
    status: String(classDoc?.status || "inactive"),
    createdAt: classDoc?.createdAt || null,
    updatedAt: classDoc?.updatedAt || null,
    ...(options.includeCounts
      ? {
          activeStudentsCount: Number(classDoc?.activeStudentsCount || 0),
          pendingRequestsCount: Number(classDoc?.pendingRequestsCount || 0),
        }
      : {}),
  };
}

async function assertTeacherClassOwnership({ teacherId, classId }) {
  const classObjectId = toObjectId(classId);
  if (!classObjectId) {
    return null;
  }
  return TeacherClass.findOne({ _id: classObjectId, teacherId }).lean();
}

async function isTeacherClassStudentActiveMember({ teacherId, classId, studentId }) {
  const classObjectId = toObjectId(classId);
  if (!classObjectId) {
    return false;
  }
  const membership = await ClassMembership.findOne({
    classId: classObjectId,
    teacherId,
    studentId,
    status: "active",
  }).lean();
  return Boolean(membership);
}

async function findActiveStudentClass(studentId) {
  const memberships = await ClassMembership.find({
    studentId: String(studentId || "").trim(),
    status: "active",
  })
    .sort({ joinedAt: -1, createdAt: -1 })
    .lean();
  if (!memberships.length) {
    return { membership: null, classDoc: null };
  }

  const classIds = Array.from(new Set(memberships.map((item) => String(item.classId || "")).filter(Boolean)));
  const classes = await TeacherClass.find(
    { _id: { $in: classIds }, status: "active" },
    { name: 1, teacherId: 1 },
  ).lean();
  const classById = new Map(classes.map((item) => [String(item._id), item]));
  const membership = memberships.find((item) => classById.has(String(item.classId || "")));
  if (!membership) {
    return { membership: null, classDoc: null };
  }

  return { membership, classDoc: classById.get(String(membership.classId || "")) || null };
}

function buildAlreadyAssignedMessage(classDoc) {
  const className = normalizeText(classDoc?.name, 120);
  return className
    ? `This student is already in ${className}. A student can only be in one group.`
    : "This student is already in another group. A student can only be in one group.";
}

async function listTeacherClasses(req, res) {
  const teacherId = String(req.auth?.userId || "");
  const classes = await TeacherClass.find({ teacherId })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  const classIds = classes.map((item) => item._id);
  const [memberships, pendingRequests] = await Promise.all([
    ClassMembership.aggregate([
      { $match: { classId: { $in: classIds }, status: "active" } },
      { $group: { _id: "$classId", count: { $sum: 1 } } },
    ]),
    ClassJoinRequest.aggregate([
      { $match: { classId: { $in: classIds }, status: "pending" } },
      { $group: { _id: "$classId", count: { $sum: 1 } } },
    ]),
  ]);
  const activeByClassId = new Map(memberships.map((item) => [String(item._id), Number(item.count || 0)]));
  const pendingByClassId = new Map(pendingRequests.map((item) => [String(item._id), Number(item.count || 0)]));

  return res.json({
    classes: classes.map((item) =>
      mapClassForClient(
        {
          ...item,
          activeStudentsCount: activeByClassId.get(String(item._id)) || 0,
          pendingRequestsCount: pendingByClassId.get(String(item._id)) || 0,
        },
        { includeCounts: true },
      )),
  });
}

async function createTeacherClass(req, res) {
  const teacherId = String(req.auth?.userId || "");
  const teacherUser = await User.findById(teacherId).lean();
  if (!teacherUser || teacherUser.role !== "teacher") {
    return res.status(403).json({ message: "Teacher access required." });
  }

  const name = normalizeText(req.body?.name, 120);
  const description = normalizeText(req.body?.description, 400);
  const startTime = normalizeText(req.body?.startTime, 20);
  const status = String(req.body?.status || "active").toLowerCase();

  if (!name) {
    return res.status(400).json({ message: "Class name is required." });
  }
  if (!TEACHER_CLASS_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid class status." });
  }

  const createdClass = await TeacherClass.create({
    teacherId,
    organizationId: teacherUser.organizationId || null,
    name,
    description,
    startTime,
    status,
  });

  return res.status(201).json({
    class: mapClassForClient(createdClass.toObject(), { includeCounts: true }),
  });
}

async function getTeacherClassDetails(req, res) {
  const teacherId = String(req.auth?.userId || "");
  const classDoc = await assertTeacherClassOwnership({ teacherId, classId: req.params.classId });
  if (!classDoc) {
    return res.status(404).json({ message: "Class not found." });
  }
  const [activeCount, pendingCount] = await Promise.all([
    ClassMembership.countDocuments({ classId: classDoc._id, status: "active" }),
    ClassJoinRequest.countDocuments({ classId: classDoc._id, status: "pending" }),
  ]);
  return res.json({
    class: mapClassForClient(
      { ...classDoc, activeStudentsCount: activeCount, pendingRequestsCount: pendingCount },
      { includeCounts: true },
    ),
  });
}

async function updateTeacherClass(req, res) {
  const teacherId = String(req.auth?.userId || "");
  const classDoc = await assertTeacherClassOwnership({ teacherId, classId: req.params.classId });
  if (!classDoc) {
    return res.status(404).json({ message: "Class not found." });
  }

  const patch = {};
  if (typeof req.body?.name === "string") {
    const name = normalizeText(req.body.name, 120);
    if (!name) {
      return res.status(400).json({ message: "Class name cannot be empty." });
    }
    patch.name = name;
  }
  if (typeof req.body?.description === "string") {
    patch.description = normalizeText(req.body.description, 400);
  }
  if (typeof req.body?.startTime === "string") {
    patch.startTime = normalizeText(req.body.startTime, 20);
  }
  if (typeof req.body?.status === "string") {
    const status = String(req.body.status).toLowerCase();
    if (!TEACHER_CLASS_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid class status." });
    }
    patch.status = status;
  }
  if (!Object.keys(patch).length) {
    return res.status(400).json({ message: "No valid fields to update." });
  }

  const updated = await TeacherClass.findByIdAndUpdate(classDoc._id, { $set: patch }, { new: true, runValidators: true }).lean();
  return res.json({ class: mapClassForClient(updated) });
}

async function deleteTeacherClass(req, res) {
  const teacherId = String(req.auth?.userId || "");
  const classDoc = await assertTeacherClassOwnership({ teacherId, classId: req.params.classId });
  if (!classDoc) {
    return res.status(404).json({ message: "Class not found." });
  }

  await TeacherClass.updateOne({ _id: classDoc._id }, { $set: { status: "inactive" } });
  await ClassJoinRequest.updateMany(
    { classId: classDoc._id, status: "pending" },
    { $set: { status: "cancelled", respondedAt: new Date() } },
  );

  return res.json({ message: "Class deactivated." });
}

async function listTeacherClassStudents(req, res) {
  const teacherId = String(req.auth?.userId || "");
  const classDoc = await assertTeacherClassOwnership({ teacherId, classId: req.params.classId });
  if (!classDoc) {
    return res.status(404).json({ message: "Class not found." });
  }

  const [activeMemberships, pendingRequests] = await Promise.all([
    ClassMembership.find({ classId: classDoc._id, status: "active" }).lean(),
    ClassJoinRequest.find({ classId: classDoc._id, status: "pending" }).lean(),
  ]);
  const studentIds = Array.from(new Set(activeMemberships.map((item) => item.studentId)));
  const users = studentIds.length
    ? await User.find({ _id: { $in: studentIds }, role: "student" }, { fullName: 1, email: 1 }).lean()
    : [];
  const userById = new Map(users.map((item) => [String(item._id), item]));

  const students = activeMemberships.map((membership) => {
    const user = userById.get(String(membership.studentId)) || {};
    return {
      studentId: String(membership.studentId),
      fullName: String(user?.fullName || ""),
      email: String(user?.email || ""),
      status: "active",
      joinedAt: membership.joinedAt || membership.createdAt || null,
    };
  });

  return res.json({
    class: mapClassForClient(classDoc),
    students,
    pendingRequests: pendingRequests.map((item) => ({
      requestId: String(item._id),
      studentId: String(item.studentId),
      createdAt: item.createdAt || null,
    })),
  });
}

async function searchStudentsForTeacherClass(req, res) {
  const teacherId = String(req.auth?.userId || "");
  const classDoc = await assertTeacherClassOwnership({ teacherId, classId: req.params.classId });
  if (!classDoc) {
    return res.status(404).json({ message: "Class not found." });
  }

  const query = normalizeText(req.query?.q || "", 120).toLowerCase();
  const [memberships, pendingRequests] = await Promise.all([
    ClassMembership.find({ classId: classDoc._id, status: "active" }).lean(),
    ClassJoinRequest.find({ classId: classDoc._id, status: "pending" }).lean(),
  ]);
  const membershipByStudentId = new Map(memberships.map((item) => [String(item.studentId), item]));
  const pendingByStudentId = new Map(pendingRequests.map((item) => [String(item.studentId), item]));

  const searchFilter = { role: "student", isActive: true };
  if (query) {
    searchFilter.$or = [
      { fullName: { $regex: query, $options: "i" } },
      { email: { $regex: query, $options: "i" } },
    ];
  }
  const users = await User.find(searchFilter, { fullName: 1, email: 1 })
    .sort({ fullName: 1 })
    .limit(40)
    .lean();
  const userIds = users.map((user) => String(user._id));
  const activeMemberships = userIds.length
    ? await ClassMembership.find({ studentId: { $in: userIds }, status: "active" }).lean()
    : [];
  const activeClassIds = Array.from(new Set(activeMemberships.map((item) => String(item.classId || "")).filter(Boolean)));
  const activeClasses = activeClassIds.length
    ? await TeacherClass.find({ _id: { $in: activeClassIds }, status: "active" }, { name: 1 }).lean()
    : [];
  const activeClassById = new Map(activeClasses.map((item) => [String(item._id), item]));
  const activeMembershipByStudentId = new Map();
  activeMemberships.forEach((membership) => {
    if (!activeClassById.has(String(membership.classId || ""))) {
      return;
    }
    const studentId = String(membership.studentId || "");
    const existing = activeMembershipByStudentId.get(studentId);
    const isCurrentClass = String(membership.classId || "") === String(classDoc._id);
    if (!existing || isCurrentClass) {
      activeMembershipByStudentId.set(studentId, membership);
    }
  });

  const rows = users.map((user) => {
    const studentId = String(user._id);
    const membership = membershipByStudentId.get(studentId);
    const activeMembership = activeMembershipByStudentId.get(studentId);
    const activeClass = activeMembership ? activeClassById.get(String(activeMembership.classId || "")) : null;
    const isAssignedToAnotherClass = Boolean(
      activeMembership && String(activeMembership.classId || "") !== String(classDoc._id),
    );
    const pending = pendingByStudentId.get(studentId);
    return {
      studentId,
      fullName: String(user.fullName || ""),
      email: String(user.email || ""),
      inClass: Boolean(membership),
      classMembershipStatus: membership ? "active" : null,
      assignedClassId: activeMembership ? String(activeMembership.classId || "") : "",
      assignedClassName: activeClass ? String(activeClass.name || "") : "",
      assignedElsewhere: isAssignedToAnotherClass,
      pendingRequestId: pending ? String(pending._id) : "",
      pendingRequestStatus: pending ? "pending" : null,
      canInvite: !membership && !pending && !isAssignedToAnotherClass,
    };
  });

  return res.json({
    class: mapClassForClient(classDoc),
    inClass: rows.filter((item) => item.inClass),
    others: rows.filter((item) => !item.inClass),
  });
}

async function inviteStudentToTeacherClass(req, res) {
  const teacherId = String(req.auth?.userId || "");
  const classDoc = await assertTeacherClassOwnership({ teacherId, classId: req.params.classId });
  if (!classDoc) {
    return res.status(404).json({ message: "Class not found." });
  }

  const studentId = String(req.body?.studentId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return res.status(400).json({ message: "Valid studentId is required." });
  }
  const studentUser = await User.findOne({ _id: studentId, role: "student", isActive: true }, { _id: 1, fullName: 1, email: 1 }).lean();
  if (!studentUser) {
    return res.status(404).json({ message: "Student not found." });
  }

  const [{ membership: assignedMembership, classDoc: assignedClass }, activeMembership, pendingRequest] = await Promise.all([
    findActiveStudentClass(studentId),
    ClassMembership.findOne({
      classId: classDoc._id,
      teacherId,
      studentId,
      status: "active",
    }).lean(),
    ClassJoinRequest.findOne({
      classId: classDoc._id,
      teacherId,
      studentId,
      status: "pending",
    }).lean(),
  ]);

  if (assignedMembership && String(assignedMembership.classId || "") !== String(classDoc._id)) {
    return res.status(409).json({ message: buildAlreadyAssignedMessage(assignedClass) });
  }
  if (activeMembership) {
    return res.status(409).json({ message: "Student is already an active class member." });
  }
  if (pendingRequest) {
    return res.status(409).json({ message: "A pending join request already exists.", requestId: String(pendingRequest._id) });
  }

  const requestDoc = await ClassJoinRequest.create({
    classId: classDoc._id,
    teacherId,
    studentId,
    status: "pending",
  });

  const teacherUser = await User.findById(teacherId, { fullName: 1 }).lean();
  await Notification.create({
    recipientId: studentId,
    type: "class_join_request",
    title: "Class join request",
    message: `Teacher ${String(teacherUser?.fullName || "Teacher")} invited you to join ${classDoc.name}.`,
    data: {
      requestId: String(requestDoc._id),
      classId: String(classDoc._id),
      teacherId,
      className: classDoc.name,
      teacherName: String(teacherUser?.fullName || "Teacher"),
    },
    read: false,
  });

  return res.status(201).json({
    message: "Join request sent.",
    request: {
      _id: String(requestDoc._id),
      classId: String(classDoc._id),
      studentId,
      status: "pending",
      createdAt: requestDoc.createdAt || null,
    },
  });
}

async function removeStudentFromTeacherClass(req, res) {
  const teacherId = String(req.auth?.userId || "");
  const classDoc = await assertTeacherClassOwnership({ teacherId, classId: req.params.classId });
  if (!classDoc) {
    return res.status(404).json({ message: "Class not found." });
  }

  const studentId = String(req.params.studentId || "").trim();
  const membership = await ClassMembership.findOne({
    classId: classDoc._id,
    teacherId,
    studentId,
    status: "active",
  });
  if (!membership) {
    return res.status(404).json({ message: "Active class membership not found." });
  }

  membership.status = "removed";
  membership.removedAt = new Date();
  await membership.save();

  await Notification.create({
    recipientId: studentId,
    type: "class_membership_removed",
    title: "Removed from class",
    message: `You were removed from ${classDoc.name}.`,
    data: {
      classId: String(classDoc._id),
      teacherId,
      membershipId: String(membership._id),
    },
    read: false,
  });

  return res.json({ message: "Student removed from class." });
}

async function sendMessageToTeacherClass(req, res) {
  const teacherId = String(req.auth?.userId || "");
  const classDoc = await assertTeacherClassOwnership({ teacherId, classId: req.params.classId });
  if (!classDoc) {
    return res.status(404).json({ message: "Class not found." });
  }

  const messageText = normalizeText(req.body?.message, 500);
  if (!messageText) {
    return res.status(400).json({ message: "Message is required." });
  }

  const memberships = await ClassMembership.find({
    classId: classDoc._id,
    teacherId,
    status: "active",
  }).lean();
  const recipientIds = Array.from(new Set(
    memberships
      .map((item) => String(item.studentId || "").trim())
      .filter(Boolean),
  ));

  if (!recipientIds.length) {
    return res.status(400).json({ message: "No active students in this class." });
  }

  const teacherUser = await User.findById(teacherId, { fullName: 1 }).lean();
  const teacherName = String(teacherUser?.fullName || "Teacher");
  const title = `Message from ${teacherName}`;

  await Notification.insertMany(
    recipientIds.map((recipientId) => ({
      recipientId,
      type: "class_message",
      title,
      message: messageText,
      data: {
        classId: String(classDoc._id),
        className: String(classDoc.name || ""),
        teacherId,
        teacherName,
      },
      read: false,
    })),
  );

  return res.json({
    message: "Class message sent.",
    recipientsCount: recipientIds.length,
  });
}

async function getTeacherClassStudentProgress(req, res) {
  const teacherId = String(req.auth?.userId || "");
  const classId = String(req.params.classId || "");
  const studentId = String(req.params.studentId || "");
  const hasAccess = await isTeacherClassStudentActiveMember({ teacherId, classId, studentId });
  if (!hasAccess) {
    return res.status(403).json({ message: "Student is not an active member of this class." });
  }

  const progress = await StudentUnitProgress.find({ studentUserId: studentId })
    .sort({ unitOrder: 1, updatedAt: -1 })
    .lean();
  return res.json({ studentId, count: progress.length, units: progress });
}

async function getTeacherClassStudentAttempts(req, res) {
  const teacherId = String(req.auth?.userId || "");
  const classId = String(req.params.classId || "");
  const studentId = String(req.params.studentId || "");
  const hasAccess = await isTeacherClassStudentActiveMember({ teacherId, classId, studentId });
  if (!hasAccess) {
    return res.status(403).json({ message: "Student is not an active member of this class." });
  }

  const attempts = await StudentTaskAttempt.find({ studentUserId: studentId, status: "completed" })
    .sort({ submittedAt: -1, createdAt: -1 })
    .limit(120)
    .lean();
  return res.json({ studentId, count: attempts.length, attempts });
}

async function getTeacherClassStudentAnalytics(req, res) {
  const teacherId = String(req.auth?.userId || "");
  const classId = String(req.params.classId || "");
  const studentId = String(req.params.studentId || "");
  const hasAccess = await isTeacherClassStudentActiveMember({ teacherId, classId, studentId });
  if (!hasAccess) {
    return res.status(403).json({ message: "Student is not an active member of this class." });
  }

  const studentUser = await User.findById(studentId, { email: 1 }).lean();
  if (!studentUser?.email) {
    return res.status(404).json({ message: "Student not found." });
  }
  const studentEmail = String(studentUser.email || "").toLowerCase().trim();
  const analytics = await StudentAnalytics.findOne({ studentId: studentEmail }).lean();
  return res.json({ studentId, analytics: analytics || null });
}

async function listMyNotifications(req, res) {
  const recipientId = String(req.auth?.userId || "");
  const notifications = await Notification.find({ recipientId })
    .sort({ createdAt: -1 })
    .limit(40)
    .lean();
  return res.json({
    notifications: notifications.map((item) => ({
      _id: String(item._id),
      recipientId: String(item.recipientId || ""),
      type: String(item.type || ""),
      title: String(item.title || ""),
      message: String(item.message || ""),
      data: item.data || {},
      read: Boolean(item.read),
      createdAt: item.createdAt || null,
      handledAt: item.handledAt || null,
    })),
  });
}

async function markNotificationRead(req, res) {
  const recipientId = String(req.auth?.userId || "");
  const notificationId = toObjectId(req.params.notificationId);
  if (!notificationId) {
    return res.status(400).json({ message: "Invalid notification id." });
  }
  const updated = await Notification.findOneAndUpdate(
    { _id: notificationId, recipientId },
    { $set: { read: true } },
    { new: true },
  ).lean();
  if (!updated) {
    return res.status(404).json({ message: "Notification not found." });
  }
  return res.json({ message: "Notification marked as read." });
}

async function respondToClassJoinRequest(req, res) {
  const studentId = String(req.auth?.userId || "");
  const requestId = toObjectId(req.params.requestId);
  if (!requestId) {
    return res.status(400).json({ message: "Invalid request id." });
  }
  const action = String(req.body?.action || "").toLowerCase();
  if (!["accept", "reject"].includes(action)) {
    return res.status(400).json({ message: "Action must be accept or reject." });
  }

  const requestDoc = await ClassJoinRequest.findOne({ _id: requestId, studentId }).lean();
  if (!requestDoc) {
    return res.status(404).json({ message: "Join request not found." });
  }
  if (requestDoc.status !== "pending") {
    return res.status(400).json({ message: "Join request is no longer pending." });
  }

  const classDoc = await TeacherClass.findOne({
    _id: requestDoc.classId,
    teacherId: requestDoc.teacherId,
    status: "active",
  }).lean();
  if (!classDoc) {
    await ClassJoinRequest.updateOne(
      { _id: requestDoc._id },
      { $set: { status: "expired", respondedAt: new Date() } },
    );
    return res.status(400).json({ message: "Class is no longer active." });
  }

  const now = new Date();
  if (action === "reject") {
    await ClassJoinRequest.updateOne(
      { _id: requestDoc._id },
      { $set: { status: "rejected", respondedAt: now } },
    );
    await Notification.updateMany(
      { recipientId: studentId, "data.requestId": String(requestDoc._id) },
      { $set: { read: true, handledAt: now } },
    );
    return res.json({ message: "Join request rejected." });
  }

  const { membership: assignedMembership, classDoc: assignedClass } = await findActiveStudentClass(studentId);
  if (assignedMembership && String(assignedMembership.classId || "") !== String(requestDoc.classId || "")) {
    await ClassJoinRequest.updateOne(
      { _id: requestDoc._id },
      { $set: { status: "expired", respondedAt: now } },
    );
    await Notification.updateMany(
      { recipientId: studentId, "data.requestId": String(requestDoc._id) },
      { $set: { read: true, handledAt: now } },
    );
    return res.status(409).json({ message: buildAlreadyAssignedMessage(assignedClass) });
  }

  await ClassMembership.findOneAndUpdate(
    { classId: requestDoc.classId, teacherId: requestDoc.teacherId, studentId },
    {
      $set: { status: "active", removedAt: null, joinedAt: now },
      $setOnInsert: { classId: requestDoc.classId, teacherId: requestDoc.teacherId, studentId },
    },
    { upsert: true, new: true },
  );
  await ClassJoinRequest.updateOne(
    { _id: requestDoc._id },
    { $set: { status: "accepted", respondedAt: now } },
  );
  const otherPendingRequests = await ClassJoinRequest.find(
    { _id: { $ne: requestDoc._id }, studentId, status: "pending" },
    { _id: 1 },
  ).lean();
  const otherPendingRequestIds = otherPendingRequests.map((item) => String(item._id));
  if (otherPendingRequestIds.length) {
    await ClassJoinRequest.updateMany(
      { _id: { $in: otherPendingRequestIds } },
      { $set: { status: "expired", respondedAt: now } },
    );
    await Notification.updateMany(
      { recipientId: studentId, "data.requestId": { $in: otherPendingRequestIds } },
      { $set: { read: true, handledAt: now } },
    );
  }
  await Notification.updateMany(
    { recipientId: studentId, "data.requestId": String(requestDoc._id) },
    { $set: { read: true, handledAt: now } },
  );
  return res.json({ message: "Joined class successfully." });
}

async function listMyClassMemberships(req, res) {
  const studentId = String(req.auth?.userId || "");
  const memberships = await ClassMembership.find({ studentId, status: "active" })
    .sort({ joinedAt: -1, createdAt: -1 })
    .lean();
  const classIds = memberships.map((item) => item.classId);
  const classes = classIds.length
    ? await TeacherClass.find({ _id: { $in: classIds } }, { name: 1, status: 1, teacherId: 1 }).lean()
    : [];
  const classById = new Map(classes.map((item) => [String(item._id), item]));
  return res.json({
    memberships: memberships.map((item) => {
      const cls = classById.get(String(item.classId)) || {};
      return {
        membershipId: String(item._id),
        classId: String(item.classId),
        className: String(cls?.name || ""),
        teacherId: String(item.teacherId || ""),
        status: String(item.status || ""),
        joinedAt: item.joinedAt || item.createdAt || null,
      };
    }),
  });
}

async function leaveMyClass(req, res) {
  const studentId = String(req.auth?.userId || "");
  const classId = toObjectId(req.params.classId);
  if (!classId) {
    return res.status(400).json({ message: "Invalid class id." });
  }
  const leaveReason = normalizeText(req.body?.reason, 400);
  const typedClassName = normalizeText(req.body?.className, 120);
  const membership = await ClassMembership.findOne({ classId, studentId, status: "active" });
  if (!membership) {
    return res.status(404).json({ message: "Active membership not found." });
  }
  const classDoc = await TeacherClass.findById(classId, { name: 1, teacherId: 1 }).lean();
  if (!classDoc) {
    return res.status(404).json({ message: "Class not found." });
  }
  if (!leaveReason || leaveReason.length < 3) {
    return res.status(400).json({ message: "Please provide a reason for leaving." });
  }
  if (
    !typedClassName
    || typedClassName.toLowerCase() !== String(classDoc.name || "").trim().toLowerCase()
  ) {
    return res.status(400).json({ message: "Class name confirmation does not match." });
  }

  membership.status = "left";
  membership.removedAt = new Date();
  await membership.save();

  const studentUser = await User.findById(studentId, { fullName: 1, email: 1 }).lean();
  await Notification.create({
    recipientId: String(membership.teacherId || classDoc.teacherId || ""),
    type: "student_left_class",
    title: "Student left class",
    message: `${String(studentUser?.fullName || "A student")} left ${String(classDoc.name || "your class")}. Reason: ${leaveReason}`,
    data: {
      classId: String(classId),
      className: String(classDoc.name || ""),
      studentId,
      studentName: String(studentUser?.fullName || ""),
      studentEmail: String(studentUser?.email || ""),
      reason: leaveReason,
    },
    read: false,
  });

  return res.json({ message: "You left the class." });
}

async function listTeacherNotifications(req, res) {
  const recipientId = String(req.auth?.userId || "");
  const notifications = await Notification.find({ recipientId })
    .sort({ createdAt: -1 })
    .limit(40)
    .lean();
  return res.json({
    notifications: notifications.map((item) => ({
      _id: String(item._id),
      recipientId: String(item.recipientId || ""),
      type: String(item.type || ""),
      title: String(item.title || ""),
      message: String(item.message || ""),
      data: item.data || {},
      read: Boolean(item.read),
      createdAt: item.createdAt || null,
      handledAt: item.handledAt || null,
    })),
  });
}

async function markTeacherNotificationRead(req, res) {
  const recipientId = String(req.auth?.userId || "");
  const notificationId = toObjectId(req.params.notificationId);
  if (!notificationId) {
    return res.status(400).json({ message: "Invalid notification id." });
  }
  const updated = await Notification.findOneAndUpdate(
    { _id: notificationId, recipientId },
    { $set: { read: true } },
    { new: true },
  ).lean();
  if (!updated) {
    return res.status(404).json({ message: "Notification not found." });
  }
  return res.json({ message: "Notification marked as read." });
}

async function updateTeacherAccountPassword(req, res) {
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");
  const confirmNewPassword = String(req.body?.confirmNewPassword || "");

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return res.status(400).json({
      message: "Current password, new password, and confirmation are required.",
    });
  }

  if (!PASSWORD_REGEX.test(newPassword)) {
    return res.status(400).json({
      message: "Password must be at least 8 characters and include at least one letter and one number.",
    });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({
      message: "New password confirmation does not match.",
    });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({
      message: "New password must be different from current password.",
    });
  }

  const user = await User.findById(req.auth.userId).select("+password");
  if (!user || user.role !== "teacher" || !user.isActive) {
    return res.status(403).json({
      message: "Only teachers can update password here.",
    });
  }

  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      message: "Current password is incorrect.",
    });
  }

  user.password = newPassword;
  await user.save();

  return res.json({
    message: "Password updated successfully.",
  });
}

async function getMyTeacherProfile(req, res) {
  const user = await User.findById(req.auth.userId).lean();
  if (!user || user.role !== "teacher" || !user.isActive) {
    return res.status(403).json({
      message: "Only teachers can access this profile endpoint.",
    });
  }

  return res.json({
    profile: buildTeacherProfileResponse(user),
  });
}

async function updateMyTeacherProfile(req, res) {
  const body = req.body || {};
  const hasFullName = Object.prototype.hasOwnProperty.call(body, "fullName");
  const hasEmail = Object.prototype.hasOwnProperty.call(body, "email");

  if (!hasFullName && !hasEmail) {
    return res.status(400).json({
      message: "Provide a name or email to update.",
    });
  }

  const user = await User.findById(req.auth.userId);
  if (!user || user.role !== "teacher" || !user.isActive) {
    return res.status(403).json({
      message: "Only teachers can update this profile endpoint.",
    });
  }

  const nextFullName = hasFullName ? normalizeText(body.fullName, 80) : undefined;
  if (hasFullName && nextFullName.length < 2) {
    return res.status(400).json({
      message: "Name must be at least 2 characters.",
    });
  }

  const previousEmail = String(user.email || "").trim().toLowerCase();
  const nextEmail = hasEmail ? String(body.email || "").trim().toLowerCase() : undefined;
  if (hasEmail && !EMAIL_REGEX.test(nextEmail)) {
    return res.status(400).json({
      message: "Please provide a valid email address.",
    });
  }

  if (hasEmail && nextEmail !== previousEmail) {
    const existingUser = await User.findOne({
      email: nextEmail,
      _id: { $ne: user._id },
    })
      .select("_id")
      .lean();

    if (existingUser) {
      return res.status(409).json({
        message: "This email is already registered.",
      });
    }
  }

  let changed = false;
  if (hasFullName && normalizeText(user.fullName, 80) !== nextFullName) {
    user.fullName = nextFullName;
    changed = true;
  }
  if (hasEmail && previousEmail !== nextEmail) {
    user.email = nextEmail;
    changed = true;
  }

  if (changed) {
    await user.save();
  }

  const refreshedUser = await User.findById(user._id).lean();
  return res.json({
    message: "Account details updated.",
    profile: buildTeacherProfileResponse(refreshedUser),
  });
}

async function getTeacherClassOverview(req, res) {
  const teacherId = String(req.auth?.userId || "");
  const classDoc = await assertTeacherClassOwnership({ teacherId, classId: req.params.classId });
  if (!classDoc) {
    return res.status(404).json({ message: "Class not found." });
  }
  const memberships = await ClassMembership.find({ classId: classDoc._id, status: "active" }).lean();
  const studentIds = memberships.map((item) => item.studentId);
  if (studentIds.length === 0) {
    return res.json({ class: mapClassForClient(classDoc), students: [], summary: { totalStudents: 0 } });
  }
  const [users, attempts] = await Promise.all([
    User.find({ _id: { $in: studentIds }, role: "student" }, { fullName: 1, email: 1 }).lean(),
    StudentTaskAttempt.aggregate([
      { $match: { studentUserId: { $in: studentIds }, status: "completed" } },
      { $sort: { submittedAt: -1 } },
      {
        $group: {
          _id: "$studentUserId",
          latestBand: { $first: "$score.band" },
          latestScorePercent: { $first: "$score.percentage" },
          latestSubmittedAt: { $first: "$submittedAt" },
          attemptsCount: { $sum: 1 },
        },
      },
    ]),
  ]);
  const attemptByStudentId = new Map(attempts.map((item) => [String(item._id), item]));
  const rows = users.map((user) => {
    const metrics = attemptByStudentId.get(String(user._id)) || {};
    return {
      studentId: String(user._id),
      fullName: String(user.fullName || ""),
      email: String(user.email || ""),
      latestBand: Number.isFinite(Number(metrics.latestBand)) ? Number(metrics.latestBand) : null,
      latestScorePercent: Number.isFinite(Number(metrics.latestScorePercent)) ? Number(metrics.latestScorePercent) : null,
      attemptsCount: Number(metrics.attemptsCount || 0),
      latestSubmittedAt: metrics.latestSubmittedAt || null,
    };
  });
  return res.json({
    class: mapClassForClient(classDoc),
    students: rows,
    summary: { totalStudents: rows.length },
  });
}

async function getTeacherClassHomeworkUnits(req, res) {
  const teacherId = String(req.auth?.userId || "");
  const classDoc = await assertTeacherClassOwnership({ teacherId, classId: req.params.classId });
  if (!classDoc) {
    return res.status(404).json({ message: "Class not found." });
  }

  const memberships = await ClassMembership.find({ classId: classDoc._id, status: "active" }).lean();
  const studentIds = memberships.map((item) => String(item.studentId || ""));
  const students = studentIds.length
    ? await User.find({ _id: { $in: studentIds }, role: "student" }, { fullName: 1, email: 1 }).lean()
    : [];

  const payload = await fetchTeacherClassHomeworkOverview({ classDoc, students });
  return res.json(payload);
}

async function getTeacherClassUnitHomework(req, res) {
  const teacherId = String(req.auth?.userId || "");
  const classDoc = await assertTeacherClassOwnership({ teacherId, classId: req.params.classId });
  if (!classDoc) {
    return res.status(404).json({ message: "Class not found." });
  }

  const memberships = await ClassMembership.find({ classId: classDoc._id, status: "active" }).lean();
  const studentIds = memberships.map((item) => String(item.studentId || ""));
  const students = studentIds.length
    ? await User.find({ _id: { $in: studentIds }, role: "student" }, { fullName: 1, email: 1 }).lean()
    : [];

  const payload = await fetchTeacherClassHomeworkOverview({
    classDoc,
    students,
    selectedUnitId: String(req.params.unitId || ""),
  });
  return res.json(payload);
}

module.exports = {
  listTeacherClasses,
  createTeacherClass,
  getTeacherClassDetails,
  updateTeacherClass,
  deleteTeacherClass,
  getTeacherClassOverview,
  listTeacherClassStudents,
  searchStudentsForTeacherClass,
  inviteStudentToTeacherClass,
  removeStudentFromTeacherClass,
  sendMessageToTeacherClass,
  getTeacherClassStudentProgress,
  getTeacherClassStudentAttempts,
  getTeacherClassStudentAnalytics,
  getTeacherClassHomeworkUnits,
  getTeacherClassUnitHomework,
  listMyNotifications,
  markNotificationRead,
  respondToClassJoinRequest,
  listMyClassMemberships,
  leaveMyClass,
  listTeacherNotifications,
  markTeacherNotificationRead,
  getMyTeacherProfile,
  updateMyTeacherProfile,
  updateTeacherAccountPassword,
};
