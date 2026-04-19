const mongoose = require("mongoose");

const passageTimingSchema = new mongoose.Schema(
  {
    passageNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false },
);

const incorrectItemSchema = new mongoose.Schema(
  {
    blockTitle: { type: String, default: "", trim: true },
    questionNumber: { type: Number, default: null },
    studentAnswer: { type: String, default: "", trim: true },
    acceptedAnswers: { type: [String], default: [] },
  },
  { _id: false },
);

const evaluationSchema = new mongoose.Schema(
  {
    totalQuestions: { type: Number, default: 0, min: 0 },
    correctCount: { type: Number, default: 0, min: 0 },
    incorrectCount: { type: Number, default: 0, min: 0 },
    percentage: { type: Number, default: 0, min: 0 },
    submitReason: { type: String, default: "manual", trim: true },
    forceReason: { type: String, default: "", trim: true },
    incorrectItems: { type: [incorrectItemSchema], default: [] },
  },
  { _id: false },
);

const readingFullTestAttemptSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    testId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    testTitle: {
      type: String,
      default: "",
      trim: true,
    },
    testModule: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["completed"],
      default: "completed",
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
    attemptNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    passageTiming: {
      type: [passageTimingSchema],
      default: [],
    },
    evaluation: {
      type: evaluationSchema,
      default: {},
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "reading_full_test_attempts",
  },
);

readingFullTestAttemptSchema.index({ studentId: 1, testId: 1, submittedAt: -1 });

module.exports = mongoose.model("ReadingFullTestAttempt", readingFullTestAttemptSchema);
