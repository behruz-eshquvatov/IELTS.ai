const mongoose = require("mongoose");
const { DAILY_TASK_TYPES } = require("./dailyTaskUnitModel");
const ATTEMPT_CATEGORIES = ["daily", "additional"];

const scoreSchema = new mongoose.Schema(
  {
    band: { type: Number, default: null, min: 0, max: 9 },
    percentage: { type: Number, default: null, min: 0, max: 100 },
    correctCount: { type: Number, default: null, min: 0 },
    incorrectCount: { type: Number, default: null, min: 0 },
    totalQuestions: { type: Number, default: null, min: 0 },
  },
  { _id: false },
);

const sourceRefsSchema = new mongoose.Schema(
  {
    readingFullTestAttemptId: { type: String, default: "", trim: true },
    writingTask1AnalysisId: { type: String, default: "", trim: true },
    writingTask2AnalysisId: { type: String, default: "", trim: true },
    listeningBlockAttemptIds: { type: [String], default: [] },
  },
  { _id: false },
);

const unitBreakdownItemSchema = new mongoose.Schema(
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
    band: { type: Number, default: null, min: 0, max: 9 },
    percentage: { type: Number, default: null, min: 0, max: 100 },
  },
  { _id: false },
);

const studentTaskAttemptSchema = new mongoose.Schema(
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
    attemptCategory: {
      type: String,
      required: true,
      enum: ATTEMPT_CATEGORIES,
      default: "additional",
      index: true,
      trim: true,
    },
    sourceType: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    status: {
      type: String,
      default: "completed",
      trim: true,
      index: true,
    },
    unitId: {
      type: String,
      default: "",
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
    },
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
    taskLabel: {
      type: String,
      default: "",
      trim: true,
    },
    unitTaskOrder: {
      type: Number,
      default: null,
      min: 1,
    },
    unitTaskRef: {
      type: String,
      default: "",
      trim: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    submitReason: {
      type: String,
      default: "manual",
      trim: true,
    },
    forceReason: {
      type: String,
      default: "",
      trim: true,
    },
    isAutoSubmitted: {
      type: Boolean,
      default: false,
      index: true,
    },
    totalTimeSpentSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    score: {
      type: scoreSchema,
      default: () => ({}),
    },
    unitBreakdown: {
      type: [unitBreakdownItemSchema],
      default: [],
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sourceRefs: {
      type: sourceRefsSchema,
      default: () => ({}),
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "student_task_attempts",
  },
);

studentTaskAttemptSchema.index(
  { studentUserId: 1, attemptCategory: 1, taskType: 1, taskRefId: 1, submittedAt: -1, attemptNumber: -1 },
  { name: "student_task_latest_lookup" },
);

studentTaskAttemptSchema.index(
  { studentUserId: 1, unitId: 1, submittedAt: -1 },
  { name: "student_unit_attempt_lookup" },
);

module.exports = mongoose.model("StudentTaskAttempt", studentTaskAttemptSchema);
