import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, FileCheck2, Headphones, Trash2, Upload } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { AdminListSkeleton, LibraryListSkeleton } from "../components/ui/Skeleton";
import { API_BASE_URL, apiRequest } from "../lib/apiClient";
import { parseJsonInput, parseRawFetchResponse } from "../lib/jsonParsing";
import {
  buildListeningStreamUrl,
  buildSuperAdminApiPath,
  buildSuperAdminPagePath,
  deriveAudioIdFromFileName,
  isValidSuperAdminPassword,
} from "../lib/superAdmin";

function formatFileSize(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  const kb = value / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(2)} MB`;
}

function formatTimestamp(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

function validateListeningBlockJson(block) {
  const errors = [];
  const safeBlock = block && typeof block === "object" ? block : null;
  const blockType = String(safeBlock?.blockType || "").trim().toLowerCase();
  const isMultipleChoiceBlock = blockType.startsWith("multiple_choice");
  const isMultipleChoiceMulti = blockType === "multiple_choice_multi";

  if (!safeBlock) {
    return ["Block must be a JSON object."];
  }

  if (!String(safeBlock._id || "").trim()) {
    errors.push("`_id` is required.");
  }

  if (!String(safeBlock.questionFamily || "").trim()) {
    errors.push("`questionFamily` is required.");
  }

  if (!String(safeBlock.blockType || "").trim()) {
    errors.push("`blockType` is required.");
  }

  if (!safeBlock.instruction || typeof safeBlock.instruction !== "object") {
    errors.push("`instruction` object is required.");
  } else {
    if (!String(safeBlock.instruction.text || "").trim()) {
      errors.push("`instruction.text` is required.");
    }

    if (
      isMultipleChoiceBlock &&
      safeBlock.instruction.maxWords !== null &&
      safeBlock.instruction.maxWords !== undefined
    ) {
      errors.push("Remove `instruction.maxWords` for multiple_choice blocks.");
    }

    if (isMultipleChoiceMulti) {
      const correctCount = Number(safeBlock.instruction.correctCount);
      if (!Number.isFinite(correctCount) || correctCount < 2) {
        errors.push("`instruction.correctCount` must be numeric and >= 2 for multiple_choice_multi.");
      }
    }
  }

  if (!safeBlock.display || typeof safeBlock.display !== "object") {
    errors.push("`display` object is required.");
  }

  if (!Array.isArray(safeBlock.questions) || safeBlock.questions.length === 0) {
    errors.push("`questions` must be a non-empty array.");
  }

  if (isMultipleChoiceMulti) {
    const prompt = String(safeBlock?.display?.prompt || "").trim();
    const options = Array.isArray(safeBlock?.display?.options) ? safeBlock.display.options : [];
    const questionNumbers = Array.isArray(safeBlock?.display?.questionNumbers)
      ? safeBlock.display.questionNumbers
      : [];
    const normalizedQuestionNumbers = questionNumbers
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    const uniqueQuestionNumbers = new Set(normalizedQuestionNumbers.map((value) => String(value)));

    if (!prompt) {
      errors.push("`display.prompt` is required for multiple_choice_multi.");
    }

    if (options.length === 0) {
      errors.push("`display.options` must be a non-empty array for multiple_choice_multi.");
    }

    if (normalizedQuestionNumbers.length === 0) {
      errors.push("`display.questionNumbers` must be a non-empty numeric array for multiple_choice_multi.");
    } else if (normalizedQuestionNumbers.length !== questionNumbers.length || uniqueQuestionNumbers.size !== questionNumbers.length) {
      errors.push("`display.questionNumbers` contains invalid or duplicated values.");
    }

    if (Array.isArray(safeBlock.questions) && normalizedQuestionNumbers.length > 0) {
      if (safeBlock.questions.length !== normalizedQuestionNumbers.length) {
        errors.push("`questions` length must match `display.questionNumbers` for multiple_choice_multi.");
      }
    }
  }

  return errors;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function inferListeningTestIdFromBlockId(blockId) {
  const safeBlockId = normalizeText(blockId);
  if (!safeBlockId) {
    return "";
  }

  const match = safeBlockId.match(/^(.*)_\d+-\d+$/);
  if (!match) {
    return "";
  }

  return normalizeText(match[1]);
}

const FIXED_LISTENING_PART_SPECS = [
  { partNumber: 1, start: 1, end: 10 },
  { partNumber: 2, start: 11, end: 20 },
  { partNumber: 3, start: 21, end: 30 },
  { partNumber: 4, start: 31, end: 40 },
];

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getQuestionRangeFromBlockId(blockId) {
  const safeBlockId = normalizeText(blockId);
  if (!safeBlockId) {
    return null;
  }

  const match = safeBlockId.match(/^(.*)_(\d+)-(\d+)$/);
  if (!match) {
    return null;
  }

  const start = toFiniteNumber(match[2]);
  const end = toFiniteNumber(match[3]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    return null;
  }

  return { start, end };
}

function normalizeFixedListeningParts(parts = []) {
  const safeParts = Array.isArray(parts) ? parts : [];
  return FIXED_LISTENING_PART_SPECS.map((spec) => {
    const existingPart = safeParts.find((part) => Number(part?.partNumber) === spec.partNumber);
    const rawBlocks = Array.isArray(existingPart?.blocks) ? existingPart.blocks : [];
    const blocks = rawBlocks
      .map((block, index) => {
        const blockId = normalizeText(block?.blockId);
        if (!blockId) {
          return null;
        }

        const order = Number(block?.order);
        return {
          blockId,
          audioRef: blockId,
          order: Number.isFinite(order) ? order : index + 1,
        };
      })
      .filter(Boolean)
      .sort((left, right) => Number(left?.order || 0) - Number(right?.order || 0))
      .map((block, index) => ({
        ...block,
        order: index + 1,
      }));

    return {
      partNumber: spec.partNumber,
      questionRange: {
        start: spec.start,
        end: spec.end,
      },
      blocks,
    };
  });
}

function normalizeListeningTestToFixedFourParts(test = {}) {
  const source = test && typeof test === "object" ? test : {};
  const parts = normalizeFixedListeningParts(source?.parts);
  return {
    ...source,
    section: "listening",
    totalQuestions: 40,
    parts,
  };
}

function createListeningTestTemplate(seedTestId = "") {
  const safeId = normalizeText(seedTestId) || "lc_cmbr_10_1";
  return {
    _id: safeId,
    title: "Cambridge 10 Test 1 Listening",
    section: "listening",
    module: "academic",
    totalQuestions: 40,
    status: "draft",
    parts: normalizeFixedListeningParts([]),
  };
}

const LISTENING_TEST_MODULES = new Set(["academic", "general", "general_training"]);
const LISTENING_TEST_STATUSES = new Set(["draft", "published"]);

function parseBlockRangeFromId(blockId) {
  const safeBlockId = normalizeText(blockId);
  if (!safeBlockId) {
    return null;
  }

  const match = safeBlockId.match(/^(.*)_(\d+)-(\d+)$/);
  if (!match) {
    return null;
  }

  const start = Number(match[2]);
  const end = Number(match[3]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    return null;
  }

  return {
    testPrefix: normalizeText(match[1]),
    start,
    end,
  };
}

function validateListeningTestJson(test) {
  const errors = [];
  const safeTest = test && typeof test === "object" ? test : null;

  if (!safeTest) {
    return ["Test must be a JSON object."];
  }

  if (!normalizeText(safeTest._id)) {
    errors.push("`_id` is required.");
  }

  if (!normalizeText(safeTest.title)) {
    errors.push("`title` is required.");
  }

  if (normalizeText(safeTest.section).toLowerCase() !== "listening") {
    errors.push("`section` must be 'listening'.");
  }

  const module = normalizeText(safeTest.module).toLowerCase();
  if (!module) {
    errors.push("`module` is required.");
  } else if (!LISTENING_TEST_MODULES.has(module)) {
    errors.push("`module` must be one of: academic, general, general_training.");
  }

  const status = normalizeText(safeTest.status).toLowerCase();
  if (!status) {
    errors.push("`status` is required.");
  } else if (!LISTENING_TEST_STATUSES.has(status)) {
    errors.push("`status` must be one of: draft, published.");
  }

  if (!Number.isFinite(Number(safeTest.totalQuestions))) {
    errors.push("`totalQuestions` must be numeric.");
  }

  if (!Array.isArray(safeTest.parts) || safeTest.parts.length === 0) {
    errors.push("`parts` must be a non-empty array.");
    return errors;
  }

  const safeTestId = normalizeText(safeTest._id);
  const seenPartNumbers = new Set();
  const seenBlockIds = new Set();
  const ranges = [];
  let coveredQuestions = 0;

  safeTest.parts.forEach((part, partIndex) => {
    const partNumber = Number(part?.partNumber);
    const start = Number(part?.questionRange?.start);
    const end = Number(part?.questionRange?.end);
    const blocks = Array.isArray(part?.blocks) ? part.blocks : [];

    if (!Number.isFinite(partNumber)) {
      errors.push(`parts[${partIndex}].partNumber must be numeric.`);
    } else if (seenPartNumbers.has(partNumber)) {
      errors.push(`parts[${partIndex}].partNumber '${partNumber}' is duplicated.`);
    } else {
      seenPartNumbers.add(partNumber);
    }

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      errors.push(`parts[${partIndex}].questionRange.start/end must be numeric.`);
    } else if (start > end) {
      errors.push(`parts[${partIndex}].questionRange.start must be <= end.`);
    } else {
      ranges.push({ start, end, index: partIndex });
      coveredQuestions += end - start + 1;
    }

    if (!Array.isArray(blocks) || blocks.length === 0) {
      errors.push(`parts[${partIndex}].blocks must be a non-empty array.`);
      return;
    }

    const seenOrders = new Set();
    blocks.forEach((blockRef, blockIndex) => {
      const blockId = normalizeText(blockRef?.blockId);
      const audioRef = normalizeText(blockRef?.audioRef);
      const order = Number(blockRef?.order);

      if (!blockId) {
        errors.push(`parts[${partIndex}].blocks[${blockIndex}].blockId is required.`);
      } else if (seenBlockIds.has(blockId)) {
        errors.push(`blockId '${blockId}' is duplicated across parts.`);
      } else {
        seenBlockIds.add(blockId);
      }

      if (!audioRef) {
        errors.push(`parts[${partIndex}].blocks[${blockIndex}].audioRef is required.`);
      } else if (blockId && audioRef !== blockId) {
        errors.push(`audioRef '${audioRef}' must match blockId '${blockId}'.`);
      }

      if (!Number.isFinite(order)) {
        errors.push(`parts[${partIndex}].blocks[${blockIndex}].order must be numeric.`);
      } else if (seenOrders.has(order)) {
        errors.push(`parts[${partIndex}] has duplicated block order '${order}'.`);
      } else {
        seenOrders.add(order);
      }

      if (blockId) {
        const blockRange = parseBlockRangeFromId(blockId);
        if (!blockRange) {
          errors.push(
            `parts[${partIndex}].blocks[${blockIndex}].blockId '${blockId}' must follow '<testId>_<start>-<end>'.`,
          );
        } else {
          if (safeTestId && blockRange.testPrefix !== safeTestId) {
            errors.push(`blockId '${blockId}' must start with '${safeTestId}_'.`);
          }
          if (Number.isFinite(start) && Number.isFinite(end)) {
            if (blockRange.start < start || blockRange.end > end) {
              errors.push(
                `blockId '${blockId}' range ${blockRange.start}-${blockRange.end} must stay within part range ${start}-${end}.`,
              );
            }
          }
        }
      }
    });
  });

  const sortedRanges = ranges.sort((left, right) => left.start - right.start);
  for (let index = 1; index < sortedRanges.length; index += 1) {
    const previous = sortedRanges[index - 1];
    const current = sortedRanges[index];
    if (current.start <= previous.end) {
      errors.push(
        `questionRange overlap between parts[${previous.index}] and parts[${current.index}].`,
      );
    }
  }

  if (Number.isFinite(Number(safeTest.totalQuestions)) && Number(safeTest.totalQuestions) !== coveredQuestions) {
    errors.push(
      `totalQuestions (${Number(safeTest.totalQuestions)}) does not match covered ranges (${coveredQuestions}).`,
    );
  }

  return errors;
}

function SuperAdminListeningPage() {
  const { password = "" } = useParams();
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const [audioFile, setAudioFile] = useState(null);
  const [blockImageFile, setBlockImageFile] = useState(null);
  const [blockImagePreviewUrl, setBlockImagePreviewUrl] = useState("");
  const [blockJsonText, setBlockJsonText] = useState("");
  const [blockValidationErrors, setBlockValidationErrors] = useState([]);
  const [testJsonText, setTestJsonText] = useState("");
  const [testValidationErrors, setTestValidationErrors] = useState([]);
  const [audios, setAudios] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [tests, setTests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(true);
  const [isLoadingTests, setIsLoadingTests] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtractingBlock, setIsExtractingBlock] = useState(false);
  const [isSavingBlock, setIsSavingBlock] = useState(false);
  const [isSavingTest, setIsSavingTest] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [selectedTestId, setSelectedTestId] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [blockFeedbackMessage, setBlockFeedbackMessage] = useState("");
  const [blockErrorMessage, setBlockErrorMessage] = useState("");
  const [testFeedbackMessage, setTestFeedbackMessage] = useState("");
  const [testErrorMessage, setTestErrorMessage] = useState("");
  const [testBlockPartNumber, setTestBlockPartNumber] = useState("1");
  const [testBlockId, setTestBlockId] = useState("");

  const isPasswordValid = isValidSuperAdminPassword(password);
  const uploadPreviewId = useMemo(
    () => (audioFile ? deriveAudioIdFromFileName(audioFile.name) : ""),
    [audioFile],
  );
  const blockIds = useMemo(
    () =>
      blocks
        .map((block) => normalizeText(block?._id))
        .filter(Boolean),
    [blocks],
  );
  const testPartNumbers = useMemo(
    () => FIXED_LISTENING_PART_SPECS.map((item) => item.partNumber),
    [],
  );
  const blockIdsForSelectedPart = useMemo(() => {
    const selectedPartNumber = Number(testBlockPartNumber);
    const selectedPartSpec = FIXED_LISTENING_PART_SPECS.find(
      (item) => item.partNumber === selectedPartNumber,
    );
    if (!selectedPartSpec) {
      return blockIds;
    }

    return blockIds.filter((blockId) => {
      const range = getQuestionRangeFromBlockId(blockId);
      if (!range) {
        return true;
      }

      return range.start >= selectedPartSpec.start && range.end <= selectedPartSpec.end;
    });
  }, [blockIds, testBlockPartNumber]);

  useEffect(() => {
    if (!blockImageFile) {
      setBlockImagePreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(blockImageFile);
    setBlockImagePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [blockImageFile]);

  const loadAudios = useCallback(async () => {
    if (!isPasswordValid) {
      return;
    }

    setIsLoading(true);
    setIsLoadingBlocks(true);
    setIsLoadingTests(true);
    setErrorMessage("");

    try {
      const [audiosData, blocksData, testsData] = await Promise.all([
        apiRequest(buildSuperAdminApiPath(password, "/listening"), {
          auth: false,
        }),
        apiRequest(buildSuperAdminApiPath(password, "/listening/blocks"), {
          auth: false,
        }),
        apiRequest(buildSuperAdminApiPath(password, "/listening/tests"), {
          auth: false,
        }),
      ]);
      setAudios(Array.isArray(audiosData?.audios) ? audiosData.audios : []);
      setBlocks(Array.isArray(blocksData?.blocks) ? blocksData.blocks : []);
      setTests(Array.isArray(testsData?.tests) ? testsData.tests : []);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load listening manager data.");
    } finally {
      setIsLoading(false);
      setIsLoadingBlocks(false);
      setIsLoadingTests(false);
    }
  }, [isPasswordValid, password]);

  useEffect(() => {
    loadAudios();
  }, [loadAudios]);

  async function handleUpload(event) {
    event.preventDefault();

    if (!audioFile) {
      setErrorMessage("Select an audio file first.");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");
    setFeedbackMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}${buildSuperAdminApiPath(password, "/listening")}`, {
        method: "POST",
        headers: {
          "Content-Type": audioFile.type || "audio/mpeg",
          "X-Audio-Filename": audioFile.name,
        },
        body: audioFile,
      });

      const responseBody = await parseRawFetchResponse(response);
      if (!response.ok) {
        throw new Error(responseBody?.message || "Audio upload failed.");
      }

      setFeedbackMessage(responseBody?.message || "Audio uploaded.");
      setAudioFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await loadAudios();
    } catch (error) {
      setErrorMessage(error.message || "Audio upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(audioId) {
    setIsDeletingId(audioId);
    setErrorMessage("");
    setFeedbackMessage("");

    try {
      const path = `${buildSuperAdminApiPath(password, "/listening")}/${encodeURIComponent(audioId)}`;
      const response = await apiRequest(path, {
        method: "DELETE",
        auth: false,
      });

      setFeedbackMessage(response?.message || `Listening audio '${audioId}' deleted.`);
      await loadAudios();
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete listening audio.");
    } finally {
      setIsDeletingId("");
    }
  }

  function setPastedImageFile(nextFile) {
    setBlockImageFile(nextFile || null);
    setBlockFeedbackMessage("");
    setBlockErrorMessage("");
  }

  function handleBlockImagePaste(event) {
    const clipboardItems = Array.from(event.clipboardData?.items || []);
    const imageItem = clipboardItems.find((item) => String(item.type || "").startsWith("image/"));
    if (!imageItem) {
      return;
    }

    event.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) {
      return;
    }

    const fileName = file.name || `pasted-${Date.now()}.png`;
    const pastedImageFile = new File([file], fileName, {
      type: file.type || "image/png",
    });
    setPastedImageFile(pastedImageFile);
  }

  async function handleExtractBlockFromImage() {
    if (!blockImageFile) {
      setBlockErrorMessage("Paste or upload a listening block image first.");
      return;
    }

    setIsExtractingBlock(true);
    setBlockErrorMessage("");
    setBlockFeedbackMessage("");
    setBlockValidationErrors([]);

    try {
      const extractPath = buildSuperAdminApiPath(password, "/listening/blocks/extract");
      const response = await fetch(`${API_BASE_URL}${extractPath}`, {
        method: "POST",
        headers: {
          "Content-Type": blockImageFile.type || "image/png",
          "X-Image-Filename": blockImageFile.name || `pasted-${Date.now()}.png`,
        },
        body: blockImageFile,
      });

      const responseBody = await parseRawFetchResponse(response);
      if (!response.ok) {
        throw new Error(responseBody?.message || "Failed to extract block JSON from image.");
      }

      const extractedBlock = responseBody?.block || null;
      if (!extractedBlock || typeof extractedBlock !== "object") {
        throw new Error("Extraction succeeded but returned an empty block.");
      }

      setBlockJsonText(JSON.stringify(extractedBlock, null, 2));

      const validationErrors = Array.isArray(responseBody?.validation?.errors)
        ? responseBody.validation.errors
        : [];
      setBlockValidationErrors(validationErrors);

      if (validationErrors.length > 0) {
        setBlockFeedbackMessage("Extracted. Fix validation issues before saving.");
      } else {
        setBlockFeedbackMessage(responseBody?.message || "Listening block extracted successfully.");
      }
    } catch (error) {
      setBlockErrorMessage(error.message || "Failed to extract block JSON.");
    } finally {
      setIsExtractingBlock(false);
    }
  }

  function handleValidateBlockJson() {
    setBlockErrorMessage("");
    setBlockFeedbackMessage("");

    const parsed = parseJsonInput(blockJsonText);
    if (!parsed.ok) {
      setBlockValidationErrors([`JSON parse error: ${parsed.error}`]);
      return;
    }

    const validationErrors = validateListeningBlockJson(parsed.value);
    setBlockValidationErrors(validationErrors);
    if (validationErrors.length > 0) {
      setBlockFeedbackMessage("JSON is loaded, but some required fields are missing.");
      return;
    }

    setBlockFeedbackMessage("JSON looks valid. You can save it to `listening_blocks`.");
  }

  async function handleSaveBlockJson() {
    setBlockErrorMessage("");
    setBlockFeedbackMessage("");

    const parsed = parseJsonInput(blockJsonText);
    if (!parsed.ok) {
      setBlockValidationErrors([`JSON parse error: ${parsed.error}`]);
      return;
    }

    const validationErrors = validateListeningBlockJson(parsed.value);
    setBlockValidationErrors(validationErrors);
    if (validationErrors.length > 0) {
      setBlockErrorMessage("Cannot save. Fix validation errors first.");
      return;
    }

    setIsSavingBlock(true);

    try {
      const savePath = buildSuperAdminApiPath(password, "/listening/blocks");
      const response = await apiRequest(savePath, {
        method: "POST",
        body: {
          block: parsed.value,
        },
        auth: false,
      });

      const blockId = response?.block?._id || parsed.value?._id;
      setSelectedBlockId(String(blockId || ""));
      setBlockFeedbackMessage(response?.message || `Listening block '${blockId}' saved.`);
      await loadAudios();
    } catch (error) {
      setBlockErrorMessage(error.message || "Failed to save listening block.");
    } finally {
      setIsSavingBlock(false);
    }
  }

  function handleLoadSavedBlock(block) {
    if (!block || typeof block !== "object") {
      return;
    }

    const blockId = String(block._id || "").trim();
    setSelectedBlockId(blockId);
    setTestBlockId(blockId);
    setBlockJsonText(JSON.stringify(block, null, 2));
    setBlockValidationErrors([]);
    setBlockErrorMessage("");
    setBlockFeedbackMessage(blockId ? `Loaded block '${blockId}' into editor.` : "Loaded block into editor.");
  }

  function getWorkingListeningTestDraft() {
    const parsed = parseJsonInput(testJsonText);
    if (!parsed.ok || !parsed.value || typeof parsed.value !== "object") {
      return {
        ok: false,
        error: parsed.ok ? "Test JSON must be an object." : parsed.error,
      };
    }

    return {
      ok: true,
      value: normalizeListeningTestToFixedFourParts(parsed.value),
    };
  }

  function handleCreateTestTemplate() {
    const inferredTestId = inferListeningTestIdFromBlockId(selectedBlockId);
    const template = createListeningTestTemplate(inferredTestId);
    setTestJsonText(JSON.stringify(template, null, 2));
    setTestBlockPartNumber("1");
    setTestBlockId("");
    setTestValidationErrors([]);
    setTestErrorMessage("");
    setTestFeedbackMessage("Listening test template loaded.");
  }

  function handleValidateTestJson() {
    setTestErrorMessage("");
    setTestFeedbackMessage("");

    const parsed = parseJsonInput(testJsonText);
    if (!parsed.ok) {
      setTestValidationErrors([`JSON parse error: ${parsed.error}`]);
      return;
    }

    const normalizedTest = normalizeListeningTestToFixedFourParts(parsed.value);
    const validationErrors = validateListeningTestJson(normalizedTest);
    setTestValidationErrors(validationErrors);
    if (validationErrors.length > 0) {
      setTestFeedbackMessage("JSON is loaded, but some required fields are missing.");
      return;
    }

    setTestJsonText(JSON.stringify(normalizedTest, null, 2));
    setTestFeedbackMessage("Listening test JSON looks valid. You can save it to `listening_tests`.");
  }

  async function handleSaveTestJson() {
    setTestErrorMessage("");
    setTestFeedbackMessage("");

    const parsed = parseJsonInput(testJsonText);
    if (!parsed.ok) {
      setTestValidationErrors([`JSON parse error: ${parsed.error}`]);
      return;
    }

    const normalizedTest = normalizeListeningTestToFixedFourParts(parsed.value);
    const validationErrors = validateListeningTestJson(normalizedTest);
    setTestValidationErrors(validationErrors);
    if (validationErrors.length > 0) {
      setTestErrorMessage("Cannot save. Fix validation errors first.");
      return;
    }

    setIsSavingTest(true);
    try {
      const savePath = buildSuperAdminApiPath(password, "/listening/tests");
      const response = await apiRequest(savePath, {
        method: "POST",
        body: {
          test: normalizedTest,
        },
        auth: false,
      });

      const testId = response?.test?._id || normalizedTest?._id;
      setSelectedTestId(String(testId || ""));
      setTestJsonText(JSON.stringify(normalizedTest, null, 2));
      setTestFeedbackMessage(response?.message || `Listening test '${testId}' saved.`);
      await loadAudios();
    } catch (error) {
      setTestErrorMessage(error.message || "Failed to save listening test.");
    } finally {
      setIsSavingTest(false);
    }
  }

  function handleLoadSavedTest(test) {
    if (!test || typeof test !== "object") {
      return;
    }

    const testId = normalizeText(test?._id);
    const normalizedTest = normalizeListeningTestToFixedFourParts(test);
    setSelectedTestId(testId);
    setTestJsonText(JSON.stringify(normalizedTest, null, 2));
    setTestBlockPartNumber("1");
    setTestBlockId("");
    setTestValidationErrors([]);
    setTestErrorMessage("");
    setTestFeedbackMessage(testId ? `Loaded test '${testId}' into editor.` : "Loaded test into editor.");
  }

  function handleAddBlockRefToTestJson() {
    setTestErrorMessage("");
    setTestFeedbackMessage("");

    const draft = getWorkingListeningTestDraft();
    if (!draft.ok) {
      setTestErrorMessage(`JSON parse error: ${draft.error}`);
      return;
    }

    const partNumber = Number(testBlockPartNumber);
    const blockId = normalizeText(testBlockId);
    const audioRef = blockId;
    if (!Number.isFinite(partNumber)) {
      setTestErrorMessage("Part number must be numeric.");
      return;
    }

    if (!blockId) {
      setTestErrorMessage("BlockId is required.");
      return;
    }

    const nextTest = { ...draft.value };
    nextTest.section = "listening";
    nextTest.parts = normalizeFixedListeningParts(nextTest.parts);
    const partIndex = nextTest.parts.findIndex((part) => Number(part?.partNumber) === partNumber);
    if (partIndex < 0) {
      setTestErrorMessage(`Part ${partNumber} is not present in current test JSON.`);
      return;
    }

    const part = {
      ...nextTest.parts[partIndex],
      blocks: Array.isArray(nextTest.parts[partIndex]?.blocks)
        ? [...nextTest.parts[partIndex].blocks]
        : [],
    };
    const existingBlockIndex = part.blocks.findIndex((item) => normalizeText(item?.blockId) === blockId);
    if (existingBlockIndex >= 0) {
      part.blocks[existingBlockIndex] = {
        ...part.blocks[existingBlockIndex],
        audioRef,
      };
    } else {
      const maxOrder = part.blocks.reduce((max, item) => {
        const order = Number(item?.order);
        return Number.isFinite(order) ? Math.max(max, order) : max;
      }, 0);
      part.blocks.push({
        blockId,
        audioRef,
        order: maxOrder + 1,
      });
    }

    part.blocks.sort((left, right) => Number(left?.order || 0) - Number(right?.order || 0));
    nextTest.parts[partIndex] = part;
    nextTest.totalQuestions = 40;
    setTestJsonText(JSON.stringify(nextTest, null, 2));
  }

  if (!isPasswordValid) {
    return (
      <section className="min-h-screen bg-[#f5f1ea] px-4 py-20 sm:px-8">
        <div className="mx-auto max-w-3xl border border-slate-200/80 bg-white p-10 text-center shadow-[0_30px_90px_-52px_rgba(15,23,42,0.34)]">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
            Super Admin
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
            Access denied
          </h1>
          <p className="mt-4 text-slate-600">The password in this URL is not valid.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#f5f1ea] px-4 py-14 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Super Admin
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
              Listening Tests Manager
            </h1>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            to={buildSuperAdminPagePath(password)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        <article className="border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)]">
          <div className="inline-flex items-center gap-2 text-emerald-700">
            <Upload className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">Upload audio</span>
          </div>

          <form className="mt-4 space-y-4" onSubmit={handleUpload}>
            <input
              accept="audio/*"
              className="block w-full cursor-pointer border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm text-slate-700 file:mr-3 file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-700"
              onChange={(event) => setAudioFile(event.target.files?.[0] || null)}
              ref={fileInputRef}
              type="file"
            />

            {audioFile ? (
              <div className="border border-emerald-200/80 bg-emerald-50/60 px-4 py-3 text-sm text-slate-700">
                <p>
                  <span className="font-semibold">File:</span> {audioFile.name}
                </p>
                <p className="mt-1">
                  <span className="font-semibold">ID in `listening_audios`:</span>{" "}
                  {uploadPreviewId || "(invalid filename)"}
                </p>
                <p className="mt-1">
                  <span className="font-semibold">Size:</span> {formatFileSize(audioFile.size)}
                </p>
              </div>
            ) : null}

            <button
              className="emerald-gradient-fill inline-flex items-center gap-2 rounded-full border border-emerald-300/20 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] disabled:cursor-not-allowed disabled:opacity-55"
              disabled={isUploading || !audioFile || !uploadPreviewId}
              type="submit"
            >
              <Upload className="h-4 w-4" />
              {isUploading ? "Uploading..." : "Upload to base"}
            </button>
          </form>
        </article>

        <article className="border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)]">
          <div className="inline-flex items-center gap-2 text-emerald-700">
            <Upload className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              Listening block from image
            </span>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[320px_1fr]">
            <div className="space-y-3">
              <div
                className="min-h-[210px] border border-dashed border-slate-300 bg-slate-50/70 p-3 text-sm text-slate-600"
                onPaste={handleBlockImagePaste}
                role="button"
                tabIndex={0}
              >
                {blockImagePreviewUrl ? (
                  <img
                    alt="Listening block preview"
                    className="h-full max-h-[300px] w-full object-contain"
                    src={blockImagePreviewUrl}
                  />
                ) : (
                  <div className="flex h-full min-h-[180px] items-center justify-center text-center">
                    <p>
                      Paste image here (Ctrl+V) or upload below.
                    </p>
                  </div>
                )}
              </div>

              <input
                accept="image/*"
                className="block w-full cursor-pointer border border-slate-200/80 bg-slate-50 px-3 py-2 text-sm text-slate-700 file:mr-3 file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-700"
                onChange={(event) => setPastedImageFile(event.target.files?.[0] || null)}
                ref={imageInputRef}
                type="file"
              />

              <button
                className="emerald-gradient-fill inline-flex items-center justify-center rounded-full border border-emerald-300/20 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] disabled:cursor-not-allowed disabled:opacity-55"
                disabled={isExtractingBlock || !blockImageFile}
                onClick={handleExtractBlockFromImage}
                type="button"
              >
                {isExtractingBlock ? "Extracting..." : "Extract JSON from image"}
              </button>
            </div>

            <div className="space-y-3">
              <textarea
                className="h-[320px] w-full border border-slate-200/80 bg-slate-50/60 p-3 font-mono text-xs leading-6 text-slate-800 outline-none focus:border-emerald-400"
                onChange={(event) => setBlockJsonText(event.target.value)}
                placeholder="Extracted listening block JSON will appear here. You can edit before saving."
                spellCheck={false}
                value={blockJsonText}
              />

              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-slate-50"
                  onClick={handleValidateBlockJson}
                  type="button"
                >
                  Validate JSON
                </button>
                <button
                  className="emerald-gradient-fill inline-flex items-center justify-center rounded-full border border-emerald-300/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={isSavingBlock || !blockJsonText.trim()}
                  onClick={handleSaveBlockJson}
                  type="button"
                >
                  {isSavingBlock ? "Saving..." : "Save to listening_blocks"}
                </button>
              </div>

              {blockValidationErrors.length > 0 ? (
                <div className="border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <p className="font-semibold uppercase tracking-[0.12em]">Validation issues</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {blockValidationErrors.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </article>

        <article className="border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)]">
          <div className="mb-4 inline-flex items-center gap-2 text-emerald-700">
            <Headphones className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              listening_blocks collection
            </span>
          </div>

          {isLoadingBlocks ? <LibraryListSkeleton count={4} /> : null}

          {!isLoadingBlocks && blocks.length === 0 ? (
            <p className="text-sm text-slate-600">
              No listening blocks pushed yet. Save a block above to create your first record.
            </p>
          ) : null}

          {!isLoadingBlocks && blocks.length > 0 ? (
            <div className="space-y-2">
              {blocks.map((block, index) => {
                const blockId = String(block?._id || "");
                const isSelected = selectedBlockId && selectedBlockId === blockId;
                const instructionText = String(block?.instruction?.text || "").trim();
                return (
                  <button
                    className={`w-full border px-3 py-2 text-left transition ${
                      isSelected
                        ? "border-emerald-300 bg-emerald-50/70"
                        : "border-slate-200 bg-slate-50/45 hover:bg-slate-100"
                    }`}
                    key={blockId || `listening-block-${index}`}
                    onClick={() => handleLoadSavedBlock(block)}
                    type="button"
                  >
                    <p className="font-mono text-xs text-slate-800">{blockId || "(missing _id)"}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {String(block?.questionFamily || "-")} | {String(block?.blockType || "-")} | Questions:{" "}
                      {Array.isArray(block?.questions) ? block.questions.length : 0}
                    </p>
                    {instructionText ? (
                      <p className="mt-1 text-xs text-slate-500">{instructionText}</p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </article>

        <article className="border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)]">
          <div className="mb-4 inline-flex items-center gap-2 text-emerald-700">
            <FileCheck2 className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              listening_tests collection
            </span>
          </div>

          {isLoadingTests ? <LibraryListSkeleton count={4} /> : null}

          {!isLoadingTests && tests.length === 0 ? (
            <p className="text-sm text-slate-600">
              No listening tests saved yet. Build one in the editor below and save it to `listening_tests`.
            </p>
          ) : null}

          {!isLoadingTests && tests.length > 0 ? (
            <div className="space-y-2">
              {tests.map((test, index) => {
                const testId = normalizeText(test?._id);
                const isSelected = testId && selectedTestId === testId;
                return (
                  <button
                    className={`w-full border px-3 py-2 text-left transition ${
                      isSelected
                        ? "border-emerald-300 bg-emerald-50/70"
                        : "border-slate-200 bg-slate-50/45 hover:bg-slate-100"
                    }`}
                    key={testId || `listening-test-${index}`}
                    onClick={() => handleLoadSavedTest(test)}
                    type="button"
                  >
                    <p className="font-mono text-xs text-slate-800">{testId || "(missing _id)"}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {String(test?.title || "-")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Module: {String(test?.module || "-")} | Status: {String(test?.status || "-")} | Questions:{" "}
                      {Number(test?.totalQuestions || 0)}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : null}
        </article>

        <article className="border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)]">
          <div className="inline-flex items-center gap-2 text-emerald-700">
            <FileCheck2 className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              Full Listening Test Builder
            </span>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[360px_1fr]">
            <div className="space-y-4">
              <div className="space-y-2 border border-slate-200/80 bg-slate-50/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Quick Actions
                </p>
                <button
                  className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-slate-50"
                  onClick={handleCreateTestTemplate}
                  type="button"
                >
                  Create Test Template
                </button>
                <p className="text-[11px] leading-5 text-slate-500">
                  Uses selected block id to infer test prefix when possible (example: `lc_cmbr_10_1`).
                </p>
              </div>

              <div className="space-y-2 border border-slate-200/80 bg-slate-50/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Fixed Parts
                </p>
                <p className="text-xs text-slate-600">Part 1: Questions 1-10</p>
                <p className="text-xs text-slate-600">Part 2: Questions 11-20</p>
                <p className="text-xs text-slate-600">Part 3: Questions 21-30</p>
                <p className="text-xs text-slate-600">Part 4: Questions 31-40</p>
              </div>

              <div className="space-y-2 border border-slate-200/80 bg-slate-50/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Add Block Ref
                </p>
                <select
                  className="w-full border border-slate-200 bg-white px-3 py-2 text-sm"
                  onChange={(event) => setTestBlockPartNumber(event.target.value)}
                  value={testBlockPartNumber}
                >
                  <option value="">Select part</option>
                  {testPartNumbers.map((partNumber) => (
                    <option key={partNumber} value={partNumber}>
                      Part {partNumber}
                    </option>
                  ))}
                </select>
                <select
                  className="w-full border border-slate-200 bg-white px-3 py-2 text-sm"
                  onChange={(event) => {
                    const nextBlockId = event.target.value;
                    setTestBlockId(nextBlockId);
                  }}
                  value={testBlockId}
                >
                  <option value="">Block id</option>
                  {blockIdsForSelectedPart.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
                <button
                  className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-slate-50"
                  onClick={handleAddBlockRefToTestJson}
                  type="button"
                >
                  Add Or Update Block
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <textarea
                className="h-[360px] w-full border border-slate-200/80 bg-slate-50/60 p-3 font-mono text-xs leading-6 text-slate-800 outline-none focus:border-emerald-400"
                onChange={(event) => setTestJsonText(event.target.value)}
                placeholder="Listening full test JSON will appear here."
                spellCheck={false}
                value={testJsonText}
              />

              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-slate-50"
                  onClick={handleValidateTestJson}
                  type="button"
                >
                  Validate JSON
                </button>
                <button
                  className="emerald-gradient-fill inline-flex items-center justify-center rounded-full border border-emerald-300/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={isSavingTest || !testJsonText.trim()}
                  onClick={handleSaveTestJson}
                  type="button"
                >
                  {isSavingTest ? "Saving..." : "Save to listening_tests"}
                </button>
              </div>

              {testValidationErrors.length > 0 ? (
                <div className="border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <p className="font-semibold uppercase tracking-[0.12em]">Validation issues</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {testValidationErrors.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </article>

        {feedbackMessage ? (
          <div className="border border-emerald-200/80 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {feedbackMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="border border-rose-200/80 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {errorMessage}
          </div>
        ) : null}

        {blockFeedbackMessage ? (
          <div className="border border-emerald-200/80 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {blockFeedbackMessage}
          </div>
        ) : null}

        {blockErrorMessage ? (
          <div className="border border-rose-200/80 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {blockErrorMessage}
          </div>
        ) : null}

        {testFeedbackMessage ? (
          <div className="border border-emerald-200/80 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {testFeedbackMessage}
          </div>
        ) : null}

        {testErrorMessage ? (
          <div className="border border-rose-200/80 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {testErrorMessage}
          </div>
        ) : null}

        <article className="border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)]">
          <div className="mb-4 inline-flex items-center gap-2 text-emerald-700">
            <Headphones className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              listening_audios collection
            </span>
          </div>

          {isLoading ? <AdminListSkeleton rows={4} /> : null}

          {!isLoading && audios.length === 0 ? (
            <p className="text-sm text-slate-600">
              No listening audio uploaded yet. Upload one above to create your first record.
            </p>
          ) : null}

          {!isLoading && audios.length > 0 ? (
            <div className="space-y-4">
              {audios.map((audio) => (
                <article
                  className="border border-slate-200/80 bg-slate-50/45 p-4"
                  key={audio._id}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-slate-900">
                        ID: <span className="font-mono">{audio._id}</span>
                      </p>
                      <p className="text-sm text-slate-600">File: {audio.originalFileName}</p>
                      <p className="text-xs text-slate-500">
                        {audio.mimeType} | {formatFileSize(audio.fileSizeBytes)} | Added{" "}
                        {formatTimestamp(audio.createdAt)}
                      </p>
                    </div>

                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-55"
                      disabled={isDeletingId === audio._id}
                      onClick={() => handleDelete(audio._id)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                      {isDeletingId === audio._id ? "Deleting..." : "Delete"}
                    </button>
                  </div>

                  <audio className="mt-4 w-full" controls preload="none">
                    <source src={buildListeningStreamUrl(password, audio._id)} type={audio.mimeType} />
                    Your browser does not support audio playback.
                  </audio>
                </article>
              ))}
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}

export default SuperAdminListeningPage;
