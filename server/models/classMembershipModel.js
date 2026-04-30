const mongoose = require("mongoose");

const CLASS_MEMBERSHIP_STATUSES = ["active", "removed", "left"];

const classMembershipSchema = new mongoose.Schema(
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
      enum: CLASS_MEMBERSHIP_STATUSES,
      default: "active",
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    removedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, collection: "class_memberships" },
);

classMembershipSchema.index(
  { classId: 1, studentId: 1 },
  { unique: true, name: "class_student_membership_unique" },
);

module.exports = {
  ClassMembership: mongoose.model("ClassMembership", classMembershipSchema),
  CLASS_MEMBERSHIP_STATUSES,
};
