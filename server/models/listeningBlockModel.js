const mongoose = require("mongoose");

const instructionSchema = new mongoose.Schema(
  {
    text: { type: String, default: "" },
    maxWords: { type: Number, default: null },
  },
  { _id: false },
);

const displaySchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    elements: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { _id: false },
);

const questionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    number: { type: Number, required: true },
    answer: { type: [String], default: [] },
  },
  { _id: false },
);

const listeningBlockSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
      trim: true,
    },
    blockType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    questionFamily: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    instruction: {
      type: instructionSchema,
      default: {},
    },
    display: {
      type: displaySchema,
      default: {},
    },
    questions: {
      type: [questionSchema],
      default: [],
    },
  },
  {
    versionKey: false,
    collection: "listening_blocks",
  },
);

module.exports = mongoose.model("ListeningBlock", listeningBlockSchema);
