const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    handledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, collection: "notifications" },
);

notificationSchema.index({ recipientId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
