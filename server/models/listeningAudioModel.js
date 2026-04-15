const mongoose = require("mongoose");

const listeningAudioSchema = new mongoose.Schema(
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
    },
    fileSizeBytes: {
      type: Number,
      required: true,
      min: 1,
    },
    audioData: {
      type: Buffer,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "listening_audios",
  },
);

module.exports = mongoose.model("ListeningAudio", listeningAudioSchema);
