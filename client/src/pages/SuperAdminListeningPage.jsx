import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Headphones, Trash2, Upload } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { API_BASE_URL, apiRequest } from "../lib/apiClient";
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

async function parseRawResponse(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function tryParseJson(value) {
  try {
    return {
      ok: true,
      value: JSON.parse(String(value || "")),
      error: "",
    };
  } catch (error) {
    return {
      ok: false,
      value: null,
      error: error.message || "Invalid JSON.",
    };
  }
}

function validateListeningBlockJson(block) {
  const errors = [];
  const safeBlock = block && typeof block === "object" ? block : null;

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
  } else if (!String(safeBlock.instruction.text || "").trim()) {
    errors.push("`instruction.text` is required.");
  }

  if (!safeBlock.display || typeof safeBlock.display !== "object") {
    errors.push("`display` object is required.");
  }

  if (!Array.isArray(safeBlock.questions) || safeBlock.questions.length === 0) {
    errors.push("`questions` must be a non-empty array.");
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
  const [audios, setAudios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtractingBlock, setIsExtractingBlock] = useState(false);
  const [isSavingBlock, setIsSavingBlock] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [blockFeedbackMessage, setBlockFeedbackMessage] = useState("");
  const [blockErrorMessage, setBlockErrorMessage] = useState("");

  const isPasswordValid = isValidSuperAdminPassword(password);
  const uploadPreviewId = useMemo(
    () => (audioFile ? deriveAudioIdFromFileName(audioFile.name) : ""),
    [audioFile],
  );

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
    setErrorMessage("");

    try {
      const data = await apiRequest(buildSuperAdminApiPath(password, "/listening"), {
        auth: false,
      });
      setAudios(Array.isArray(data?.audios) ? data.audios : []);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load listening audios.");
    } finally {
      setIsLoading(false);
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

      const responseBody = await parseRawResponse(response);
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

      const responseBody = await parseRawResponse(response);
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

    const parsed = tryParseJson(blockJsonText);
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

    const parsed = tryParseJson(blockJsonText);
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
      setBlockFeedbackMessage(response?.message || `Listening block '${blockId}' saved.`);
    } catch (error) {
      setBlockErrorMessage(error.message || "Failed to save listening block.");
    } finally {
      setIsSavingBlock(false);
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

        <article className="border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)]">
          <div className="mb-4 inline-flex items-center gap-2 text-emerald-700">
            <Headphones className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              listening_audios collection
            </span>
          </div>

          {isLoading ? (
            <p className="text-sm text-slate-600">Loading listening audios...</p>
          ) : null}

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
