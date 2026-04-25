const mongoose = require("mongoose");
const BLOCK_RANGE_ID_PATTERN = /^(.*)_(\d+)-(\d+)$/;

function normalizeValue(value) {
  return String(value || "").trim();
}

function parseBlockRangeFromId(blockId) {
  const safeBlockId = normalizeValue(blockId);
  if (!safeBlockId) {
    return null;
  }

  const match = safeBlockId.match(BLOCK_RANGE_ID_PATTERN);
  if (!match) {
    return null;
  }

  const start = Number.parseInt(match[2], 10);
  const end = Number.parseInt(match[3], 10);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    return null;
  }

  return {
    testPrefix: normalizeValue(match[1]),
    start,
    end,
  };
}

const questionRangeSchema = new mongoose.Schema(
  {
    start: { type: Number, required: true },
    end: { type: Number, required: true },
  },
  { _id: false },
);

const partBlockSchema = new mongoose.Schema(
  {
    blockId: { type: String, required: true, trim: true },
    audioRef: { type: String, default: "", trim: true },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const partSchema = new mongoose.Schema(
  {
    partNumber: { type: Number, required: true },
    questionRange: { type: questionRangeSchema, required: true },
    blocks: { type: [partBlockSchema], default: [] },
  },
  { _id: false },
);

const listeningTestSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true },
    module: { type: String, default: "", trim: true },
    totalQuestions: { type: Number, default: 0 },
    status: { type: String, default: "draft", trim: true, index: true },
    parts: { type: [partSchema], default: [] },
  },
  {
    collection: "listening_tests",
    versionKey: false,
  },
);

listeningTestSchema.pre("validate", function validateListeningArchitecture() {
  const testId = normalizeValue(this._id);
  const seenBlockIds = new Set();
  const ranges = [];

  const safeParts = Array.isArray(this.parts) ? this.parts : [];
  safeParts.forEach((part, partIndex) => {
    const safeBlocks = Array.isArray(part?.blocks) ? part.blocks : [];
    const partRangeStart = Number(part?.questionRange?.start);
    const partRangeEnd = Number(part?.questionRange?.end);
    const hasPartRange = Number.isFinite(partRangeStart) && Number.isFinite(partRangeEnd);
    if (hasPartRange && partRangeStart > partRangeEnd) {
      this.invalidate(
        `parts.${partIndex}.questionRange.start`,
        `part ${partIndex + 1} has questionRange.start > questionRange.end.`,
      );
    }

    safeBlocks.forEach((block, blockIndex) => {
      const blockId = normalizeValue(block?.blockId);
      const blockPath = `parts.${partIndex}.blocks.${blockIndex}.blockId`;
      const audioRefPath = `parts.${partIndex}.blocks.${blockIndex}.audioRef`;

      if (!blockId) {
        this.invalidate(blockPath, "blockId is required.");
        return;
      }

      if (seenBlockIds.has(blockId)) {
        this.invalidate(blockPath, `duplicate blockId '${blockId}' detected in listening test.`);
      } else {
        seenBlockIds.add(blockId);
      }

      const parsedRange = parseBlockRangeFromId(blockId);
      if (!parsedRange) {
        this.invalidate(
          blockPath,
          `blockId '${blockId}' must follow '<listening_test_id>_<start>-<end>' format.`,
        );
        return;
      }

      if (parsedRange.testPrefix !== testId) {
        this.invalidate(
          blockPath,
          `blockId '${blockId}' must start with '${testId}_' to match listening test id.`,
        );
      }

      const audioRef = normalizeValue(block?.audioRef);
      if (audioRef && audioRef !== blockId) {
        this.invalidate(
          audioRefPath,
          `audioRef '${audioRef}' must exactly match blockId '${blockId}'.`,
        );
      }

      if (hasPartRange) {
        if (parsedRange.start < partRangeStart || parsedRange.end > partRangeEnd) {
          this.invalidate(
            blockPath,
            `block range ${parsedRange.start}-${parsedRange.end} falls outside part questionRange ${partRangeStart}-${partRangeEnd}.`,
          );
        }
      }

      ranges.push({
        path: blockPath,
        start: parsedRange.start,
        end: parsedRange.end,
      });
    });
  });

  const sortedRanges = ranges.sort((left, right) => {
    if (left.start !== right.start) {
      return left.start - right.start;
    }

    return left.end - right.end;
  });

  for (let index = 1; index < sortedRanges.length; index += 1) {
    const previous = sortedRanges[index - 1];
    const current = sortedRanges[index];
    if (current.start <= previous.end) {
      this.invalidate(
        current.path,
        `block range ${current.start}-${current.end} overlaps with ${previous.start}-${previous.end}.`,
      );
    }
  }

});

module.exports = mongoose.model("ListeningTest", listeningTestSchema);
