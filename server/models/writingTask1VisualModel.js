const mongoose = require("mongoose");

const writingTask1VisualSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
      trim: true,
    },
    originalFileName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
      default: "image/png",
    },
    fileSizeBytes: {
      type: Number,
      required: true,
      min: 1,
    },
    imageData: {
      type: Buffer,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "writing_task1_visuals",
  },
);

module.exports = mongoose.model("WritingTask1Visual", writingTask1VisualSchema);
