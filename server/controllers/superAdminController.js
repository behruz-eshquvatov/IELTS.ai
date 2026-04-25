const path = require("path");
const mongoose = require("mongoose");
const ListeningAudio = require("../models/listeningAudioModel");
const WritingTask1Item = require("../models/writingTask1ItemModel");
const WritingTask1Visual = require("../models/writingTask1VisualModel");
const WritingTask2Item = require("../models/writingTask2ItemModel");
const {
  DailyTaskUnit,
  DAILY_TASK_TYPES,
  DAILY_TASK_UNIT_STATUSES,
} = require("../models/dailyTaskUnitModel");
const { sendAudioStreamResponse } = require("../utils/audioStream");
const {
  normalizeListeningBlockPayload,
  validateListeningBlockPayload,
  normalizeListeningTestPayload,
  validateListeningTestPayload,
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
const {
  normalizeWritingTask1ItemPayload,
  validateWritingTask1ItemPayload,
  buildWritingTask1QuestionTopicExtractionPrompt,
} = require("../services/writingTask1AdminPayloadService");
const {
  WRITING_TASK2_ESSAY_TYPES,
  normalizeWritingTask2ItemPayload,
  validateWritingTask2ItemPayload,
  buildWritingTask2ExtractionPrompt,
} = require("../services/writingTask2AdminPayloadService");

const DEFAULT_SUPER_ADMIN_PASSWORD = "3456";
const DEFAULT_OPENROUTER_MODEL = "google/gemini-2.0-flash-001";
const LISTENING_TESTS_COLLECTION = "listening_tests";
const READING_PASSAGES_COLLECTION = "reading_passages";
const READING_BLOCKS_COLLECTION = "reading_blocks";
const READING_TESTS_COLLECTION = "reading_tests";
const WRITING_TASK1_COLLECTION = "writing_task1_items";
const WRITING_TASK1_VISUALS_COLLECTION = "writing_task1_visuals";
const WRITING_TASK2_COLLECTION = "writing_task2_items";
const DAILY_TASK_UNITS_COLLECTION = "daily_task_units";

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

function deriveWritingTask1VisualId() {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const randomChunk = Math.random().toString(36).slice(2, 8);
  return `wt1_visual_${stamp}_${randomChunk}`;
}

function buildWritingTask1VisualUrl(imageId) {
  const safeImageId = normalizeText(imageId);
  if (!safeImageId) {
    return "";
  }

  return `/api/v1/writing-task1/visuals/${encodeURIComponent(safeImageId)}`;
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

async function requestOpenRouterTextJson({
  prompt,
  modelEnvKey,
  fallbackTitle,
  sourceText,
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

  const safeSourceText = normalizeText(sourceText);
  if (!safeSourceText) {
    return {
      status: 400,
      payload: {
        message: "Source text is required for text extraction.",
      },
    };
  }

  const model = normalizeText(process.env[modelEnvKey]) || DEFAULT_OPENROUTER_MODEL;
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
          content: `Extract writing task JSON from this source text:\n\n${safeSourceText}`,
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
      {
        key: "writing-task1",
        label: "Writing Task 1",
        path: `/super-admin/${req.params.password}/writing-task1`,
      },
      {
        key: "writing-task2",
        label: "Writing Task 2",
        path: `/super-admin/${req.params.password}/writing-task2`,
      },
      {
        key: "daily-units",
        label: "Daily Units",
        path: `/super-admin/${req.params.password}/daily-units`,
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

async function listListeningBlocks(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const collectionName = await getListeningBlocksCollectionName();
  const blocks = await mongoose.connection.db
    .collection(collectionName)
    .find({})
    .sort({ updatedAt: -1, createdAt: -1, _id: 1 })
    .toArray();

  return res.json({
    collection: collectionName,
    blocks,
  });
}

async function listListeningTests(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const tests = await mongoose.connection.db
    .collection(LISTENING_TESTS_COLLECTION)
    .find({})
    .sort({ updatedAt: -1, createdAt: -1, _id: 1 })
    .toArray();

  return res.json({
    collection: LISTENING_TESTS_COLLECTION,
    tests,
  });
}

async function saveListeningTest(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const rawTest = req.body?.test;
  const normalizedTest = normalizeListeningTestPayload(rawTest);
  const validationErrors = validateListeningTestPayload(normalizedTest);

  if (validationErrors.length > 0) {
    return res.status(400).json({
      message: "Listening test JSON is invalid.",
      validation: {
        isValid: false,
        errors: validationErrors,
      },
    });
  }

  const parts = Array.isArray(normalizedTest?.parts) ? normalizedTest.parts : [];
  const blockRefs = parts.flatMap((part) => (Array.isArray(part?.blocks) ? part.blocks : []));
  const blockIds = Array.from(
    new Set(
      blockRefs.map((blockRef) => normalizeText(blockRef?.blockId)).filter(Boolean),
    ),
  );
  const audioRefs = Array.from(
    new Set(
      blockRefs.map((blockRef) => normalizeText(blockRef?.audioRef)).filter(Boolean),
    ),
  );

  const blocksCollectionName = await getListeningBlocksCollectionName();
  const blocksCollection = mongoose.connection.db.collection(blocksCollectionName);
  const [blocks, audios] = await Promise.all([
    blockIds.length > 0
      ? blocksCollection
        .find({ _id: { $in: blockIds } }, { projection: { _id: 1 } })
        .toArray()
      : [],
    audioRefs.length > 0
      ? ListeningAudio.find({ _id: { $in: audioRefs } }, { _id: 1 }).lean()
      : [],
  ]);

  const foundBlockIds = new Set(blocks.map((item) => String(item?._id || "").trim()).filter(Boolean));
  const foundAudioRefs = new Set(audios.map((item) => String(item?._id || "").trim()).filter(Boolean));
  const relationErrors = [];

  blockIds.forEach((blockId) => {
    if (!foundBlockIds.has(blockId)) {
      relationErrors.push(`Referenced blockId '${blockId}' does not exist in ${blocksCollectionName}.`);
    }
  });

  audioRefs.forEach((audioRef) => {
    if (!foundAudioRefs.has(audioRef)) {
      relationErrors.push(`Referenced audioRef '${audioRef}' does not exist in listening_audios.`);
    }
  });

  if (relationErrors.length > 0) {
    return res.status(400).json({
      message: "Listening test references are invalid.",
      validation: {
        isValid: false,
        errors: relationErrors,
      },
    });
  }

  const testsCollection = mongoose.connection.db.collection(LISTENING_TESTS_COLLECTION);
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
      ? `Listening test '${normalizedTest._id}' updated.`
      : `Listening test '${normalizedTest._id}' created.`,
    test: normalizedTest,
    collection: LISTENING_TESTS_COLLECTION,
  });
}

async function getWritingTask1AdminEntry(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const [itemsCount, visualsCount] = await Promise.all([
    WritingTask1Item.countDocuments({}),
    WritingTask1Visual.countDocuments({}),
  ]);

  return res.json({
    message: "Writing Task 1 super admin access granted.",
    collections: {
      items: WRITING_TASK1_COLLECTION,
      visuals: WRITING_TASK1_VISUALS_COLLECTION,
    },
    counts: {
      items: itemsCount,
      visuals: visualsCount,
    },
  });
}

async function listWritingTask1Items(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const items = await WritingTask1Item.find({})
    .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
    .lean();

  return res.json({
    collection: WRITING_TASK1_COLLECTION,
    items,
  });
}

async function listWritingTask1Visuals(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const visuals = await WritingTask1Visual.find({}, { imageData: 0 })
    .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
    .lean();

  const visualsWithUrl = visuals.map((visual) => ({
    ...visual,
    url: buildWritingTask1VisualUrl(visual?._id),
  }));

  return res.json({
    collection: WRITING_TASK1_VISUALS_COLLECTION,
    visuals: visualsWithUrl,
  });
}

async function deleteWritingTask1Visual(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const imageId = normalizeText(req.params.imageId);
  if (!imageId) {
    return res.status(400).json({
      message: "Writing Task 1 visual id is required.",
    });
  }

  const linkedItemsCount = await WritingTask1Item.countDocuments({
    "visualAsset.imageId": imageId,
  });
  if (linkedItemsCount > 0) {
    return res.status(409).json({
      message: `Cannot delete visual '${imageId}' because it is used by ${linkedItemsCount} Writing Task 1 item(s).`,
    });
  }

  const deletedVisual = await WritingTask1Visual.findByIdAndDelete(imageId).lean();
  if (!deletedVisual) {
    return res.status(404).json({
      message: `Writing Task 1 visual '${imageId}' not found.`,
    });
  }

  return res.json({
    message: `Writing Task 1 visual '${imageId}' deleted.`,
    visual: {
      _id: deletedVisual._id,
      originalFileName: deletedVisual.originalFileName,
      mimeType: deletedVisual.mimeType,
      fileSizeBytes: deletedVisual.fileSizeBytes,
      createdAt: deletedVisual.createdAt,
      updatedAt: deletedVisual.updatedAt,
      url: buildWritingTask1VisualUrl(deletedVisual._id),
    },
  });
}

async function extractWritingTask1QuestionTopic(req, res) {
  try {
    if (!hasValidSuperAdminPassword(req.params.password)) {
      return denyInvalidPassword(res);
    }

    const extractionResult = await requestOpenRouterImageJson({
      req,
      prompt: buildWritingTask1QuestionTopicExtractionPrompt(),
      modelEnvKey: "OPENROUTER_WRITING_TASK1_MODEL",
      fallbackTitle: "IELTS Super Admin Writing Task 1 Topic Extractor",
      userText: "Extract IELTS Writing Task 1 question topic text from this image",
    });

    if (extractionResult.status !== 200) {
      return res.status(extractionResult.status).json(extractionResult.payload);
    }

    const questionTopic = normalizeText(extractionResult.payload?.parsed?.questionTopic);
    if (!questionTopic) {
      return res.status(422).json({
        message: "AI could not extract question topic text from this image.",
      });
    }

    return res.json({
      message: "Question topic extracted successfully.",
      model: extractionResult.payload.model,
      questionTopic,
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || "Writing Task 1 question topic extraction failed.",
    });
  }
}

async function uploadWritingTask1Visual(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const contentType = normalizeText(getHeaderValue(req.headers, "content-type")).split(";")[0] || "";
  if (!contentType.startsWith("image/")) {
    return res.status(400).json({
      message: "Content-Type must be an image type.",
    });
  }

  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({
      message: "Image payload is missing. Send raw image bytes in the request body.",
    });
  }

  const requestedVisualId = normalizeText(getHeaderValue(req.headers, "x-visual-id"));
  const imageId = requestedVisualId || deriveWritingTask1VisualId();
  const didExist = Boolean(await WritingTask1Visual.exists({ _id: imageId }));
  const fileNameHeader = normalizeText(getHeaderValue(req.headers, "x-visual-filename"));
  const fileExtension = contentType.includes("png")
    ? "png"
    : contentType.includes("webp")
      ? "webp"
      : "jpg";
  const originalFileName = fileNameHeader || `${imageId}.${fileExtension}`;

  await WritingTask1Visual.findByIdAndUpdate(
    imageId,
    {
      $set: {
        _id: imageId,
        originalFileName,
        mimeType: contentType,
        fileSizeBytes: req.body.length,
        imageData: req.body,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  const visual = await WritingTask1Visual.findById(imageId, { imageData: 0 }).lean();

  return res.status(didExist ? 200 : 201).json({
    message: didExist
      ? `Writing Task 1 visual '${imageId}' updated.`
      : `Writing Task 1 visual '${imageId}' uploaded.`,
    visual: {
      ...visual,
      url: buildWritingTask1VisualUrl(imageId),
    },
  });
}

async function saveWritingTask1Item(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const normalizedItem = normalizeWritingTask1ItemPayload(req.body?.item);
  const validationErrors = validateWritingTask1ItemPayload(normalizedItem);
  if (validationErrors.length > 0) {
    return res.status(400).json({
      message: "Writing Task 1 item payload is invalid.",
      validation: {
        isValid: false,
        errors: validationErrors,
      },
    });
  }

  const imageId = normalizeText(normalizedItem?.visualAsset?.imageId);
  const visualDoc = await WritingTask1Visual.findById(imageId, { _id: 1 }).lean();
  if (!visualDoc) {
    return res.status(400).json({
      message: `Referenced visual '${imageId}' does not exist in ${WRITING_TASK1_VISUALS_COLLECTION}.`,
    });
  }

  const payload = {
    ...normalizedItem,
    visualAsset: {
      imageId,
      url: buildWritingTask1VisualUrl(imageId),
    },
  };

  const itemId = normalizeText(req.body?.itemId);
  if (itemId) {
    const existingItem = await WritingTask1Item.findById(itemId).lean();
    if (!existingItem) {
      return res.status(404).json({
        message: `Writing Task 1 item '${itemId}' not found.`,
      });
    }

    const updatedItem = await WritingTask1Item.findByIdAndUpdate(
      itemId,
      {
        $set: payload,
      },
      {
        new: true,
        runValidators: true,
      },
    ).lean();

    return res.json({
      message: `Writing Task 1 item '${itemId}' updated.`,
      item: updatedItem,
      collection: WRITING_TASK1_COLLECTION,
    });
  }

  const createdItem = await WritingTask1Item.create(payload);
  return res.status(201).json({
    message: "Writing Task 1 item created.",
    item: await WritingTask1Item.findById(createdItem._id).lean(),
    collection: WRITING_TASK1_COLLECTION,
  });
}

async function getWritingTask2AdminEntry(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const itemsCount = await WritingTask2Item.countDocuments({});

  return res.json({
    message: "Writing Task 2 super admin access granted.",
    collections: {
      items: WRITING_TASK2_COLLECTION,
    },
    counts: {
      items: itemsCount,
    },
    essayTypes: Array.from(WRITING_TASK2_ESSAY_TYPES),
  });
}

async function listWritingTask2Items(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const items = await WritingTask2Item.find({})
    .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
    .lean();

  return res.json({
    collection: WRITING_TASK2_COLLECTION,
    items,
  });
}

async function getWritingTask2ItemById(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const itemId = normalizeText(req.params.itemId);
  if (!itemId) {
    return res.status(400).json({
      message: "Writing Task 2 item id is required.",
    });
  }

  const item = await WritingTask2Item.findById(itemId).lean();
  if (!item) {
    return res.status(404).json({
      message: `Writing Task 2 item '${itemId}' not found.`,
    });
  }

  return res.json({
    item,
  });
}

async function extractWritingTask2FromImage(req, res) {
  try {
    if (!hasValidSuperAdminPassword(req.params.password)) {
      return denyInvalidPassword(res);
    }

    const extractionResult = await requestOpenRouterImageJson({
      req,
      prompt: buildWritingTask2ExtractionPrompt(),
      modelEnvKey: "OPENROUTER_WRITING_TASK2_MODEL",
      fallbackTitle: "IELTS Super Admin Writing Task 2 Extractor",
      userText: "Extract IELTS Writing Task 2 JSON from this image",
    });

    if (extractionResult.status !== 200) {
      return res.status(extractionResult.status).json(extractionResult.payload);
    }

    const normalizedItem = normalizeWritingTask2ItemPayload(extractionResult.payload.parsed);
    const validationErrors = validateWritingTask2ItemPayload(normalizedItem);

    return res.json({
      message: validationErrors.length > 0
        ? "Writing Task 2 extracted. Please review and fix validation issues."
        : "Writing Task 2 extracted successfully.",
      model: extractionResult.payload.model,
      item: normalizedItem,
      validation: {
        isValid: validationErrors.length === 0,
        errors: validationErrors,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || "Writing Task 2 extraction from image failed.",
    });
  }
}

async function extractWritingTask2FromText(req, res) {
  try {
    if (!hasValidSuperAdminPassword(req.params.password)) {
      return denyInvalidPassword(res);
    }

    const sourceText = normalizeText(req.body?.sourceText);
    if (!sourceText) {
      return res.status(400).json({
        message: "`sourceText` is required.",
      });
    }

    const extractionResult = await requestOpenRouterTextJson({
      prompt: buildWritingTask2ExtractionPrompt(),
      modelEnvKey: "OPENROUTER_WRITING_TASK2_MODEL",
      fallbackTitle: "IELTS Super Admin Writing Task 2 Text Extractor",
      sourceText,
    });

    if (extractionResult.status !== 200) {
      return res.status(extractionResult.status).json(extractionResult.payload);
    }

    const normalizedItem = normalizeWritingTask2ItemPayload(extractionResult.payload.parsed);
    const validationErrors = validateWritingTask2ItemPayload(normalizedItem);

    return res.json({
      message: validationErrors.length > 0
        ? "Writing Task 2 extracted. Please review and fix validation issues."
        : "Writing Task 2 extracted successfully.",
      model: extractionResult.payload.model,
      item: normalizedItem,
      validation: {
        isValid: validationErrors.length === 0,
        errors: validationErrors,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || "Writing Task 2 extraction from text failed.",
    });
  }
}

async function saveWritingTask2Item(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const normalizedItem = normalizeWritingTask2ItemPayload(req.body?.item);
  const validationErrors = validateWritingTask2ItemPayload(normalizedItem);
  if (validationErrors.length > 0) {
    return res.status(400).json({
      message: "Writing Task 2 item payload is invalid.",
      validation: {
        isValid: false,
        errors: validationErrors,
      },
    });
  }

  const itemId = normalizeText(req.body?.itemId);
  if (itemId) {
    const existingItem = await WritingTask2Item.findById(itemId).lean();
    if (!existingItem) {
      return res.status(404).json({
        message: `Writing Task 2 item '${itemId}' not found.`,
      });
    }

    const updatedItem = await WritingTask2Item.findByIdAndUpdate(
      itemId,
      {
        $set: normalizedItem,
      },
      {
        new: true,
        runValidators: true,
      },
    ).lean();

    return res.json({
      message: `Writing Task 2 item '${itemId}' updated.`,
      item: updatedItem,
      collection: WRITING_TASK2_COLLECTION,
    });
  }

  const createdItem = await WritingTask2Item.create(normalizedItem);
  return res.status(201).json({
    message: "Writing Task 2 item created.",
    item: await WritingTask2Item.findById(createdItem._id).lean(),
    collection: WRITING_TASK2_COLLECTION,
  });
}

async function deleteWritingTask2Item(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const itemId = normalizeText(req.params.itemId);
  if (!itemId) {
    return res.status(400).json({
      message: "Writing Task 2 item id is required.",
    });
  }

  const deletedItem = await WritingTask2Item.findByIdAndDelete(itemId).lean();
  if (!deletedItem) {
    return res.status(404).json({
      message: `Writing Task 2 item '${itemId}' not found.`,
    });
  }

  return res.json({
    message: `Writing Task 2 item '${itemId}' deleted.`,
    item: deletedItem,
    collection: WRITING_TASK2_COLLECTION,
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

  const blocks = (await mongoose.connection.db
    .collection(READING_BLOCKS_COLLECTION)
    .find({})
    .sort({ updatedAt: -1, createdAt: -1, _id: 1 })
    .toArray())
    .map((block) => normalizeReadingBlockPayload(block));

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

function toPositiveInteger(value, fallback = 1) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function normalizeDailyUnitStatus(value) {
  const normalized = normalizeText(value).toLowerCase();
  return DAILY_TASK_UNIT_STATUSES.includes(normalized) ? normalized : "draft";
}

function normalizeDailyUnitTaskType(value) {
  const normalized = normalizeText(value).toLowerCase();
  return DAILY_TASK_TYPES.includes(normalized) ? normalized : "";
}

function normalizeDailyUnitTaskRefId(value) {
  return normalizeText(value);
}

function normalizeDailyTaskUnitPayload(rawPayload = {}) {
  const rawTasks = Array.isArray(rawPayload?.tasks) ? rawPayload.tasks : [];
  const normalizedTasks = rawTasks
    .map((task, index) => ({
      taskType: normalizeDailyUnitTaskType(task?.taskType),
      taskRefId: normalizeDailyUnitTaskRefId(task?.taskRefId),
      order: toPositiveInteger(task?.order, index + 1),
    }))
    .sort((left, right) => Number(left.order || 0) - Number(right.order || 0))
    .map((task, index) => ({
      ...task,
      order: index + 1,
    }));

  return {
    title: normalizeText(rawPayload?.title),
    order: toPositiveInteger(rawPayload?.order, 1),
    status: normalizeDailyUnitStatus(rawPayload?.status),
    tasks: normalizedTasks,
  };
}

function validateNormalizedDailyTaskUnitPayload(payload) {
  const errors = [];
  if (!payload.title) {
    errors.push("`title` is required.");
  }

  if (!DAILY_TASK_UNIT_STATUSES.includes(payload.status)) {
    errors.push(`\`status\` must be one of: ${DAILY_TASK_UNIT_STATUSES.join(", ")}.`);
  }

  if (!Number.isFinite(payload.order) || payload.order <= 0) {
    errors.push("`order` must be a positive integer.");
  }

  if (!Array.isArray(payload.tasks) || payload.tasks.length === 0) {
    errors.push("`tasks` must contain at least one task.");
  }

  const seenTaskRefs = new Set();
  (payload.tasks || []).forEach((task, index) => {
    if (!DAILY_TASK_TYPES.includes(task.taskType)) {
      errors.push(
        `tasks[${index}].taskType must be one of: ${DAILY_TASK_TYPES.join(", ")}.`,
      );
    }

    if (!task.taskRefId) {
      errors.push(`tasks[${index}].taskRefId is required.`);
    }

    if (!Number.isFinite(task.order) || task.order <= 0) {
      errors.push(`tasks[${index}].order must be a positive integer.`);
    }

    if (task.taskType && task.taskRefId) {
      const dedupeKey = `${task.taskType}::${task.taskRefId}`;
      if (seenTaskRefs.has(dedupeKey)) {
        errors.push(
          `Duplicate task reference '${task.taskType}:${task.taskRefId}' is not allowed within one unit.`,
        );
      } else {
        seenTaskRefs.add(dedupeKey);
      }
    }
  });

  return errors;
}

async function validateDailyTaskUnitReferences(tasks = []) {
  const groupedIds = {
    reading: new Set(),
    listening: new Set(),
    writing_task1: new Set(),
    writing_task2: new Set(),
  };

  tasks.forEach((task) => {
    if (groupedIds[task.taskType] && task.taskRefId) {
      groupedIds[task.taskType].add(task.taskRefId);
    }
  });

  const db = mongoose.connection.db;
  const [readingDocs, listeningDocs, writingTask1Docs, writingTask2Docs] = await Promise.all([
    groupedIds.reading.size > 0
      ? db.collection(READING_TESTS_COLLECTION).find(
        { _id: { $in: Array.from(groupedIds.reading) } },
        { projection: { _id: 1 } },
      ).toArray()
      : [],
    groupedIds.listening.size > 0
      ? db.collection(LISTENING_TESTS_COLLECTION).find(
        { _id: { $in: Array.from(groupedIds.listening) } },
        { projection: { _id: 1 } },
      ).toArray()
      : [],
    groupedIds.writing_task1.size > 0
      ? WritingTask1Item.find(
        { _id: { $in: Array.from(groupedIds.writing_task1) } },
        { _id: 1 },
      ).lean()
      : [],
    groupedIds.writing_task2.size > 0
      ? WritingTask2Item.find(
        { _id: { $in: Array.from(groupedIds.writing_task2) } },
        { _id: 1 },
      ).lean()
      : [],
  ]);

  const foundByType = {
    reading: new Set(readingDocs.map((doc) => String(doc?._id || ""))),
    listening: new Set(listeningDocs.map((doc) => String(doc?._id || ""))),
    writing_task1: new Set(writingTask1Docs.map((doc) => String(doc?._id || ""))),
    writing_task2: new Set(writingTask2Docs.map((doc) => String(doc?._id || ""))),
  };

  const errors = [];
  tasks.forEach((task, index) => {
    const safeType = task?.taskType;
    const safeRefId = task?.taskRefId;
    if (!safeType || !safeRefId) {
      return;
    }

    const foundIds = foundByType[safeType] || new Set();
    if (!foundIds.has(String(safeRefId))) {
      errors.push(
        `tasks[${index}] references '${safeRefId}' for type '${safeType}', but it does not exist in the source collection.`,
      );
    }
  });

  return errors;
}

function mapDailyTaskUnitForClient(unit) {
  const tasks = Array.isArray(unit?.tasks)
    ? [...unit.tasks].sort((left, right) => Number(left?.order || 0) - Number(right?.order || 0))
    : [];

  return {
    _id: String(unit?._id || ""),
    title: String(unit?.title || ""),
    order: Number(unit?.order || 0),
    status: String(unit?.status || "draft"),
    tasks,
    tasksCount: tasks.length,
    createdAt: unit?.createdAt || null,
    updatedAt: unit?.updatedAt || null,
  };
}

async function listDailyTaskUnitSources(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const db = mongoose.connection.db;
  const [readingTests, listeningTests, writingTask1Items, writingTask2Items] = await Promise.all([
    db.collection(READING_TESTS_COLLECTION)
      .find({}, { projection: { _id: 1, title: 1, module: 1, status: 1, updatedAt: 1, createdAt: 1 } })
      .sort({ updatedAt: -1, createdAt: -1, _id: 1 })
      .toArray(),
    db.collection(LISTENING_TESTS_COLLECTION)
      .find({}, { projection: { _id: 1, title: 1, module: 1, status: 1, updatedAt: 1, createdAt: 1 } })
      .sort({ updatedAt: -1, createdAt: -1, _id: 1 })
      .toArray(),
    WritingTask1Item.find({}, { _id: 1, questionTopic: 1, visualType: 1, status: 1, updatedAt: 1, createdAt: 1 })
      .sort({ updatedAt: -1, createdAt: -1, _id: 1 })
      .lean(),
    WritingTask2Item.find({}, { _id: 1, questionTopic: 1, essayType: 1, status: 1, updatedAt: 1, createdAt: 1 })
      .sort({ updatedAt: -1, createdAt: -1, _id: 1 })
      .lean(),
  ]);

  return res.json({
    collections: {
      dailyUnits: DAILY_TASK_UNITS_COLLECTION,
      readingTests: READING_TESTS_COLLECTION,
      listeningTests: LISTENING_TESTS_COLLECTION,
      writingTask1Items: WRITING_TASK1_COLLECTION,
      writingTask2Items: WRITING_TASK2_COLLECTION,
    },
    sources: {
      reading: readingTests.map((item) => ({
        _id: String(item?._id || ""),
        title: normalizeText(item?.title) || String(item?._id || ""),
        module: normalizeText(item?.module),
        status: normalizeText(item?.status) || "draft",
        updatedAt: item?.updatedAt || null,
        createdAt: item?.createdAt || null,
      })),
      listening: listeningTests.map((item) => ({
        _id: String(item?._id || ""),
        title: normalizeText(item?.title) || String(item?._id || ""),
        module: normalizeText(item?.module),
        status: normalizeText(item?.status) || "draft",
        updatedAt: item?.updatedAt || null,
        createdAt: item?.createdAt || null,
      })),
      writing_task1: writingTask1Items.map((item) => ({
        _id: String(item?._id || ""),
        questionTopic: normalizeText(item?.questionTopic),
        visualType: normalizeText(item?.visualType),
        status: normalizeText(item?.status) || "draft",
        updatedAt: item?.updatedAt || null,
        createdAt: item?.createdAt || null,
      })),
      writing_task2: writingTask2Items.map((item) => ({
        _id: String(item?._id || ""),
        questionTopic: normalizeText(item?.questionTopic),
        essayType: normalizeText(item?.essayType),
        status: normalizeText(item?.status) || "draft",
        updatedAt: item?.updatedAt || null,
        createdAt: item?.createdAt || null,
      })),
    },
  });
}

async function listDailyTaskUnits(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const units = await DailyTaskUnit.find({})
    .sort({ order: 1, createdAt: 1, _id: 1 })
    .lean();

  return res.json({
    collection: DAILY_TASK_UNITS_COLLECTION,
    count: units.length,
    units: units.map(mapDailyTaskUnitForClient),
  });
}

async function createDailyTaskUnit(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const normalizedPayload = normalizeDailyTaskUnitPayload(req.body?.unit || req.body || {});

  if (!req.body?.unit?.order && !req.body?.order) {
    const latestUnit = await DailyTaskUnit.findOne({})
      .sort({ order: -1, createdAt: -1, _id: -1 })
      .lean();
    normalizedPayload.order = Number(latestUnit?.order || 0) + 1;
  }

  const validationErrors = validateNormalizedDailyTaskUnitPayload(normalizedPayload);
  const referenceErrors = validationErrors.length
    ? []
    : await validateDailyTaskUnitReferences(normalizedPayload.tasks);

  const errors = [...validationErrors, ...referenceErrors];
  if (errors.length > 0) {
    return res.status(400).json({
      message: "Daily unit payload is invalid.",
      validation: {
        isValid: false,
        errors,
      },
    });
  }

  const createdUnit = await DailyTaskUnit.create(normalizedPayload);
  return res.status(201).json({
    message: "Daily unit created.",
    collection: DAILY_TASK_UNITS_COLLECTION,
    unit: mapDailyTaskUnitForClient(createdUnit.toObject()),
  });
}

async function updateDailyTaskUnit(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const unitId = normalizeText(req.params.unitId);
  if (!unitId) {
    return res.status(400).json({
      message: "Daily unit id is required.",
    });
  }

  const existingUnit = await DailyTaskUnit.findById(unitId).lean();
  if (!existingUnit) {
    return res.status(404).json({
      message: `Daily unit '${unitId}' not found.`,
    });
  }

  const normalizedPayload = normalizeDailyTaskUnitPayload(req.body?.unit || req.body || {});
  const validationErrors = validateNormalizedDailyTaskUnitPayload(normalizedPayload);
  const referenceErrors = validationErrors.length
    ? []
    : await validateDailyTaskUnitReferences(normalizedPayload.tasks);

  const errors = [...validationErrors, ...referenceErrors];
  if (errors.length > 0) {
    return res.status(400).json({
      message: "Daily unit payload is invalid.",
      validation: {
        isValid: false,
        errors,
      },
    });
  }

  const updatedUnit = await DailyTaskUnit.findByIdAndUpdate(
    unitId,
    { $set: normalizedPayload },
    { new: true, runValidators: true },
  ).lean();

  return res.json({
    message: `Daily unit '${unitId}' updated.`,
    collection: DAILY_TASK_UNITS_COLLECTION,
    unit: mapDailyTaskUnitForClient(updatedUnit),
  });
}

async function deleteDailyTaskUnit(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const unitId = normalizeText(req.params.unitId);
  if (!unitId) {
    return res.status(400).json({
      message: "Daily unit id is required.",
    });
  }

  const deletedUnit = await DailyTaskUnit.findByIdAndDelete(unitId).lean();
  if (!deletedUnit) {
    return res.status(404).json({
      message: `Daily unit '${unitId}' not found.`,
    });
  }

  return res.json({
    message: `Daily unit '${unitId}' deleted.`,
    collection: DAILY_TASK_UNITS_COLLECTION,
    unit: mapDailyTaskUnitForClient(deletedUnit),
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
  listListeningBlocks,
  listListeningTests,
  saveListeningTest,
  getWritingTask1AdminEntry,
  listWritingTask1Items,
  listWritingTask1Visuals,
  deleteWritingTask1Visual,
  extractWritingTask1QuestionTopic,
  uploadWritingTask1Visual,
  saveWritingTask1Item,
  getWritingTask2AdminEntry,
  listWritingTask2Items,
  getWritingTask2ItemById,
  extractWritingTask2FromImage,
  extractWritingTask2FromText,
  saveWritingTask2Item,
  deleteWritingTask2Item,
  getReadingAdminEntry,
  listReadingPassages,
  listReadingBlocks,
  listReadingTests,
  extractReadingPassageFromImage,
  extractReadingBlockFromImage,
  saveReadingPassage,
  saveReadingBlock,
  saveReadingTest,
  listDailyTaskUnitSources,
  listDailyTaskUnits,
  createDailyTaskUnit,
  updateDailyTaskUnit,
  deleteDailyTaskUnit,
  normalizeReadingPassagePayload,
  normalizeReadingBlockPayload,
  normalizeReadingTestPayload,
  validateReadingPassagePayload,
  validateReadingBlockPayload,
  validateReadingTestPayload,
  buildReadingPassageExtractionPrompt,
  buildReadingBlockExtractionPrompt,
};
