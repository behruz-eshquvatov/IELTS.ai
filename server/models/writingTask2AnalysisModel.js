const mongoose = require("mongoose");

const detectionSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      trim: true,
      default: "",
    },
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
    whyItHurtsBand: {
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
    studentUserId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    studentEmail: {
      type: String,
      trim: true,
      default: "",
      lowercase: true,
      index: true,
    },
    taskType: {
      type: String,
      trim: true,
      default: "writing_task2",
      index: true,
    },
    taskRefId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    taskLabel: {
      type: String,
      trim: true,
      default: "",
    },
    setId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    source: {
      type: String,
      enum: ["manual", "auto", "focus-lost", "page-hide", "leave-page", "before-unload"],
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
    questionTopic: {
      type: String,
      trim: true,
      default: "",
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
    criteriaFeedback: {
      taskResponse: { type: String, trim: true, default: "" },
      coherenceCohesion: { type: String, trim: true, default: "" },
      lexicalResource: { type: String, trim: true, default: "" },
      grammaticalRangeAccuracy: { type: String, trim: true, default: "" },
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
    suggestions: {
      type: [String],
      default: [],
    },
    diagnosis: {
      taskIssues: { type: [String], default: [] },
      coherenceIssues: { type: [String], default: [] },
      lexicalIssues: { type: [String], default: [] },
      grammarIssues: { type: [String], default: [] },
    },
    detections: {
      type: [detectionSchema],
      default: [],
    },
    rawAiPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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

writingTask2AnalysisSchema.index(
  { studentUserId: 1, taskRefId: 1, submittedAt: -1 },
  { name: "student_writing_task2_analyses_lookup" },
);

module.exports = mongoose.model("WritingTask2Analysis", writingTask2AnalysisSchema);
