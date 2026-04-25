const mongoose = require("mongoose");

const DAILY_TASK_TYPES = ["reading", "listening", "writing_task1", "writing_task2"];
const DAILY_TASK_UNIT_STATUSES = ["draft", "published"];

function toPositiveOrder(value, fallback = 1) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

const dailyTaskUnitTaskSchema = new mongoose.Schema(
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
    order: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
  },
  { _id: false },
);

const dailyTaskUnitSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 140,
    },
    order: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
      index: true,
    },
    status: {
      type: String,
      required: true,
      trim: true,
      enum: DAILY_TASK_UNIT_STATUSES,
      default: "draft",
      index: true,
    },
    tasks: {
      type: [dailyTaskUnitTaskSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "daily_task_units",
  },
);

dailyTaskUnitSchema.pre("validate", function normalizeUnitPayload() {
  this.title = String(this.title || "").trim();
  this.order = toPositiveOrder(this.order, 1);

  const rawTasks = Array.isArray(this.tasks) ? this.tasks : [];
  const normalizedTasks = rawTasks
    .map((task, index) => ({
      taskType: String(task?.taskType || "").trim().toLowerCase(),
      taskRefId: String(task?.taskRefId || "").trim(),
      order: toPositiveOrder(task?.order, index + 1),
    }))
    .filter((task) => Boolean(task.taskType) && Boolean(task.taskRefId))
    .sort((left, right) => Number(left.order || 0) - Number(right.order || 0))
    .map((task, index) => ({
      ...task,
      order: index + 1,
    }));

  this.tasks = normalizedTasks;

  if (normalizedTasks.length === 0) {
    this.invalidate("tasks", "At least one task is required.");
  }

  const duplicateKeys = new Set();
  normalizedTasks.forEach((task, taskIndex) => {
    const key = `${task.taskType}::${task.taskRefId}`;
    if (duplicateKeys.has(key)) {
      this.invalidate(
        `tasks.${taskIndex}.taskRefId`,
        `Duplicate task reference '${task.taskType}:${task.taskRefId}' is not allowed in one unit.`,
      );
    } else {
      duplicateKeys.add(key);
    }
  });

});

module.exports = {
  DailyTaskUnit: mongoose.model("DailyTaskUnit", dailyTaskUnitSchema),
  DAILY_TASK_TYPES,
  DAILY_TASK_UNIT_STATUSES,
};
