import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, FileCheck2, PenLine, Trash2, Upload } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { AdminListSkeleton, LibraryListSkeleton } from "../components/ui/Skeleton";
import { API_BASE_URL, apiRequest } from "../lib/apiClient";
import { parseRawFetchResponse } from "../lib/jsonParsing";
import { buildSuperAdminApiPath, buildSuperAdminPagePath, isValidSuperAdminPassword } from "../lib/superAdmin";

const VISUAL_TYPES = [
  "line_chart",
  "bar_chart",
  "pie_chart",
  "table",
  "process_diagram",
  "map",
  "mixed_visual",
];
const ITEM_STATUSES = ["draft", "published"];

function normalizeText(value) {
  return String(value || "").trim();
}

function toReadableLabel(value) {
  return normalizeText(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveVisualUrl(url) {
  const safe = normalizeText(url);
  if (!safe) {
    return "";
  }

  if (/^https?:\/\//i.test(safe)) {
    return safe;
  }

  let apiOrigin = "";
  try {
    apiOrigin = new URL(API_BASE_URL).origin;
  } catch {
    apiOrigin = "";
  }

  const normalizedPath = safe.replace(/^\/+/, "");
  if (safe.startsWith("/")) {
    if (apiOrigin) {
      return `${apiOrigin}${safe}`;
    }

    return `${API_BASE_URL}/${normalizedPath}`;
  }

  if (/^api\//i.test(normalizedPath) && apiOrigin) {
    return `${apiOrigin}/${normalizedPath}`;
  }

  return `${API_BASE_URL}/${normalizedPath}`;
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

function SuperAdminWritingTask1Page() {
  const { password = "" } = useParams();
  const imageInputRef = useRef(null);
  const isPasswordValid = isValidSuperAdminPassword(password);

  const [sourceImageFile, setSourceImageFile] = useState(null);
  const [sourceImagePreviewUrl, setSourceImagePreviewUrl] = useState("");
  const [isExtractingTopic, setIsExtractingTopic] = useState(false);
  const [isUploadingVisual, setIsUploadingVisual] = useState(false);
  const [isDeletingVisualId, setIsDeletingVisualId] = useState("");
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [questionTopic, setQuestionTopic] = useState("");
  const [visualType, setVisualType] = useState("bar_chart");
  const [status, setStatus] = useState("draft");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [provider, setProvider] = useState("");
  const [uploadedVisual, setUploadedVisual] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState("");

  const [items, setItems] = useState([]);
  const [visuals, setVisuals] = useState([]);

  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [topicFeedbackMessage, setTopicFeedbackMessage] = useState("");
  const [topicErrorMessage, setTopicErrorMessage] = useState("");

  const selectedVisualUrl = useMemo(() => {
    const urlFromPayload = resolveVisualUrl(uploadedVisual?.url || "");
    if (urlFromPayload) {
      return urlFromPayload;
    }

    const imageId = normalizeText(uploadedVisual?.imageId || uploadedVisual?._id);
    if (!imageId) {
      return "";
    }

    return resolveVisualUrl(`/api/v1/writing-task1/visuals/${encodeURIComponent(imageId)}`);
  }, [uploadedVisual?._id, uploadedVisual?.imageId, uploadedVisual?.url]);

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

  const loadData = useCallback(async () => {
    if (!isPasswordValid) {
      return;
    }

    setIsLoadingData(true);
    setErrorMessage("");
    try {
      const [itemsData, visualsData] = await Promise.all([
        apiRequest(buildSuperAdminApiPath(password, "/writing-task1/items"), {
          auth: false,
        }),
        apiRequest(buildSuperAdminApiPath(password, "/writing-task1/visuals"), {
          auth: false,
        }),
      ]);

      setItems(Array.isArray(itemsData?.items) ? itemsData.items : []);
      setVisuals(Array.isArray(visualsData?.visuals) ? visualsData.visuals : []);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load Writing Task 1 admin data.");
    } finally {
      setIsLoadingData(false);
    }
  }, [isPasswordValid, password]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function clearEditorForNewItem() {
    setSelectedItemId("");
    setQuestionTopic("");
    setVisualType("bar_chart");
    setStatus("draft");
    setTitle("");
    setSource("");
    setProvider("");
    setUploadedVisual(null);
    setTopicFeedbackMessage("");
    setTopicErrorMessage("");
    setFeedbackMessage("New Writing Task 1 draft started.");
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

    const fileName = file.name || `writing-task1-${Date.now()}.png`;
    const pastedImageFile = new File([file], fileName, {
      type: file.type || "image/png",
    });
    setSourceImageFile(pastedImageFile);
  }

  async function handleUploadSourceImageAsVisual() {
    if (!sourceImageFile) {
      setErrorMessage("Paste or upload a Writing Task 1 image first.");
      return;
    }

    setIsUploadingVisual(true);
    setErrorMessage("");
    setFeedbackMessage("");

    try {
      const visualPath = buildSuperAdminApiPath(password, "/writing-task1/visuals");
      const safeFileName = normalizeText(sourceImageFile.name) || `writing-task1-${Date.now()}.png`;

      const response = await fetch(`${API_BASE_URL}${visualPath}`, {
        method: "POST",
        headers: {
          "Content-Type": sourceImageFile.type || "image/png",
          "X-Visual-Filename": safeFileName,
        },
        body: sourceImageFile,
      });

      const responseBody = await parseRawFetchResponse(response);
      if (!response.ok) {
        throw new Error(responseBody?.message || "Failed to upload visual image.");
      }

      setUploadedVisual(responseBody?.visual || null);
      setFeedbackMessage(responseBody?.message || "Visual image uploaded.");
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Failed to upload visual image.");
    } finally {
      setIsUploadingVisual(false);
    }
  }

  async function handleExtractQuestionTopic() {
    if (!sourceImageFile) {
      setTopicErrorMessage("Paste or upload a full Writing Task 1 image first.");
      return;
    }

    setIsExtractingTopic(true);
    setTopicErrorMessage("");
    setTopicFeedbackMessage("");

    try {
      const extractPath = buildSuperAdminApiPath(password, "/writing-task1/extract-question-topic");
      const response = await fetch(`${API_BASE_URL}${extractPath}`, {
        method: "POST",
        headers: {
          "Content-Type": sourceImageFile.type || "image/png",
          "X-Image-Filename": sourceImageFile.name || `writing-task1-${Date.now()}.png`,
        },
        body: sourceImageFile,
      });

      const responseBody = await parseRawFetchResponse(response);
      if (!response.ok) {
        throw new Error(responseBody?.message || "Question topic extraction failed.");
      }

      const extractedTopic = normalizeText(responseBody?.questionTopic);
      if (!extractedTopic) {
        throw new Error("AI response is missing `questionTopic`.");
      }

      setQuestionTopic(extractedTopic);
      setTopicFeedbackMessage(responseBody?.message || "Question topic extracted successfully.");
    } catch (error) {
      setTopicErrorMessage(error.message || "Question topic extraction failed.");
    } finally {
      setIsExtractingTopic(false);
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

    const imageId = normalizeText(uploadedVisual?.imageId || uploadedVisual?._id);
    const visualUrl = normalizeText(uploadedVisual?.url);
    if (!imageId || !visualUrl) {
      setErrorMessage("Upload/select a visual image first.");
      return;
    }

    const safeVisualType = normalizeText(visualType).toLowerCase();
    if (!VISUAL_TYPES.includes(safeVisualType)) {
      setErrorMessage("Select a valid visual type.");
      return;
    }

    const safeStatus = normalizeText(status).toLowerCase();
    if (!ITEM_STATUSES.includes(safeStatus)) {
      setErrorMessage("Select a valid status.");
      return;
    }

    setIsSavingItem(true);
    try {
      const response = await apiRequest(buildSuperAdminApiPath(password, "/writing-task1/items"), {
        method: "POST",
        body: {
          itemId: selectedItemId || undefined,
          item: {
            section: "writing",
            taskType: "task1",
            visualType: safeVisualType,
            questionTopic: safeQuestionTopic,
            status: safeStatus,
            title: normalizeText(title),
            source: normalizeText(source),
            provider: normalizeText(provider),
            visualAsset: {
              imageId,
              url: visualUrl,
            },
          },
        },
        auth: false,
      });

      const savedItemId = normalizeText(response?.item?._id);
      if (savedItemId) {
        setSelectedItemId(savedItemId);
      }

      setFeedbackMessage(response?.message || "Writing Task 1 item saved.");
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Failed to save Writing Task 1 item.");
    } finally {
      setIsSavingItem(false);
    }
  }

  function handleLoadSavedItem(item) {
    if (!item || typeof item !== "object") {
      return;
    }

    setSelectedItemId(normalizeText(item?._id));
    setQuestionTopic(normalizeText(item?.questionTopic));
    setVisualType(normalizeText(item?.visualType).toLowerCase() || "bar_chart");
    setStatus(normalizeText(item?.status).toLowerCase() || "draft");
    setTitle(normalizeText(item?.title));
    setSource(normalizeText(item?.source));
    setProvider(normalizeText(item?.provider));
    setUploadedVisual({
      imageId: normalizeText(item?.visualAsset?.imageId),
      url: normalizeText(item?.visualAsset?.url),
    });
    setTopicErrorMessage("");
    setTopicFeedbackMessage("");
    setFeedbackMessage(`Loaded item '${normalizeText(item?._id)}'.`);
    setErrorMessage("");
  }

  function handleSelectSavedVisual(visual) {
    if (!visual || typeof visual !== "object") {
      return;
    }

    setUploadedVisual({
      imageId: normalizeText(visual?._id),
      url: normalizeText(visual?.url),
    });
    setFeedbackMessage(`Selected visual '${normalizeText(visual?._id)}'.`);
    setErrorMessage("");
  }

  async function handleDeleteVisual(visualId) {
    const safeVisualId = normalizeText(visualId);
    if (!safeVisualId) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete Writing Task 1 visual '${safeVisualId}'?\n\nIf this visual is used by an item, delete will be blocked.`,
    );
    if (!shouldDelete) {
      return;
    }

    setIsDeletingVisualId(safeVisualId);
    setErrorMessage("");
    setFeedbackMessage("");

    try {
      const path = `${buildSuperAdminApiPath(password, "/writing-task1/visuals")}/${encodeURIComponent(safeVisualId)}`;
      const response = await apiRequest(path, {
        method: "DELETE",
        auth: false,
      });

      const selectedVisualId = normalizeText(uploadedVisual?.imageId || uploadedVisual?._id);
      if (selectedVisualId && selectedVisualId === safeVisualId) {
        setUploadedVisual(null);
      }

      setFeedbackMessage(response?.message || `Writing Task 1 visual '${safeVisualId}' deleted.`);
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete Writing Task 1 visual.");
    } finally {
      setIsDeletingVisualId("");
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
              Writing Task 1 Manager
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
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              Full Task Image
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
                    alt="Writing Task 1 full image preview"
                    className="h-full max-h-[320px] w-full object-contain"
                    src={sourceImagePreviewUrl}
                  />
                ) : (
                  <div className="flex h-full min-h-[180px] items-center justify-center text-center">
                    <p>Paste full task image here (Ctrl+V) or upload below.</p>
                  </div>
                )}
              </div>

              <input
                accept="image/*"
                className="block w-full cursor-pointer border border-slate-200/80 bg-slate-50 px-3 py-2 text-sm text-slate-700 file:mr-3 file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-700"
                onChange={(event) => setSourceImageFile(event.target.files?.[0] || null)}
                ref={imageInputRef}
                type="file"
              />
            </div>

            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  className="emerald-gradient-fill inline-flex items-center justify-center rounded-full border border-emerald-300/20 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={isUploadingVisual || !sourceImageFile}
                  onClick={handleUploadSourceImageAsVisual}
                  type="button"
                >
                  {isUploadingVisual ? "1. Uploading Visual..." : "1. Upload As Visual"}
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={isExtractingTopic || !sourceImageFile}
                  onClick={handleExtractQuestionTopic}
                  type="button"
                >
                  {isExtractingTopic ? "Extracting Text..." : "2. Extract Question Topic"}
                </button>
              </div>

              <div className="rounded-none border border-slate-200/80 bg-slate-50/60 p-3 text-xs text-slate-600">
                Image is uploaded manually as the visual asset. AI extraction is used only for question topic text.
              </div>

              <textarea
                className="h-[200px] w-full border border-slate-200/80 bg-slate-50/60 p-3 text-sm leading-7 text-slate-800 outline-none focus:border-emerald-400"
                onChange={(event) => setQuestionTopic(event.target.value)}
                placeholder="Question topic text will appear here after extraction. You can edit before saving."
                spellCheck={false}
                value={questionTopic}
              />
            </div>
          </div>
        </article>

        <article className="border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)]">
          <div className="inline-flex items-center gap-2 text-emerald-700">
            <FileCheck2 className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              Selected Visual & Item Editor
            </span>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[340px_1fr]">
            <div className="space-y-3">
              <div className="min-h-[220px] border border-slate-200 bg-slate-50 p-3">
                {selectedVisualUrl ? (
                  <img
                    alt="Selected Writing Task 1 visual"
                    className="h-full max-h-[300px] w-full object-contain"
                    src={selectedVisualUrl}
                  />
                ) : (
                  <div className="flex h-full min-h-[160px] items-center justify-center text-center text-sm text-slate-500">
                    <p>Upload the image as visual from Step 1, or select an existing saved visual below.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Visual Type
                  <select
                    className="w-full border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-700"
                    onChange={(event) => setVisualType(event.target.value)}
                    value={visualType}
                  >
                    {VISUAL_TYPES.map((type) => (
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

              <div className="grid gap-3 md:grid-cols-3">
                <input
                  className="w-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Title (optional)"
                  value={title}
                />
                <input
                  className="w-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  onChange={(event) => setSource(event.target.value)}
                  placeholder="Source (optional)"
                  value={source}
                />
                <input
                  className="w-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  onChange={(event) => setProvider(event.target.value)}
                  placeholder="Provider (optional)"
                  value={provider}
                />
              </div>

              <div className="rounded-none border border-slate-200/80 bg-slate-50/70 p-3 text-xs text-slate-600">
                <p>
                  <span className="font-semibold">Selected item:</span>{" "}
                  {selectedItemId || "(new item)"}
                </p>
                <p className="mt-1">
                  <span className="font-semibold">Selected visual:</span>{" "}
                  {normalizeText(uploadedVisual?.imageId || uploadedVisual?._id) || "(none)"}
                </p>
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
          </div>
        </article>

        <article className="border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)]">
          <div className="mb-4 inline-flex items-center gap-2 text-emerald-700">
            <FileCheck2 className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              writing_task1_items
            </span>
          </div>

          {isLoadingData ? <LibraryListSkeleton count={4} /> : null}
          {!isLoadingData && items.length === 0 ? (
            <p className="text-sm text-slate-600">No Writing Task 1 items yet.</p>
          ) : null}

          {!isLoadingData && items.length > 0 ? (
            <div className="space-y-2">
              {items.map((item) => {
                const itemId = normalizeText(item?._id);
                const isSelected = selectedItemId && selectedItemId === itemId;
                return (
                  <button
                    className={`w-full border px-3 py-2 text-left transition ${
                      isSelected
                        ? "border-emerald-300 bg-emerald-50/70"
                        : "border-slate-200 bg-slate-50/45 hover:bg-slate-100"
                    }`}
                    key={itemId}
                    onClick={() => handleLoadSavedItem(item)}
                    type="button"
                  >
                    <p className="font-mono text-xs text-slate-800">{itemId}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {toReadableLabel(item?.visualType)} | {toReadableLabel(item?.status)} | Visual:{" "}
                      {normalizeText(item?.visualAsset?.imageId)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{normalizeText(item?.questionTopic)}</p>
                  </button>
                );
              })}
            </div>
          ) : null}
        </article>

        <article className="border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)]">
          <div className="mb-4 inline-flex items-center gap-2 text-emerald-700">
            <Upload className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              writing_task1_visuals
            </span>
          </div>

          {isLoadingData ? <AdminListSkeleton rows={3} /> : null}
          {!isLoadingData && visuals.length === 0 ? (
            <p className="text-sm text-slate-600">No visuals uploaded yet.</p>
          ) : null}

          {!isLoadingData && visuals.length > 0 ? (
            <div className="space-y-2">
              {visuals.map((visual) => {
                const visualId = normalizeText(visual?._id);
                const selectedVisualId = normalizeText(uploadedVisual?.imageId || uploadedVisual?._id);
                const isSelected = selectedVisualId && selectedVisualId === visualId;
                return (
                  <article
                    className={`border px-3 py-2 transition ${
                      isSelected
                        ? "border-emerald-300 bg-emerald-50/70"
                        : "border-slate-200 bg-slate-50/45 hover:bg-slate-100"
                    }`}
                    key={visualId}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        className="w-full text-left"
                        onClick={() => handleSelectSavedVisual(visual)}
                        type="button"
                      >
                        <p className="font-mono text-xs text-slate-800">{visualId}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          {visual?.mimeType} | {Number(visual?.fileSizeBytes || 0)} bytes | Added{" "}
                          {formatTimestamp(visual?.createdAt)}
                        </p>
                      </button>
                      <button
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-55"
                        disabled={isDeletingVisualId === visualId}
                        onClick={() => handleDeleteVisual(visualId)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                        {isDeletingVisualId === visualId ? "Deleting..." : "Delete"}
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

        {topicFeedbackMessage ? (
          <div className="border border-emerald-200/80 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {topicFeedbackMessage}
          </div>
        ) : null}

        {topicErrorMessage ? (
          <div className="border border-rose-200/80 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {topicErrorMessage}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default SuperAdminWritingTask1Page;
