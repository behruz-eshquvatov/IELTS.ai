const path = require("path");
const mongoose = require("mongoose");
const ListeningAudio = require("../models/listeningAudioModel");
const { sendAudioStreamResponse } = require("../utils/audioStream");
const {
  normalizeListeningBlockPayload,
  validateListeningBlockPayload,
  buildListeningBlockExtractionPrompt,
} = require("../services/listeningAdminPayloadService");
const {
  normalizeReadingPassagePayload,
  validateReadingPassagePayload,
  normalizeReadingBlockPayload,
  validateReadingBlockPayload,
  normalizeReadingTestPayload,
  validateReadingTestPayload,
  buildReadingPassageExtractionPrompt,
  buildReadingBlockExtractionPrompt,
} = require("../services/readingAdminPayloadService");

const DEFAULT_SUPER_ADMIN_PASSWORD = "3456";
const DEFAULT_OPENROUTER_MODEL = "google/gemini-2.0-flash-001";
const READING_PASSAGES_COLLECTION = "reading_passages";
const READING_BLOCKS_COLLECTION = "reading_blocks";
const READING_TESTS_COLLECTION = "reading_tests";

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

function getHeaderValue(headers, key) {
  const value = headers[key];
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
}

function deriveAudioIdFromFileName(fileName) {
  const normalizedFileName = String(fileName || "").trim();
  const basename = path.basename(normalizedFileName);
  const withoutExtension = basename.replace(/\.[^/.]+$/, "");
  return withoutExtension.trim();
}

function deriveContentTypeFromFileName(fileName) {
  const extension = String(path.extname(fileName || "") || "").toLowerCase();
  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  return "image/jpeg";
}

function stripMarkdownFences(rawContent) {
  const safe = String(rawContent || "").trim();
  if (!safe) {
    return "";
  }

  if (!safe.startsWith("```")) {
    return safe;
  }

  return safe
    .replace(/^```[a-zA-Z0-9_-]*\s*/u, "")
    .replace(/\s*```$/u, "")
    .trim();
}

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function getOpenRouterApiKey() {
  return normalizeText(process.env.OPENROUTER_API_KEY_V2);
}

function maskApiKey(apiKey) {
  const safe = String(apiKey || "").trim();
  if (!safe) {
    return "";
  }

  if (safe.length <= 12) {
    return `${safe.slice(0, 4)}...`;
  }

  return `${safe.slice(0, 8)}...${safe.slice(-4)}`;
}

async function getListeningBlocksCollectionName() {
  const db = mongoose.connection.db;
  const defaultCollectionName = "listening_blocks";
  const legacyCollectionName = "listeninig_blocks";
  const hasDefaultCollection = Boolean(
    await db.listCollections({ name: defaultCollectionName }, { nameOnly: true }).next(),
  );

  if (hasDefaultCollection) {
    const count = await db.collection(defaultCollectionName).estimatedDocumentCount();
    if (count > 0) {
      return defaultCollectionName;
    }
  }

  const hasLegacyCollection = Boolean(
    await db.listCollections({ name: legacyCollectionName }, { nameOnly: true }).next(),
  );

  if (hasLegacyCollection) {
    const count = await db.collection(legacyCollectionName).estimatedDocumentCount();
    if (count > 0) {
      return legacyCollectionName;
    }
  }

  return defaultCollectionName;
}

async function requestOpenRouterImageJson({
  req,
  prompt,
  modelEnvKey,
  fallbackTitle,
  userText,
}) {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return {
      status: 500,
      payload: {
        message:
          "OpenRouter API key is not configured. Set OPENROUTER_API_KEY_V2 in server/.env and restart server.",
      },
    };
  }

  if (typeof fetch !== "function") {
    return {
      status: 500,
      payload: {
        message: "Server runtime does not support fetch(). Use Node.js 18+.",
      },
    };
  }

  const contentTypeHeader = normalizeText(getHeaderValue(req.headers, "content-type"));
  const mimeType = (contentTypeHeader.split(";")[0] || "").trim() || "image/jpeg";
  const imageFileName = normalizeText(getHeaderValue(req.headers, "x-image-filename")) || "pasted-image.jpg";
  const fallbackMimeType = deriveContentTypeFromFileName(imageFileName);
  const effectiveMimeType = mimeType.startsWith("image/") ? mimeType : fallbackMimeType;

  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return {
      status: 400,
      payload: {
        message: "Image payload is missing. Paste or upload an image first.",
      },
    };
  }

  if (!effectiveMimeType.startsWith("image/")) {
    return {
      status: 400,
      payload: {
        message: "Content-Type must be an image type.",
      },
    };
  }

  const model = normalizeText(process.env[modelEnvKey]) || DEFAULT_OPENROUTER_MODEL;
  const base64Image = Buffer.from(req.body).toString("base64");
  const dataUrl = `data:${effectiveMimeType};base64,${base64Image}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.CLIENT_ORIGIN || "http://localhost:5173",
      "X-Title": fallbackTitle,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: [
            { type: "text", text: `${userText} (${imageFileName}).` },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  const responseText = await response.text();
  let responseBody = null;
  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = { message: responseText };
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      return {
        status: 401,
        payload: {
          message:
            "OpenRouter authentication failed (401). API key is invalid/revoked or belongs to a deleted account. Update OPENROUTER_API_KEY_V2 in server/.env and restart server.",
          keyPreview: maskApiKey(apiKey),
          raw: responseBody,
        },
      };
    }

    return {
      status: response.status,
      payload: {
        message: responseBody?.error?.message || responseBody?.message || "OpenRouter extraction failed.",
        raw: responseBody,
      },
    };
  }

  const rawContent = responseBody?.choices?.[0]?.message?.content || "";
  if (!rawContent) {
    return {
      status: 502,
      payload: {
        message: "OpenRouter returned empty content.",
        raw: responseBody,
      },
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(stripMarkdownFences(rawContent));
  } catch {
    return {
      status: 502,
      payload: {
        message: "Extracted content is not valid JSON.",
        rawContent,
      },
    };
  }

  return {
    status: 200,
    payload: {
      model,
      parsed,
    },
  };
}

async function getSuperAdminStatus(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  return res.json({
    message: "Super admin access granted.",
    sections: [
      {
        key: "listening",
        label: "Listening tests",
        path: `/super-admin/${req.params.password}/listening`,
      },
      {
        key: "reading",
        label: "Reading tests",
        path: `/super-admin/${req.params.password}/reading`,
      },
    ],
  });
}

async function listListeningAudios(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const audios = await ListeningAudio.find({}, { audioData: 0 })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  return res.json({
    collection: "listening_audios",
    audios,
  });
}

async function uploadListeningAudio(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const fileNameHeader = getHeaderValue(req.headers, "x-audio-filename");
  const audioId = deriveAudioIdFromFileName(fileNameHeader);
  const mimeType = getHeaderValue(req.headers, "content-type").split(";")[0].trim();

  if (!fileNameHeader || !audioId) {
    return res.status(400).json({
      message: "Provide a valid `X-Audio-Filename` header (for example: aps.mp3).",
    });
  }

  if (!mimeType.startsWith("audio/")) {
    return res.status(400).json({
      message: "Content-Type must be an audio type, for example audio/mpeg.",
    });
  }

  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({
      message: "Audio payload is missing. Send raw audio bytes in the request body.",
    });
  }

  const didExist = Boolean(await ListeningAudio.exists({ _id: audioId }));

  await ListeningAudio.findByIdAndUpdate(
    audioId,
    {
      $set: {
        _id: audioId,
        originalFileName: path.basename(fileNameHeader),
        mimeType,
        fileSizeBytes: req.body.length,
        audioData: req.body,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  const audio = await ListeningAudio.findById(audioId, { audioData: 0 }).lean();

  return res.status(didExist ? 200 : 201).json({
    message: didExist
      ? `Listening audio '${audioId}' updated.`
      : `Listening audio '${audioId}' uploaded.`,
    audio,
  });
}

async function streamListeningAudio(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const audioId = String(req.params.audioId || "").trim();
  const audio = await ListeningAudio.findById(audioId);

  if (!audio) {
    return res.status(404).json({
      message: `Listening audio '${audioId}' not found.`,
    });
  }

  return sendAudioStreamResponse(req, res, audio.audioData, {
    mimeType: audio.mimeType,
    fileName: audio.originalFileName,
  });
}

async function deleteListeningAudio(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const audioId = String(req.params.audioId || "").trim();
  const deletedAudio = await ListeningAudio.findByIdAndDelete(audioId).lean();

  if (!deletedAudio) {
    return res.status(404).json({
      message: `Listening audio '${audioId}' not found.`,
    });
  }

  return res.json({
    message: `Listening audio '${audioId}' deleted.`,
    audio: {
      _id: deletedAudio._id,
      originalFileName: deletedAudio.originalFileName,
      mimeType: deletedAudio.mimeType,
      fileSizeBytes: deletedAudio.fileSizeBytes,
      createdAt: deletedAudio.createdAt,
      updatedAt: deletedAudio.updatedAt,
    },
  });
}

async function extractListeningBlockFromImage(req, res) {
  try {
    if (!hasValidSuperAdminPassword(req.params.password)) {
      return denyInvalidPassword(res);
    }

    const extractionResult = await requestOpenRouterImageJson({
      req,
      prompt: buildListeningBlockExtractionPrompt(),
      modelEnvKey: "OPENROUTER_LISTENING_MODEL",
      fallbackTitle: "IELTS Super Admin Listening Extractor",
      userText: "Extract block JSON from this image",
    });

    if (extractionResult.status !== 200) {
      return res.status(extractionResult.status).json(extractionResult.payload);
    }

    const normalizedBlock = normalizeListeningBlockPayload(extractionResult.payload.parsed);
    const validationErrors = validateListeningBlockPayload(normalizedBlock);

    return res.json({
      message: validationErrors.length > 0
        ? "Block extracted. Please fix validation errors before saving."
        : "Block extracted successfully.",
      model: extractionResult.payload.model,
      block: normalizedBlock,
      validation: {
        isValid: validationErrors.length === 0,
        errors: validationErrors,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || "Listening block extraction failed.",
    });
  }
}

async function saveListeningBlock(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const rawBlock = req.body?.block;
  const normalizedBlock = normalizeListeningBlockPayload(rawBlock);
  const validationErrors = validateListeningBlockPayload(normalizedBlock);

  if (validationErrors.length > 0) {
    return res.status(400).json({
      message: "Block JSON is invalid.",
      validation: {
        isValid: false,
        errors: validationErrors,
      },
    });
  }

  const collectionName = await getListeningBlocksCollectionName();
  const collection = mongoose.connection.db.collection(collectionName);
  const didExist = Boolean(await collection.findOne({ _id: normalizedBlock._id }, { projection: { _id: 1 } }));

  await collection.updateOne(
    { _id: normalizedBlock._id },
    {
      $set: normalizedBlock,
    },
    {
      upsert: true,
    },
  );

  return res.status(didExist ? 200 : 201).json({
    message: didExist
      ? `Listening block '${normalizedBlock._id}' updated.`
      : `Listening block '${normalizedBlock._id}' created.`,
    block: normalizedBlock,
    collection: collectionName,
  });
}

async function getReadingAdminEntry(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const db = mongoose.connection.db;
  const [passagesCount, blocksCount, testsCount] = await Promise.all([
    db.collection(READING_PASSAGES_COLLECTION).countDocuments({}),
    db.collection(READING_BLOCKS_COLLECTION).countDocuments({}),
    db.collection(READING_TESTS_COLLECTION).countDocuments({}),
  ]);

  return res.json({
    message: "Reading super admin access granted.",
    collections: {
      passages: READING_PASSAGES_COLLECTION,
      blocks: READING_BLOCKS_COLLECTION,
      tests: READING_TESTS_COLLECTION,
    },
    counts: {
      passages: passagesCount,
      blocks: blocksCount,
      tests: testsCount,
    },
  });
}

async function listReadingPassages(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const passages = await mongoose.connection.db
    .collection(READING_PASSAGES_COLLECTION)
    .find({})
    .sort({ updatedAt: -1, createdAt: -1, _id: 1 })
    .toArray();

  return res.json({
    collection: READING_PASSAGES_COLLECTION,
    passages,
  });
}

async function listReadingBlocks(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const blocks = await mongoose.connection.db
    .collection(READING_BLOCKS_COLLECTION)
    .find({})
    .sort({ updatedAt: -1, createdAt: -1, _id: 1 })
    .toArray();

  return res.json({
    collection: READING_BLOCKS_COLLECTION,
    blocks,
  });
}

async function listReadingTests(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const tests = await mongoose.connection.db
    .collection(READING_TESTS_COLLECTION)
    .find({})
    .sort({ updatedAt: -1, createdAt: -1, _id: 1 })
    .toArray();

  return res.json({
    collection: READING_TESTS_COLLECTION,
    tests,
  });
}

async function extractReadingPassageFromImage(req, res) {
  try {
    if (!hasValidSuperAdminPassword(req.params.password)) {
      return denyInvalidPassword(res);
    }

    const extractionResult = await requestOpenRouterImageJson({
      req,
      prompt: buildReadingPassageExtractionPrompt(),
      modelEnvKey: "OPENROUTER_READING_MODEL",
      fallbackTitle: "IELTS Super Admin Reading Passage Extractor",
      userText: "Extract reading passage JSON from this image",
    });

    if (extractionResult.status !== 200) {
      return res.status(extractionResult.status).json(extractionResult.payload);
    }

    const normalizedPassage = normalizeReadingPassagePayload(extractionResult.payload.parsed);
    const validationErrors = validateReadingPassagePayload(normalizedPassage);

    return res.json({
      message: validationErrors.length > 0
        ? "Passage extracted. Please fix validation errors before saving."
        : "Passage extracted successfully.",
      model: extractionResult.payload.model,
      passage: normalizedPassage,
      validation: {
        isValid: validationErrors.length === 0,
        errors: validationErrors,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || "Reading passage extraction failed.",
    });
  }
}

async function extractReadingBlockFromImage(req, res) {
  try {
    if (!hasValidSuperAdminPassword(req.params.password)) {
      return denyInvalidPassword(res);
    }

    const extractionResult = await requestOpenRouterImageJson({
      req,
      prompt: buildReadingBlockExtractionPrompt(),
      modelEnvKey: "OPENROUTER_READING_MODEL",
      fallbackTitle: "IELTS Super Admin Reading Block Extractor",
      userText: "Extract reading block JSON from this image",
    });

    if (extractionResult.status !== 200) {
      return res.status(extractionResult.status).json(extractionResult.payload);
    }

    const normalizedBlock = normalizeReadingBlockPayload(extractionResult.payload.parsed);
    const validationErrors = validateReadingBlockPayload(normalizedBlock);

    return res.json({
      message: validationErrors.length > 0
        ? "Block extracted. Please fix validation errors before saving."
        : "Block extracted successfully.",
      model: extractionResult.payload.model,
      block: normalizedBlock,
      validation: {
        isValid: validationErrors.length === 0,
        errors: validationErrors,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || "Reading block extraction failed.",
    });
  }
}

async function saveReadingPassage(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const rawPassage = req.body?.passage;
  const normalizedPassage = normalizeReadingPassagePayload(rawPassage);
  const validationErrors = validateReadingPassagePayload(normalizedPassage);

  if (validationErrors.length > 0) {
    return res.status(400).json({
      message: "Passage JSON is invalid.",
      validation: {
        isValid: false,
        errors: validationErrors,
      },
    });
  }

  const collection = mongoose.connection.db.collection(READING_PASSAGES_COLLECTION);
  const didExist = Boolean(await collection.findOne({ _id: normalizedPassage._id }, { projection: { _id: 1 } }));
  const now = new Date().toISOString();

  await collection.updateOne(
    { _id: normalizedPassage._id },
    {
      $set: {
        ...normalizedPassage,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    {
      upsert: true,
    },
  );

  return res.status(didExist ? 200 : 201).json({
    message: didExist
      ? `Reading passage '${normalizedPassage._id}' updated.`
      : `Reading passage '${normalizedPassage._id}' created.`,
    passage: normalizedPassage,
    collection: READING_PASSAGES_COLLECTION,
  });
}

async function saveReadingBlock(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const rawBlock = req.body?.block;
  const normalizedBlock = normalizeReadingBlockPayload(rawBlock);
  const validationErrors = validateReadingBlockPayload(normalizedBlock);

  if (validationErrors.length > 0) {
    return res.status(400).json({
      message: "Block JSON is invalid.",
      validation: {
        isValid: false,
        errors: validationErrors,
      },
    });
  }

  const collection = mongoose.connection.db.collection(READING_BLOCKS_COLLECTION);
  const didExist = Boolean(await collection.findOne({ _id: normalizedBlock._id }, { projection: { _id: 1 } }));
  const now = new Date().toISOString();

  await collection.updateOne(
    { _id: normalizedBlock._id },
    {
      $set: {
        ...normalizedBlock,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    {
      upsert: true,
    },
  );

  return res.status(didExist ? 200 : 201).json({
    message: didExist
      ? `Reading block '${normalizedBlock._id}' updated.`
      : `Reading block '${normalizedBlock._id}' created.`,
    block: normalizedBlock,
    collection: READING_BLOCKS_COLLECTION,
  });
}

async function saveReadingTest(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const rawTest = req.body?.test;
  const normalizedTest = normalizeReadingTestPayload(rawTest);
  const validationErrors = validateReadingTestPayload(normalizedTest);

  if (validationErrors.length > 0) {
    return res.status(400).json({
      message: "Test JSON is invalid.",
      validation: {
        isValid: false,
        errors: validationErrors,
      },
    });
  }

  const passagesCollection = mongoose.connection.db.collection(READING_PASSAGES_COLLECTION);
  const blocksCollection = mongoose.connection.db.collection(READING_BLOCKS_COLLECTION);

  const passageIds = normalizedTest.passages.map((entry) => entry.passageId);
  const blockIds = normalizedTest.passages.flatMap((entry) => entry.blocks.map((item) => item.blockId));

  const [passages, blocks] = await Promise.all([
    passagesCollection.find({ _id: { $in: passageIds } }, { projection: { _id: 1 } }).toArray(),
    blocksCollection.find({ _id: { $in: blockIds } }, { projection: { _id: 1, passageId: 1 } }).toArray(),
  ]);

  const foundPassageIds = new Set(passages.map((item) => item._id));
  const foundBlocksById = new Map(blocks.map((item) => [item._id, item]));
  const relationErrors = [];

  passageIds.forEach((passageId) => {
    if (!foundPassageIds.has(passageId)) {
      relationErrors.push(`Referenced passageId '${passageId}' does not exist in ${READING_PASSAGES_COLLECTION}.`);
    }
  });

  normalizedTest.passages.forEach((passageEntry) => {
    passageEntry.blocks.forEach((blockRef) => {
      const blockDoc = foundBlocksById.get(blockRef.blockId);
      if (!blockDoc) {
        relationErrors.push(`Referenced blockId '${blockRef.blockId}' does not exist in ${READING_BLOCKS_COLLECTION}.`);
        return;
      }

      if (normalizeText(blockDoc.passageId) !== normalizeText(passageEntry.passageId)) {
        relationErrors.push(
          `Block '${blockRef.blockId}' belongs to passage '${blockDoc.passageId}', but test passage entry uses '${passageEntry.passageId}'.`,
        );
      }
    });
  });

  if (relationErrors.length > 0) {
    return res.status(400).json({
      message: "Test references are invalid.",
      validation: {
        isValid: false,
        errors: relationErrors,
      },
    });
  }

  const testsCollection = mongoose.connection.db.collection(READING_TESTS_COLLECTION);
  const didExist = Boolean(await testsCollection.findOne({ _id: normalizedTest._id }, { projection: { _id: 1 } }));
  const now = new Date().toISOString();

  await testsCollection.updateOne(
    { _id: normalizedTest._id },
    {
      $set: {
        ...normalizedTest,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    {
      upsert: true,
    },
  );

  return res.status(didExist ? 200 : 201).json({
    message: didExist
      ? `Reading test '${normalizedTest._id}' updated.`
      : `Reading test '${normalizedTest._id}' created.`,
    test: normalizedTest,
    collection: READING_TESTS_COLLECTION,
  });
}

module.exports = {
  getSuperAdminStatus,
  listListeningAudios,
  uploadListeningAudio,
  streamListeningAudio,
  deleteListeningAudio,
  extractListeningBlockFromImage,
  saveListeningBlock,
  getReadingAdminEntry,
  listReadingPassages,
  listReadingBlocks,
  listReadingTests,
  extractReadingPassageFromImage,
  extractReadingBlockFromImage,
  saveReadingPassage,
  saveReadingBlock,
  saveReadingTest,
  normalizeReadingPassagePayload,
  normalizeReadingBlockPayload,
  normalizeReadingTestPayload,
  validateReadingPassagePayload,
  validateReadingBlockPayload,
  validateReadingTestPayload,
  buildReadingPassageExtractionPrompt,
  buildReadingBlockExtractionPrompt,
};
