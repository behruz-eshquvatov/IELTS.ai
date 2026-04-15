const mongoose = require("mongoose");

const answerItemSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true, trim: true },
    questionNumber: { type: Number, default: null },
    value: { type: String, default: "" },
  },
  { _id: false },
);

const resultItemSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true, trim: true },
    questionNumber: { type: Number, default: null },
    studentAnswer: { type: String, default: "" },
    acceptedAnswers: { type: [String], default: [] },
    isCorrect: { type: Boolean, default: false },
  },
  { _id: false },
);

const evaluationSchema = new mongoose.Schema(
  {
    correctCount: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    incorrectQuestionNumbers: { type: [Number], default: [] },
    results: { type: [resultItemSchema], default: [] },
  },
  { _id: false },
);

const listeningAttemptSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    blockId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    questionFamily: {
      type: String,
      default: "",
      trim: true,
    },
    blockType: {
      type: String,
      default: "",
      trim: true,
    },
    displayTitle: {
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
      default: "audio-ended",
      trim: true,
    },
    attemptNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    answers: {
      type: [answerItemSchema],
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
    collection: "listening_attempts",
  },
);

listeningAttemptSchema.index({ studentId: 1, blockId: 1, submittedAt: -1 });

module.exports = mongoose.model("ListeningAttempt", listeningAttemptSchema);
