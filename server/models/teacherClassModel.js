const mongoose = require("mongoose");

const TEACHER_CLASS_STATUSES = ["active", "inactive"];

const teacherClassSchema = new mongoose.Schema(
  {
    teacherId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 400,
    },
    startTime: {
      type: String,
      default: "",
      trim: true,
      maxlength: 20,
    },
    status: {
      type: String,
      enum: TEACHER_CLASS_STATUSES,
      default: "active",
      index: true,
    },
  },
  { timestamps: true, collection: "classes" },
);

teacherClassSchema.index({ teacherId: 1, updatedAt: -1 });

module.exports = {
  TeacherClass: mongoose.model("TeacherClass", teacherClassSchema),
  TEACHER_CLASS_STATUSES,
};
