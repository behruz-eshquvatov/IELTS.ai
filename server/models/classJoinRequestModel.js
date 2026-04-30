const mongoose = require("mongoose");

const CLASS_JOIN_REQUEST_STATUSES = ["pending", "accepted", "rejected", "cancelled", "expired"];

const classJoinRequestSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeacherClass",
      required: true,
      index: true,
    },
    teacherId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    studentId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: CLASS_JOIN_REQUEST_STATUSES,
      default: "pending",
      index: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, collection: "class_join_requests" },
);

classJoinRequestSchema.index(
  { classId: 1, studentId: 1, status: 1 },
  { name: "class_join_request_lookup" },
);

module.exports = {
  ClassJoinRequest: mongoose.model("ClassJoinRequest", classJoinRequestSchema),
  CLASS_JOIN_REQUEST_STATUSES,
};
