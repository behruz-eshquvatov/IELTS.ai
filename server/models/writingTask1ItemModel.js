const mongoose = require("mongoose");

const WRITING_TASK1_VISUAL_TYPES = [
  "line_chart",
  "bar_chart",
  "pie_chart",
  "table",
  "process_diagram",
  "map",
  "mixed_visual",
];
const WRITING_TASK1_STATUSES = ["draft", "published"];

const writingTask1VisualAssetSchema = new mongoose.Schema(
  {
    imageId: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

const writingTask1ItemSchema = new mongoose.Schema(
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
      enum: ["task1"],
      default: "task1",
      index: true,
    },
    visualType: {
      type: String,
      required: true,
      trim: true,
      enum: WRITING_TASK1_VISUAL_TYPES,
      index: true,
    },
    questionTopic: {
      type: String,
      required: true,
      trim: true,
    },
    visualAsset: {
      type: writingTask1VisualAssetSchema,
      required: true,
    },
    title: {
      type: String,
      default: "",
      trim: true,
    },
    source: {
      type: String,
      default: "",
      trim: true,
    },
    provider: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      required: true,
      trim: true,
      enum: WRITING_TASK1_STATUSES,
      default: "draft",
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "writing_task1_items",
  },
);

module.exports = mongoose.model("WritingTask1Item", writingTask1ItemSchema);
