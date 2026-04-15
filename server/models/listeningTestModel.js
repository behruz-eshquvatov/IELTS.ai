const mongoose = require("mongoose");

const questionRangeSchema = new mongoose.Schema(
  {
    start: { type: Number, required: true },
    end: { type: Number, required: true },
  },
  { _id: false },
);

const partBlockSchema = new mongoose.Schema(
  {
    blockId: { type: String, required: true, trim: true },
    audioRef: { type: String, default: "", trim: true },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const partSchema = new mongoose.Schema(
  {
    partNumber: { type: Number, required: true },
    questionRange: { type: questionRangeSchema, required: true },
    blocks: { type: [partBlockSchema], default: [] },
  },
  { _id: false },
);

const listeningTestSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true },
    module: { type: String, default: "", trim: true },
    totalQuestions: { type: Number, default: 0 },
    status: { type: String, default: "draft", trim: true, index: true },
    parts: { type: [partSchema], default: [] },
  },
  {
    collection: "listening_tests",
    versionKey: false,
  },
);

module.exports = mongoose.model("ListeningTest", listeningTestSchema);
