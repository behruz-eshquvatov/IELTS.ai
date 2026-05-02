const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    invoiceId: { type: String, required: true },
    date: { type: String, required: true },
    amount: { type: String, required: true },
    status: { type: String, required: true, default: "Paid" },
  },
  { _id: false },
);

const studentProfileSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 160,
    },
    bio: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },
    memberSince: { type: String, required: true },
    subscription: {
      planName: { type: String, required: true, default: "Student subscription" },
      monthlyPrice: { type: Number, required: true, default: 19 },
      teacherMonthlyPrice: { type: Number, required: true, default: 39 },
      status: { type: String, required: true, default: "Active subscription" },
      benefits: [{ type: String }],
    },
    paymentMethod: {
      cardMasked: { type: String, required: true, default: "**** **** **** 4821" },
      label: { type: String, required: true, default: "Primary payment method" },
    },
    security: {
      passwordMasked: { type: String, required: true, default: "************" },
      lastUpdatedLabel: { type: String, default: "" },
    },
    billingHistory: {
      type: [invoiceSchema],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("StudentProfile", studentProfileSchema);
