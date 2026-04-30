const mongoose = require("mongoose");

const ORGANIZATION_STATUSES = ["active", "inactive"];

function normalizeOrganizationName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 2,
      maxlength: 120,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ORGANIZATION_STATUSES,
      default: "active",
      index: true,
    },
  },
  { timestamps: true },
);

organizationSchema.pre("validate", function applyNormalizedName() {
  const safeName = normalizeOrganizationName(this.name);
  this.name = safeName;
  this.normalizedName = safeName.toLowerCase();
});

module.exports = {
  Organization: mongoose.model("Organization", organizationSchema),
  ORGANIZATION_STATUSES,
  normalizeOrganizationName,
};
