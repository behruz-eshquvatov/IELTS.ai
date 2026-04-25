const mongoose = require("mongoose");
const { DAILY_TASK_TYPES } = require("./dailyTaskUnitModel");

const progressTaskRefSchema = new mongoose.Schema(
  {
    taskType: {
      type: String,
      required: true,
      trim: true,
      enum: DAILY_TASK_TYPES,
    },
    taskRefId: {
      type: String,
      required: true,
      trim: true,
    },
    latestAttemptId: {
      type: String,
      default: "",
      trim: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const unitAttemptHistorySchema = new mongoose.Schema(
  {
    attemptNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    submittedAt: {
      type: Date,
      required: true,
      index: true,
    },
    band: {
      type: Number,
      default: null,
      min: 0,
      max: 9,
    },
    scorePercent: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    totalTimeSpentSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    breakdownLabel: {
      type: String,
      default: "",
      trim: true,
    },
    taskAttemptIds: {
      type: [String],
      default: [],
    },
  },
  { _id: false },
);

const studentUnitProgressSchema = new mongoose.Schema(
  {
    studentUserId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    studentEmail: {
      type: String,
      required: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    unitId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    unitTitle: {
      type: String,
      default: "",
      trim: true,
    },
    unitOrder: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    calendarDayIndex: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    calendarEligible: {
      type: Boolean,
      default: false,
      index: true,
    },
    calendarAvailableAt: {
      type: Date,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["locked", "available", "completed"],
      default: "locked",
      index: true,
    },
    latestBand: {
      type: Number,
      default: null,
      min: 0,
      max: 9,
    },
    latestScorePercent: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    latestTimeSpentSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    attemptsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedTaskRefs: {
      type: [progressTaskRefSchema],
      default: [],
    },
    attempts: {
      type: [unitAttemptHistorySchema],
      default: [],
    },
    completedAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "student_unit_progress",
  },
);

studentUnitProgressSchema.index(
  { studentUserId: 1, unitId: 1 },
  { unique: true, name: "student_unit_progress_unique" },
);

module.exports = mongoose.model("StudentUnitProgress", studentUnitProgressSchema);
