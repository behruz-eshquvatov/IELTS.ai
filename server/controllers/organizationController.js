const mongoose = require("mongoose");
const {
  Organization,
  ORGANIZATION_STATUSES,
  normalizeOrganizationName,
} = require("../models/organizationModel");

const DEFAULT_SUPER_ADMIN_PASSWORD = "3456";
const ORGANIZATION_SEARCH_LIMIT = 10;

function getSuperAdminPassword() {
  return String(process.env.SUPER_ADMIN_PASSWORD || DEFAULT_SUPER_ADMIN_PASSWORD);
}

function hasValidSuperAdminPassword(passwordParam) {
  return String(passwordParam || "") === getSuperAdminPassword();
}

function denyInvalidPassword(res) {
  return res.status(403).json({
    message: "Invalid super admin password.",
  });
}

function escapeRegex(source) {
  return String(source || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mapOrganizationForClient(organizationDoc) {
  return {
    _id: String(organizationDoc?._id || ""),
    name: String(organizationDoc?.name || ""),
    normalizedName: String(organizationDoc?.normalizedName || ""),
    status: String(organizationDoc?.status || "inactive"),
    createdAt: organizationDoc?.createdAt || null,
    updatedAt: organizationDoc?.updatedAt || null,
  };
}

async function searchOrganizations(req, res) {
  const rawQuery = normalizeOrganizationName(req.query?.q || "");
  if (!rawQuery) {
    return res.json({ organizations: [] });
  }

  const escapedQuery = escapeRegex(rawQuery.toLowerCase());

  const organizations = await Organization.aggregate([
    {
      $match: {
        status: "active",
        normalizedName: { $regex: escapedQuery },
      },
    },
    {
      $addFields: {
        startsWithRank: {
          $cond: [
            {
              $regexMatch: {
                input: "$normalizedName",
                regex: `^${escapedQuery}`,
              },
            },
            0,
            1,
          ],
        },
      },
    },
    { $sort: { startsWithRank: 1, normalizedName: 1, createdAt: -1 } },
    { $limit: ORGANIZATION_SEARCH_LIMIT },
    { $project: { _id: 1, name: 1 } },
  ]);

  return res.json({
    organizations: organizations.map((item) => ({
      _id: String(item?._id || ""),
      name: String(item?.name || ""),
    })),
  });
}

async function listSuperAdminOrganizations(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const statusQuery = String(req.query?.status || "all").toLowerCase();
  const searchQuery = normalizeOrganizationName(req.query?.q || "");
  const filter = {};

  if (ORGANIZATION_STATUSES.includes(statusQuery)) {
    filter.status = statusQuery;
  }

  if (searchQuery) {
    filter.normalizedName = {
      $regex: escapeRegex(searchQuery.toLowerCase()),
    };
  }

  const organizations = await Organization.find(filter)
    .sort({ updatedAt: -1, createdAt: -1, normalizedName: 1 })
    .lean();

  return res.json({
    collection: "organizations",
    count: organizations.length,
    organizations: organizations.map(mapOrganizationForClient),
  });
}

async function createSuperAdminOrganization(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const rawName = normalizeOrganizationName(req.body?.name);
  const status = String(req.body?.status || "active").toLowerCase();

  if (!rawName) {
    return res.status(400).json({
      message: "Organization name is required.",
    });
  }

  if (!ORGANIZATION_STATUSES.includes(status)) {
    return res.status(400).json({
      message: `Organization status must be one of: ${ORGANIZATION_STATUSES.join(", ")}.`,
    });
  }

  const normalizedName = rawName.toLowerCase();
  const existing = await Organization.findOne({ normalizedName }, { _id: 1 }).lean();
  if (existing) {
    return res.status(409).json({
      message: "Organization name already exists.",
    });
  }

  const createdOrganization = await Organization.create({
    name: rawName,
    normalizedName,
    status,
  });

  return res.status(201).json({
    message: "Organization created.",
    organization: mapOrganizationForClient(createdOrganization.toObject()),
  });
}

async function updateSuperAdminOrganization(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const organizationId = String(req.params.organizationId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(organizationId)) {
    return res.status(400).json({
      message: "Invalid organization id.",
    });
  }

  const existingOrganization = await Organization.findById(organizationId);
  if (!existingOrganization) {
    return res.status(404).json({
      message: "Organization not found.",
    });
  }

  const updates = {};
  if (typeof req.body?.name === "string") {
    const nextName = normalizeOrganizationName(req.body.name);
    if (!nextName) {
      return res.status(400).json({
        message: "Organization name cannot be empty.",
      });
    }
    const nextNormalizedName = nextName.toLowerCase();
    const duplicate = await Organization.findOne({
      normalizedName: nextNormalizedName,
      _id: { $ne: existingOrganization._id },
    }).lean();
    if (duplicate) {
      return res.status(409).json({
        message: "Organization name already exists.",
      });
    }
    updates.name = nextName;
    updates.normalizedName = nextNormalizedName;
  }

  if (typeof req.body?.status === "string") {
    const nextStatus = String(req.body.status).toLowerCase();
    if (!ORGANIZATION_STATUSES.includes(nextStatus)) {
      return res.status(400).json({
        message: `Organization status must be one of: ${ORGANIZATION_STATUSES.join(", ")}.`,
      });
    }
    updates.status = nextStatus;
  }

  if (!Object.keys(updates).length) {
    return res.status(400).json({
      message: "No valid fields provided for update.",
    });
  }

  const updatedOrganization = await Organization.findByIdAndUpdate(
    organizationId,
    { $set: updates },
    { new: true, runValidators: true },
  ).lean();

  return res.json({
    message: "Organization updated.",
    organization: mapOrganizationForClient(updatedOrganization),
  });
}

async function deleteSuperAdminOrganization(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const organizationId = String(req.params.organizationId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(organizationId)) {
    return res.status(400).json({
      message: "Invalid organization id.",
    });
  }

  const deletedOrganization = await Organization.findByIdAndDelete(organizationId).lean();
  if (!deletedOrganization) {
    return res.status(404).json({
      message: "Organization not found.",
    });
  }

  return res.json({
    message: "Organization deleted.",
    organization: mapOrganizationForClient(deletedOrganization),
  });
}

module.exports = {
  searchOrganizations,
  listSuperAdminOrganizations,
  createSuperAdminOrganization,
  updateSuperAdminOrganization,
  deleteSuperAdminOrganization,
};
