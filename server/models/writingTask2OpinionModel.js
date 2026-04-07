const mongoose = require("mongoose");

const writingTask2OpinionSchema = new mongoose.Schema(
  {
    essayId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    prompt: {
      type: String,
      required: true,
      trim: true,
    },
    subText: {
      type: [String],
      default: [],
    },
    accessStatus: {
      type: String,
      enum: ["locked", "unlocked"],
      default: "locked",
      index: true,
    },
    unlockOrder: {
      type: Number,
      required: true,
      min: 1,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "writing_task2_opinions",
  },
);

module.exports = mongoose.model("WritingTask2Opinion", writingTask2OpinionSchema);
