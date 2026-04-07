const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    taskId: { type: String, required: true },
    label: { type: String, required: true },
    kind: { type: String, default: "" },
    to: { type: String, default: "" },
    status: {
      type: String,
      enum: ["completed", "pending", "locked"],
      default: "pending",
    },
  },
  { _id: false },
);

const attemptSchema = new mongoose.Schema(
  {
    attemptId: { type: String, required: true },
    label: { type: String, required: true },
    band: { type: String, required: true },
    time: { type: String, required: true },
    date: { type: String, required: true },
    breakdown: { type: String, required: true },
  },
  { _id: false },
);

const unitSchema = new mongoose.Schema(
  {
    unitId: { type: String, required: true },
    unit: { type: String, required: true },
    status: {
      type: String,
      enum: ["completed", "today", "locked"],
      required: true,
    },
    summary: { type: String, default: "" },
    band: { type: String, default: "" },
    timeSpent: { type: String, default: "" },
    estTime: { type: String, default: "" },
    tasksCount: { type: Number },
    lockHint: { type: String, default: "" },
    tasks: { type: [taskSchema], default: [] },
    attempts: { type: [attemptSchema], default: [] },
  },
  { _id: false },
);

const studentDailyTasksSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    units: { type: [unitSchema], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model("StudentDailyTasks", studentDailyTasksSchema);
