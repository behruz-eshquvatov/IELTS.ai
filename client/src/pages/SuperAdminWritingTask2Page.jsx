import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileCheck2, PenLine, Trash2, Upload, Wand2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { LibraryListSkeleton } from "../components/ui/Skeleton";
import { apiRequest } from "../lib/apiClient";
import { buildSuperAdminApiPath, buildSuperAdminPagePath, isValidSuperAdminPassword } from "../lib/superAdmin";
import { extractSuperAdminFromImage } from "../services/superAdminService";

const DEFAULT_ESSAY_TYPES = [
  "opinion",
  "discussion",
  "advantages_disadvantages",
  "problem_solution",
  "direct_question",
  "two_part_question",
  "unknown",
];
const ITEM_STATUSES = ["draft", "published"];

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeEnum(value) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, "_");
}

function toReadableLabel(value) {
  return normalizeText(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toNumber(value, fallback = 250) {
  const numeric = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(numeric) || numeric < 1) {
    return fallback;
  }

  return numeric;
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

function SuperAdminWritingTask2Page() {
  const { password = "" } = useParams();
  const isPasswordValid = isValidSuperAdminPassword(password);

  const [sourceImageFile, setSourceImageFile] = useState(null);
  const [sourceImagePreviewUrl, setSourceImagePreviewUrl] = useState("");
  const [sourceText, setSourceText] = useState("");

  const [questionTopic, setQuestionTopic] = useState("");
  const [essayType, setEssayType] = useState("opinion");
  const [instructionText, setInstructionText] = useState("Write at around 250 words.");
  const [instructionMinWords, setInstructionMinWords] = useState("250");
  const [status, setStatus] = useState("draft");
  const [source, setSource] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");

  const [items, setItems] = useState([]);
  const [essayTypes, setEssayTypes] = useState(DEFAULT_ESSAY_TYPES);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isExtractingFromImage, setIsExtractingFromImage] = useState(false);
  const [isExtractingFromText, setIsExtractingFromText] = useState(false);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [isDeletingItemId, setIsDeletingItemId] = useState("");

  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!sourceImageFile) {
      setSourceImagePreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(sourceImageFile);
    setSourceImagePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [sourceImageFile]);

  const applyExtractedItem = useCallback((item) => {
    if (!item || typeof item !== "object") {
      return;
    }

    setQuestionTopic(normalizeText(item.questionTopic));
    setEssayType(normalizeEnum(item.essayType) || "unknown");
    setInstructionText(normalizeText(item?.instruction?.text) || "Write at around 250 words.");
    setInstructionMinWords(String(toNumber(item?.instruction?.minWords, 250)));
    setStatus(normalizeEnum(item.status) || "draft");
    setSource(normalizeText(item.source));
    setDifficulty(normalizeText(item.difficulty));

    if (Array.isArray(item.tags)) {
      setTagsInput(item.tags.map((entry) => normalizeText(entry)).filter(Boolean).join(", "));
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!isPasswordValid) {
      return;
    }

    setIsLoadingData(true);
    setErrorMessage("");

    try {
      const [statusData, itemsData] = await Promise.all([
        apiRequest(buildSuperAdminApiPath(password, "/writing-task2"), {
          auth: false,
        }),
        apiRequest(buildSuperAdminApiPath(password, "/writing-task2/items"), {
          auth: false,
        }),
      ]);

      const nextEssayTypes = Array.isArray(statusData?.essayTypes)
        ? statusData.essayTypes.map((type) => normalizeEnum(type)).filter(Boolean)
        : [];

      setEssayTypes(nextEssayTypes.length > 0 ? nextEssayTypes : DEFAULT_ESSAY_TYPES);
      setItems(Array.isArray(itemsData?.items) ? itemsData.items : []);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load Writing Task 2 admin data.");
    } finally {
      setIsLoadingData(false);
    }
  }, [isPasswordValid, password]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedItem = useMemo(
    () => items.find((item) => normalizeText(item?._id) === selectedItemId) || null,
    [items, selectedItemId],
  );

  function clearEditorForNewItem() {
    setSelectedItemId("");
    setQuestionTopic("");
    setEssayType("opinion");
    setInstructionText("Write at around 250 words.");
    setInstructionMinWords("250");
    setStatus("draft");
    setSource("");
    setDifficulty("");
    setTagsInput("");
    setFeedbackMessage("New Writing Task 2 draft started.");
    setErrorMessage("");
  }

  function handleSourceImagePaste(event) {
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

    const fileName = file.name || `writing-task2-${Date.now()}.png`;
    const pastedImageFile = new File([file], fileName, {
      type: file.type || "image/png",
    });
    setSourceImageFile(pastedImageFile);
  }

  async function handleExtractFromImage() {
    if (!sourceImageFile) {
      setErrorMessage("Paste or upload a source image first.");
      return;
    }

    setIsExtractingFromImage(true);
    setErrorMessage("");
    setFeedbackMessage("");

    try {
      const extractPath = buildSuperAdminApiPath(password, "/writing-task2/extract-image");
      const responseBody = await extractSuperAdminFromImage(extractPath, sourceImageFile);

      applyExtractedItem(responseBody?.item);
      setFeedbackMessage(responseBody?.message || "Extracted Writing Task 2 fields from image.");
    } catch (error) {
      setErrorMessage(error.message || "Extraction from image failed.");
    } finally {
      setIsExtractingFromImage(false);
    }
  }

  async function handleExtractFromText() {
    if (!normalizeText(sourceText)) {
      setErrorMessage("Paste source text first.");
      return;
    }

    setIsExtractingFromText(true);
    setErrorMessage("");
    setFeedbackMessage("");

    try {
      const response = await apiRequest(buildSuperAdminApiPath(password, "/writing-task2/extract-text"), {
        method: "POST",
        body: {
          sourceText,
        },
        auth: false,
      });

      applyExtractedItem(response?.item);
      setFeedbackMessage(response?.message || "Extracted Writing Task 2 fields from text.");
    } catch (error) {
      setErrorMessage(error.message || "Extraction from text failed.");
    } finally {
      setIsExtractingFromText(false);
    }
  }

  async function handleSaveItem() {
    setErrorMessage("");
    setFeedbackMessage("");

    const safeQuestionTopic = normalizeText(questionTopic);
    if (!safeQuestionTopic) {
      setErrorMessage("`questionTopic` is required.");
      return;
    }

    const safeEssayType = normalizeEnum(essayType);
    if (!essayTypes.includes(safeEssayType)) {
      setErrorMessage("Select a valid essay type.");
      return;
    }

    const safeInstructionText = normalizeText(instructionText);
    if (!safeInstructionText) {
      setErrorMessage("`instruction.text` is required.");
      return;
    }

    const safeMinWords = toNumber(instructionMinWords, NaN);
    if (!Number.isFinite(safeMinWords) || safeMinWords < 1) {
      setErrorMessage("`instruction.minWords` must be a number >= 1.");
      return;
    }

    const safeStatus = normalizeEnum(status);
    if (!ITEM_STATUSES.includes(safeStatus)) {
      setErrorMessage("Select a valid status.");
      return;
    }

    const tags = normalizeText(tagsInput)
      .split(",")
      .map((entry) => normalizeText(entry))
      .filter(Boolean);

    setIsSavingItem(true);
    try {
      const response = await apiRequest(buildSuperAdminApiPath(password, "/writing-task2/items"), {
        method: "POST",
        body: {
          itemId: selectedItemId || undefined,
          item: {
            section: "writing",
            taskType: "task2",
            essayType: safeEssayType,
            questionTopic: safeQuestionTopic,
            instruction: {
              text: safeInstructionText,
              minWords: safeMinWords,
            },
            source: normalizeText(source),
            difficulty: normalizeText(difficulty),
            tags,
            status: safeStatus,
          },
        },
        auth: false,
      });

      const savedItemId = normalizeText(response?.item?._id);
      if (savedItemId) {
        setSelectedItemId(savedItemId);
      }

      setFeedbackMessage(response?.message || "Writing Task 2 item saved.");
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Failed to save Writing Task 2 item.");
    } finally {
      setIsSavingItem(false);
    }
  }

  function handleLoadSavedItem(item) {
    if (!item || typeof item !== "object") {
      return;
    }

    setSelectedItemId(normalizeText(item._id));
    applyExtractedItem(item);
    setFeedbackMessage(`Loaded item '${normalizeText(item._id)}'.`);
    setErrorMessage("");
  }

  async function handleDeleteItem(itemId) {
    const safeItemId = normalizeText(itemId);
    if (!safeItemId) {
      return;
    }

    const shouldDelete = window.confirm(`Delete Writing Task 2 item '${safeItemId}'?`);
    if (!shouldDelete) {
      return;
    }

    setIsDeletingItemId(safeItemId);
    setErrorMessage("");
    setFeedbackMessage("");

    try {
      const path = `${buildSuperAdminApiPath(password, "/writing-task2/items")}/${encodeURIComponent(safeItemId)}`;
      const response = await apiRequest(path, {
        method: "DELETE",
        auth: false,
      });

      if (selectedItemId === safeItemId) {
        clearEditorForNewItem();
      }

      setFeedbackMessage(response?.message || `Writing Task 2 item '${safeItemId}' deleted.`);
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete item.");
    } finally {
      setIsDeletingItemId("");
    }
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
              Writing Task 2 Manager
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
            <Wand2 className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              Source Extraction (Optional)
            </span>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[340px_1fr]">
            <div className="space-y-3">
              <div
                className="min-h-[230px] border border-dashed border-slate-300 bg-slate-50/70 p-3 text-sm text-slate-600"
                onPaste={handleSourceImagePaste}
                role="button"
                tabIndex={0}
              >
                {sourceImagePreviewUrl ? (
                  <img
                    alt="Writing Task 2 source image preview"
                    className="h-full max-h-[320px] w-full object-contain"
                    src={sourceImagePreviewUrl}
                  />
                ) : (
                  <div className="flex h-full min-h-[180px] items-center justify-center text-center">
                    <p>Paste Task 2 image here (Ctrl+V) or upload below.</p>
                  </div>
                )}
              </div>

              <input
                accept="image/*"
                className="block w-full cursor-pointer border border-slate-200/80 bg-slate-50 px-3 py-2 text-sm text-slate-700 file:mr-3 file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-700"
                onChange={(event) => setSourceImageFile(event.target.files?.[0] || null)}
                type="file"
              />

              <button
                className="emerald-gradient-fill inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-300/20 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] disabled:cursor-not-allowed disabled:opacity-55"
                disabled={isExtractingFromImage || !sourceImageFile}
                onClick={handleExtractFromImage}
                type="button"
              >
                <Upload className="h-4 w-4" />
                {isExtractingFromImage ? "Extracting from image..." : "Extract from image"}
              </button>
            </div>

            <div className="space-y-3">
              <textarea
                className="h-[230px] w-full border border-slate-200/80 bg-slate-50/60 p-3 text-sm leading-7 text-slate-800 outline-none focus:border-emerald-400"
                onChange={(event) => setSourceText(event.target.value)}
                placeholder="Optional source text for AI extraction..."
                spellCheck={false}
                value={sourceText}
              />

              <button
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55"
                disabled={isExtractingFromText || !normalizeText(sourceText)}
                onClick={handleExtractFromText}
                type="button"
              >
                {isExtractingFromText ? "Extracting from text..." : "Extract from text"}
              </button>

              <div className="rounded-none border border-slate-200/80 bg-slate-50/60 p-3 text-xs text-slate-600">
                AI extraction is optional and text-focused for Task 2. You can still create items manually.
              </div>
            </div>
          </div>
        </article>

        <article className="border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)]">
          <div className="inline-flex items-center gap-2 text-emerald-700">
            <FileCheck2 className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              Item Editor
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Question Topic
              <textarea
                className="h-[160px] w-full border border-slate-200 bg-white p-3 text-sm font-normal leading-7 text-slate-800 outline-none focus:border-emerald-400"
                onChange={(event) => setQuestionTopic(event.target.value)}
                placeholder="Paste or write the full Task 2 prompt here..."
                spellCheck={false}
                value={questionTopic}
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Essay Type
                <select
                  className="w-full border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-700"
                  onChange={(event) => setEssayType(event.target.value)}
                  value={essayType}
                >
                  {essayTypes.map((type) => (
                    <option key={type} value={type}>
                      {toReadableLabel(type)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Status
                <select
                  className="w-full border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-700"
                  onChange={(event) => setStatus(event.target.value)}
                  value={status}
                >
                  {ITEM_STATUSES.map((itemStatus) => (
                    <option key={itemStatus} value={itemStatus}>
                      {toReadableLabel(itemStatus)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_160px]">
              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Instruction Text
                <input
                  className="w-full border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-700"
                  onChange={(event) => setInstructionText(event.target.value)}
                  placeholder="Write at around 250 words."
                  value={instructionText}
                />
              </label>

              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Min Words
                <input
                  className="w-full border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-700"
                  min={1}
                  onChange={(event) => setInstructionMinWords(event.target.value)}
                  type="number"
                  value={instructionMinWords}
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <input
                className="w-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                onChange={(event) => setSource(event.target.value)}
                placeholder="Source (optional)"
                value={source}
              />
              <input
                className="w-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                onChange={(event) => setDifficulty(event.target.value)}
                placeholder="Difficulty (optional)"
                value={difficulty}
              />
              <input
                className="w-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder="Tags (comma separated)"
                value={tagsInput}
              />
            </div>

            <div className="rounded-none border border-slate-200/80 bg-slate-50/70 p-3 text-xs text-slate-600">
              <p>
                <span className="font-semibold">Selected item:</span> {selectedItemId || "(new item)"}
              </p>
              {selectedItem ? (
                <p className="mt-1">
                  <span className="font-semibold">Last updated:</span> {formatTimestamp(selectedItem.updatedAt)}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="emerald-gradient-fill inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300/20 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] disabled:cursor-not-allowed disabled:opacity-55"
                disabled={isSavingItem}
                onClick={handleSaveItem}
                type="button"
              >
                <PenLine className="h-4 w-4" />
                {isSavingItem ? "Saving..." : selectedItemId ? "Update Item" : "Save New Item"}
              </button>
              <button
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={clearEditorForNewItem}
                type="button"
              >
                Start New Item
              </button>
            </div>
          </div>
        </article>

        <article className="border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)]">
          <div className="mb-4 inline-flex items-center gap-2 text-emerald-700">
            <FileCheck2 className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              writing_task2_items
            </span>
          </div>

          {isLoadingData ? <LibraryListSkeleton count={5} /> : null}
          {!isLoadingData && items.length === 0 ? (
            <p className="text-sm text-slate-600">No Writing Task 2 items yet.</p>
          ) : null}

          {!isLoadingData && items.length > 0 ? (
            <div className="space-y-2">
              {items.map((item) => {
                const itemId = normalizeText(item?._id);
                const isSelected = selectedItemId && selectedItemId === itemId;
                const isDeleting = isDeletingItemId === itemId;
                return (
                  <article
                    className={`border px-3 py-2 transition ${
                      isSelected
                        ? "border-emerald-300 bg-emerald-50/70"
                        : "border-slate-200 bg-slate-50/45 hover:bg-slate-100"
                    }`}
                    key={itemId}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button className="w-full text-left" onClick={() => handleLoadSavedItem(item)} type="button">
                        <p className="font-mono text-xs text-slate-800">{itemId}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          {toReadableLabel(item?.essayType)} | {toReadableLabel(item?.status)} | {toNumber(item?.instruction?.minWords, 250)} words
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{normalizeText(item?.questionTopic)}</p>
                      </button>
                      <button
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-55"
                        disabled={isDeleting}
                        onClick={() => handleDeleteItem(itemId)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                        {isDeleting ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
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
      </div>
    </section>
  );
}

export default SuperAdminWritingTask2Page;
