const mongoose = require("mongoose");
const { DAILY_TASK_TYPES } = require("./dailyTaskUnitModel");

const completedTaskSchema = new mongoose.Schema(
  {
    taskType: {
      type: String,
      required: true,
      trim: true,
      enum: DAILY_TASK_TYPES,
      index: true,
    },
    taskRefId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    completedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { _id: false },
);

const studentDailyTaskProgressSchema = new mongoose.Schema(
  {
    studentUserId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    completedTasks: {
      type: [completedTaskSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "student_daily_task_progress",
  },
);

studentDailyTaskProgressSchema.pre("validate", function normalizeProgress() {
  const rawTasks = Array.isArray(this.completedTasks) ? this.completedTasks : [];
  const dedupedByKey = new Map();

  rawTasks.forEach((task) => {
    const taskType = String(task?.taskType || "").trim().toLowerCase();
    const taskRefId = String(task?.taskRefId || "").trim();
    const completedAtRaw = task?.completedAt ? new Date(task.completedAt) : new Date();
    const completedAt = Number.isNaN(completedAtRaw.valueOf()) ? new Date() : completedAtRaw;

    if (!taskType || !taskRefId) {
      return;
    }

    const key = `${taskType}::${taskRefId}`;
    const existing = dedupedByKey.get(key);
    if (!existing || completedAt > existing.completedAt) {
      dedupedByKey.set(key, {
        taskType,
        taskRefId,
        completedAt,
      });
    }
  });

  this.completedTasks = Array.from(dedupedByKey.values());
});

module.exports = mongoose.model("StudentDailyTaskProgress", studentDailyTaskProgressSchema);
