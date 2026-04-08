const mongoose = require("mongoose");

const segmentSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    bold: { type: Boolean, default: false },
  },
  { _id: false },
);

const slideSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    segments: { type: [segmentSchema], default: [] },
    mistakes: { type: Number, required: true },
    suggestion: { type: String, required: true },
  },
  { _id: false },
);

const overviewSchema = new mongoose.Schema(
  {
    scoreTitle: { type: String, required: true },
    scoreBody: { type: String, required: true },
    scoreTrend: { type: String, required: true },
    scoreTrendUp: { type: Boolean, required: true },
    scoreValue: { type: String, required: true },
    timeTitle: { type: String, required: true },
    timeBody: { type: String, required: true },
    timeTrend: { type: String, required: true },
    timeTrendUp: { type: Boolean, required: true },
    timeValue: { type: String, required: true },
    slides: { type: [slideSchema], default: [] },
  },
  { _id: false },
);

const bandPointSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    band: { type: Number, required: true },
  },
  { _id: false },
);

const timePointSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    minutes: { type: Number, required: true },
  },
  { _id: false },
);

const weakSectionItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    mistakes: { type: Number, required: true },
  },
  { _id: false },
);

const rangeSchema = new mongoose.Schema(
  {
    overview: { type: overviewSchema, required: true },
    bandChart: { type: [bandPointSchema], default: [] },
    timeChart: { type: [timePointSchema], default: [] },
    weakSections: {
      Listening: { type: [weakSectionItemSchema], default: [] },
      Reading: { type: [weakSectionItemSchema], default: [] },
      Writing: { type: [weakSectionItemSchema], default: [] },
    },
  },
  { _id: false },
);

const studentAnalyticsSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    ranges: {
      week: { type: rangeSchema, required: true },
      month: { type: rangeSchema, required: true },
      lifetime: { type: rangeSchema, required: true },
    },
    heatmap: {
      months: { type: [String], default: [] },
      activityData: { type: [Number], default: [] },
    },
    studyActivity: {
      entries: {
        type: [
          new mongoose.Schema(
            {
              dateKey: { type: String, required: true, trim: true },
              visited: { type: Boolean, default: false },
              taskActiveMinutes: { type: Number, default: 0, min: 0 },
            },
            { _id: false },
          ),
        ],
        default: [],
      },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("StudentAnalytics", studentAnalyticsSchema);
