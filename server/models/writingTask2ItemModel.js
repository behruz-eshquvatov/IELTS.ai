const mongoose = require("mongoose");

const WRITING_TASK2_ESSAY_TYPES = [
  "opinion",
  "discussion",
  "advantages_disadvantages",
  "problem_solution",
  "direct_question",
  "two_part_question",
  "unknown",
];
const WRITING_TASK2_STATUSES = ["draft", "published"];

const writingTask2InstructionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    minWords: {
      type: Number,
      required: true,
      default: 250,
      min: 1,
    },
  },
  { _id: false },
);

const writingTask2ItemSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      required: true,
      trim: true,
      enum: ["writing"],
      default: "writing",
      index: true,
    },
    taskType: {
      type: String,
      required: true,
      trim: true,
      enum: ["task2"],
      default: "task2",
      index: true,
    },
    essayType: {
      type: String,
      required: true,
      trim: true,
      enum: WRITING_TASK2_ESSAY_TYPES,
      index: true,
    },
    questionTopic: {
      type: String,
      required: true,
      trim: true,
    },
    instruction: {
      type: writingTask2InstructionSchema,
      required: true,
    },
    source: {
      type: String,
      default: "",
      trim: true,
    },
    difficulty: {
      type: String,
      default: "",
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      required: true,
      trim: true,
      enum: WRITING_TASK2_STATUSES,
      default: "draft",
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "writing_task2_items",
  },
);

module.exports = mongoose.model("WritingTask2Item", writingTask2ItemSchema);

