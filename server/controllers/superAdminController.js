const path = require("path");
const mongoose = require("mongoose");
const ListeningAudio = require("../models/listeningAudioModel");
const { sendAudioStreamResponse } = require("../utils/audioStream");

const DEFAULT_SUPER_ADMIN_PASSWORD = "3456";
const DEFAULT_OPENROUTER_MODEL = "google/gemini-2.0-flash-001";

const EXAMPLE_LISTENING_BLOCK = {
  _id: "lc_cmbr_10_1_31-40",
  questionFamily: "gap_fill",
  blockType: "note_completion",
  instruction: {
    text: "Write ONE WORD ONLY for each answer.",
    maxWords: 1,
  },
  display: {
    title: "THE SPIRIT BEAR",
    sections: [
      {
        heading: "General facts",
        items: [
          ["It is a white bear belonging to the black bear family."],
          [
            "Its colour comes from an uncommon ",
            { type: "gap", qid: "q31", number: 31 },
            ".",
          ],
        ],
      },
    ],
  },
  questions: [
    { id: "q31", number: 31, answer: ["gene"] },
  ],
};

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

function toNormalizedAnswerArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }

  const safe = normalizeText(value);
  return safe ? [safe] : [];
}

function normalizeQuestionItem(question, fallbackIndex) {
  const safeId = normalizeText(question?.id || question?.qid || "");
  const numericNumber = Number(question?.number);
  const safeNumber = Number.isFinite(numericNumber) ? numericNumber : fallbackIndex + 1;
  const answer = toNormalizedAnswerArray(question?.answer ?? question?.answers);

  return {
    id: safeId || `q${safeNumber}`,
    number: safeNumber,
    answer,
  };
}

function normalizeListeningBlockPayload(rawBlock = {}) {
  const normalized = {
    _id: normalizeText(rawBlock._id),
    questionFamily: normalizeText(rawBlock.questionFamily).toLowerCase(),
    blockType: normalizeText(rawBlock.blockType).toLowerCase(),
    instruction: {
      text: normalizeText(rawBlock?.instruction?.text),
      maxWords: Number.isFinite(Number(rawBlock?.instruction?.maxWords))
        ? Number(rawBlock.instruction.maxWords)
        : null,
    },
    display: rawBlock?.display && typeof rawBlock.display === "object" ? rawBlock.display : {},
    questions: Array.isArray(rawBlock?.questions)
      ? rawBlock.questions.map((question, index) => normalizeQuestionItem(question, index))
      : [],
  };

  if (
    normalized.display &&
    typeof normalized.display === "object" &&
    Object.prototype.hasOwnProperty.call(normalized.display, "title")
  ) {
    normalized.display.title = normalizeText(normalized.display.title);
  }

  return normalized;
}

function validateListeningBlockPayload(block) {
  const errors = [];
  const safeBlock = block && typeof block === "object" ? block : null;

  if (!safeBlock) {
    return ["Block payload must be a JSON object."];
  }

  if (!normalizeText(safeBlock._id)) {
    errors.push("`_id` is required.");
  }

  if (!normalizeText(safeBlock.questionFamily)) {
    errors.push("`questionFamily` is required.");
  }

  if (!normalizeText(safeBlock.blockType)) {
    errors.push("`blockType` is required.");
  }

  if (!safeBlock.instruction || typeof safeBlock.instruction !== "object") {
    errors.push("`instruction` object is required.");
  } else if (!normalizeText(safeBlock.instruction.text)) {
    errors.push("`instruction.text` is required.");
  }

  if (!safeBlock.display || typeof safeBlock.display !== "object") {
    errors.push("`display` object is required.");
  }

  if (!Array.isArray(safeBlock.questions) || safeBlock.questions.length === 0) {
    errors.push("`questions` must be a non-empty array.");
  } else {
    const seenQuestionIds = new Set();
    safeBlock.questions.forEach((question, index) => {
      const safeId = normalizeText(question?.id);
      const number = Number(question?.number);

      if (!safeId) {
        errors.push(`questions[${index}].id is required.`);
      } else if (seenQuestionIds.has(safeId)) {
        errors.push(`questions[${index}].id '${safeId}' is duplicated.`);
      } else {
        seenQuestionIds.add(safeId);
      }

      if (!Number.isFinite(number)) {
        errors.push(`questions[${index}].number must be numeric.`);
      }
    });
  }

  return errors;
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

function buildExtractionPrompt() {
  return [
    "Digitize the attached IELTS listening block image into JSON.",
    "Return ONLY a valid JSON object. Do not include markdown fences.",
    "Use this structure:",
    JSON.stringify(EXAMPLE_LISTENING_BLOCK),
    "Rules:",
    "- Keep `_id`, `questionFamily`, `blockType`, `instruction`, `display`, `questions`.",
    "- Every question item must include `id`, `number`, and `answer` (array of accepted answers).",
    "- For content with blanks, split text and gap token objects like:",
    '["Text ", {"type":"gap","qid":"q1","number":1}, " tail"]',
  ].join("\n");
}

function stripMarkdownFences(text) {
  const safe = String(text || "").trim();
  if (!safe.startsWith("```")) {
    return safe;
  }

  const lines = safe.split("\n");
  if (lines.length <= 2) {
    return safe.replace(/```json/gi, "").replace(/```/g, "").trim();
  }

  return lines.slice(1, -1).join("\n").trim();
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

    const apiKey = getOpenRouterApiKey();
    if (!apiKey) {
      return res.status(500).json({
        message: "OpenRouter API key is not configured. Set OPENROUTER_API_KEY_V2 in server/.env and restart server.",
      });
    }

    if (typeof fetch !== "function") {
      return res.status(500).json({
        message: "Server runtime does not support fetch(). Use Node.js 18+.",
      });
    }

    const contentTypeHeader = normalizeText(getHeaderValue(req.headers, "content-type"));
    const mimeType = (contentTypeHeader.split(";")[0] || "").trim() || "image/jpeg";
    const imageFileName = normalizeText(getHeaderValue(req.headers, "x-image-filename")) || "pasted-image.jpg";
    const fallbackMimeType = deriveContentTypeFromFileName(imageFileName);
    const effectiveMimeType = mimeType.startsWith("image/") ? mimeType : fallbackMimeType;

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({
        message: "Image payload is missing. Paste or upload an image first.",
      });
    }

    if (!effectiveMimeType.startsWith("image/")) {
      return res.status(400).json({
        message: "Content-Type must be an image type.",
      });
    }

    const model = normalizeText(process.env.OPENROUTER_LISTENING_MODEL) || DEFAULT_OPENROUTER_MODEL;
    const base64Image = Buffer.from(req.body).toString("base64");
    const dataUrl = `data:${effectiveMimeType};base64,${base64Image}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.CLIENT_ORIGIN || "http://localhost:5173",
        "X-Title": "IELTS Super Admin Listening Extractor",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: buildExtractionPrompt(),
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Extract block JSON from this image (${imageFileName}).` },
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
        return res.status(401).json({
          message:
            "OpenRouter authentication failed (401). API key is invalid/revoked or belongs to a deleted account. Update OPENROUTER_API_KEY_V2 in server/.env and restart server.",
          keyPreview: maskApiKey(apiKey),
          raw: responseBody,
        });
      }

      return res.status(response.status).json({
        message: responseBody?.error?.message || responseBody?.message || "OpenRouter extraction failed.",
        raw: responseBody,
      });
    }

    const rawContent = responseBody?.choices?.[0]?.message?.content || "";
    if (!rawContent) {
      return res.status(502).json({
        message: "OpenRouter returned empty content.",
        raw: responseBody,
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(stripMarkdownFences(rawContent));
    } catch {
      return res.status(502).json({
        message: "Extracted content is not valid JSON.",
        rawContent,
      });
    }

    const normalizedBlock = normalizeListeningBlockPayload(parsed);
    const validationErrors = validateListeningBlockPayload(normalizedBlock);

    return res.json({
      message: validationErrors.length > 0
        ? "Block extracted. Please fix validation errors before saving."
        : "Block extracted successfully.",
      model,
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

module.exports = {
  getSuperAdminStatus,
  listListeningAudios,
  uploadListeningAudio,
  streamListeningAudio,
  deleteListeningAudio,
  extractListeningBlockFromImage,
  saveListeningBlock,
};
