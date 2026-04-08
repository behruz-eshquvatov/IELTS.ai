const mongoose = require("mongoose");

const detectionSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      default: "",
    },
    line: {
      type: String,
      trim: true,
      default: "",
    },
    issue: {
      type: String,
      trim: true,
      default: "",
    },
    fix: {
      type: String,
      trim: true,
      default: "",
    },
    wrongText: {
      type: String,
      trim: true,
      default: "",
    },
    correctedText: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false },
);

const writingTask2AnalysisSchema = new mongoose.Schema(
  {
    setId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    source: {
      type: String,
      enum: ["manual", "auto", "focus-lost"],
      default: "manual",
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    questionMeta: {
      type: [String],
      default: [],
    },
    essayText: {
      type: String,
      required: true,
      trim: true,
    },
    wordsCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    durationSeconds: {
      type: Number,
      min: 0,
      default: 0,
    },
    remainingSecondsAtSubmit: {
      type: Number,
      min: 0,
      default: 0,
    },
    timeSpentSeconds: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
      index: true,
    },
    aiModel: {
      type: String,
      trim: true,
      default: "",
    },
    overallBand: {
      type: Number,
      min: 0,
      max: 9,
      default: null,
    },
    criteriaScores: {
      taskResponse: { type: Number, min: 0, max: 9, default: null },
      coherenceCohesion: { type: Number, min: 0, max: 9, default: null },
      lexicalResource: { type: Number, min: 0, max: 9, default: null },
      grammaticalRangeAccuracy: { type: Number, min: 0, max: 9, default: null },
    },
    summary: {
      type: String,
      trim: true,
      default: "",
    },
    strengths: {
      type: [String],
      default: [],
    },
    weaknesses: {
      type: [String],
      default: [],
    },
    detections: {
      type: [detectionSchema],
      default: [],
    },
    failureReason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    collection: "writing_task2_analyses",
  },
);

module.exports = mongoose.model("WritingTask2Analysis", writingTask2AnalysisSchema);
