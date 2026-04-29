import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpenText, Blocks, FileCheck2, Upload } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { SelectControl } from "../components/ui/StyledFormControls";
import { AdminListSkeleton } from "../components/ui/Skeleton";
import { apiRequest } from "../lib/apiClient";
import { parseJsonInput } from "../lib/jsonParsing";
import {
  BLOCK_TEMPLATE,
  PASSAGE_TEMPLATE,
  TEST_TEMPLATE,
  getWorkingReadingTestDraft,
  inferTestIdFromPassageId,
  normalizeReadingBlockPayload,
  normalizeReadingPassagePayload,
  normalizeReadingTestPayload,
  normalizeText,
  validateReadingBlockPayload,
  validateReadingPassagePayload,
  validateReadingTestPayload,
} from "../lib/readingAdminPayload";
import { buildSuperAdminApiPath, buildSuperAdminPagePath, isValidSuperAdminPassword } from "../lib/superAdmin";
import { extractSuperAdminFromImage } from "../services/superAdminService";

function SuperAdminReadingPage() {
  const { password = "" } = useParams();
  const isPasswordValid = isValidSuperAdminPassword(password);
  const [activeTab, setActiveTab] = useState("passages");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [entry, setEntry] = useState(null);
  const [passages, setPassages] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [tests, setTests] = useState([]);
  const [passageJson, setPassageJson] = useState("");
  const [blockJson, setBlockJson] = useState("");
  const [testJson, setTestJson] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);
  const [extractImageFile, setExtractImageFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testPassageId, setTestPassageId] = useState("");
  const [testRangeStart, setTestRangeStart] = useState("");
  const [testRangeEnd, setTestRangeEnd] = useState("");
  const [testBlockPassageId, setTestBlockPassageId] = useState("");
  const [testBlockId, setTestBlockId] = useState("");
  const [selectedPassageForBlock, setSelectedPassageForBlock] = useState("");

  const passageIds = useMemo(() => passages.map((item) => item._id).filter(Boolean), [passages]);
  const blockIds = useMemo(() => blocks.map((item) => item._id).filter(Boolean), [blocks]);

  const loadData = useCallback(async () => {
    if (!isPasswordValid) return;
    setLoading(true);
    setError("");
    try {
      const [entryResponse, passagesResponse, blocksResponse, testsResponse] = await Promise.all([
        apiRequest(buildSuperAdminApiPath(password, "/reading"), { auth: false }),
        apiRequest(buildSuperAdminApiPath(password, "/reading/passages"), { auth: false }),
        apiRequest(buildSuperAdminApiPath(password, "/reading/blocks"), { auth: false }),
        apiRequest(buildSuperAdminApiPath(password, "/reading/tests"), { auth: false }),
      ]);
      setEntry(entryResponse || null);
      setPassages(Array.isArray(passagesResponse?.passages) ? passagesResponse.passages : []);
      setBlocks(Array.isArray(blocksResponse?.blocks) ? blocksResponse.blocks : []);
      setTests(Array.isArray(testsResponse?.tests) ? testsResponse.tests : []);
    } catch (nextError) {
      setError(nextError.message || "Failed to load reading admin data.");
    } finally {
      setLoading(false);
    }
  }, [isPasswordValid, password]);

  useEffect(() => { loadData(); }, [loadData]);

  function handleImagePaste(event) {
    const imageItem = Array.from(event.clipboardData?.items || []).find((item) =>
      String(item.type || "").startsWith("image/"),
    );
    if (!imageItem) return;
    event.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;
    setExtractImageFile(new File([file], file.name || `reading-${Date.now()}.png`, { type: file.type || "image/png" }));
    setFeedback("Image pasted. You can extract JSON now.");
  }

  async function extractFromImage(type) {
    if (!extractImageFile) { setError("Upload/select image first."); return; }
    setExtracting(true); setError(""); setFeedback(""); setValidationErrors([]);
    try {
      const endpoint = type === "passages" ? "/reading/passages/extract" : "/reading/blocks/extract";
      const body = await extractSuperAdminFromImage(
        buildSuperAdminApiPath(password, endpoint),
        extractImageFile,
      );
      if (type === "passages") setPassageJson(JSON.stringify(body?.passage || {}, null, 2));
      if (type === "blocks") setBlockJson(JSON.stringify(body?.block || {}, null, 2));
      const errors = Array.isArray(body?.validation?.errors) ? body.validation.errors : [];
      setValidationErrors(errors);
      setFeedback(errors.length > 0 ? "Extracted. Fix validation errors before save." : "Extraction completed.");
    } catch (nextError) {
      setError(nextError.message || "Extraction failed.");
    } finally {
      setExtracting(false);
    }
  }

  function validateCurrent() {
    setError(""); setFeedback("");
    const rawJson = activeTab === "passages" ? passageJson : activeTab === "blocks" ? blockJson : testJson;
    const parsed = parseJsonInput(rawJson);
    if (!parsed.ok) { setValidationErrors([`JSON parse error: ${parsed.error}`]); return null; }
    if (activeTab === "passages") { const normalized = normalizeReadingPassagePayload(parsed.value); const errors = validateReadingPassagePayload(normalized); setValidationErrors(errors); return { normalized, errors, key: "passage" }; }
    if (activeTab === "blocks") { const normalized = normalizeReadingBlockPayload(parsed.value); const errors = validateReadingBlockPayload(normalized); setValidationErrors(errors); return { normalized, errors, key: "block" }; }
    const normalized = normalizeReadingTestPayload(parsed.value); const errors = validateReadingTestPayload(normalized); setValidationErrors(errors); return { normalized, errors, key: "test" };
  }

  async function saveCurrent() {
    const validation = validateCurrent();
    if (!validation) return;
    if (validation.errors.length > 0) { setError("Cannot save. Fix validation errors first."); return; }
    setSaving(true); setError(""); setFeedback("");
    try {
      const endpoint = validation.key === "passage" ? "/reading/passages" : validation.key === "block" ? "/reading/blocks" : "/reading/tests";
      const response = await apiRequest(buildSuperAdminApiPath(password, endpoint), { method: "POST", body: { [validation.key]: validation.normalized }, auth: false });
      setFeedback(response?.message || "Saved.");
      await loadData();
    } catch (nextError) {
      setError(nextError.message || "Save failed.");
    } finally { setSaving(false); }
  }

  function addPassageRefToTestJson() {
    const draft = getWorkingReadingTestDraft(testJson);
    if (!draft.ok) { setError(`JSON parse error: ${draft.error}`); return; }
    const safeId = normalizeText(testPassageId);
    const start = Number(testRangeStart);
    const end = Number(testRangeEnd);
    if (!safeId || !Number.isFinite(start) || !Number.isFinite(end)) { setError("Pick passage and valid range."); return; }
    const normalized = draft.value;
    if (!normalizeText(normalized._id)) {
      normalized._id = inferTestIdFromPassageId(safeId) || normalizeText(TEST_TEMPLATE._id);
    }
    if (!normalizeText(normalized.title) && normalizeText(normalized._id)) {
      normalized.title = `${normalized._id} Reading Test`;
    }
    normalized.passages = Array.isArray(normalized.passages) ? normalized.passages : [];
    const existing = normalized.passages.find((item) => normalizeText(item.passageId) === safeId);
    if (existing) existing.questionRange = { start, end };
    else normalized.passages.push({ passageNumber: normalized.passages.length + 1, passageId: safeId, questionRange: { start, end }, blocks: [] });
    setError("");
    setTestJson(JSON.stringify(normalized, null, 2));
  }

  function addBlockRefToTestJson() {
    const draft = getWorkingReadingTestDraft(testJson);
    if (!draft.ok) { setError(`JSON parse error: ${draft.error}`); return; }
    const safePassageId = normalizeText(testBlockPassageId);
    const safeBlockId = normalizeText(testBlockId);
    if (!safePassageId || !safeBlockId) { setError("Pick passage and block."); return; }
    const normalized = draft.value;
    if (!normalizeText(normalized._id)) {
      normalized._id = inferTestIdFromPassageId(safePassageId) || normalizeText(TEST_TEMPLATE._id);
    }
    if (!normalizeText(normalized.title) && normalizeText(normalized._id)) {
      normalized.title = `${normalized._id} Reading Test`;
    }
    const passage = Array.isArray(normalized.passages) ? normalized.passages.find((item) => normalizeText(item.passageId) === safePassageId) : null;
    if (!passage) { setError("Passage not found in current test JSON."); return; }
    passage.blocks = Array.isArray(passage.blocks) ? passage.blocks : [];
    if (!passage.blocks.some((item) => normalizeText(item.blockId) === safeBlockId)) passage.blocks.push({ blockId: safeBlockId, order: passage.blocks.length + 1 });
    setError("");
    setTestJson(JSON.stringify(normalized, null, 2));
  }

  if (!isPasswordValid) {
    return <section className="min-h-screen bg-[#f5f1ea] px-4 py-20 sm:px-8"><div className="mx-auto max-w-3xl border border-slate-200/80 bg-white p-10 text-center"><p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Super Admin</p><h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950">Access denied</h1><p className="mt-4 text-slate-600">The password in this URL is not valid.</p></div></section>;
  }

  return (
    <section className="min-h-screen bg-[#f5f1ea] px-4 py-14 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Super Admin</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">Reading Tests Manager</h1></div>
          <Link className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to={buildSuperAdminPagePath(password)}><ArrowLeft className="h-4 w-4" />Back</Link>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {[{ key: "passages", label: "Passages", icon: BookOpenText }, { key: "blocks", label: "Blocks", icon: Blocks }, { key: "tests", label: "Tests", icon: FileCheck2 }].map((tab) => { const Icon = tab.icon; return <button className={`inline-flex items-center justify-center gap-2 border px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] ${activeTab === tab.key ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`} key={tab.key} onClick={() => setActiveTab(tab.key)} type="button"><Icon className="h-4 w-4" />{tab.label}</button>; })}
        </div>

        {entry ? <div className="border border-emerald-200/70 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900">{`Passages: ${entry?.counts?.passages ?? 0}, Blocks: ${entry?.counts?.blocks ?? 0}, Tests: ${entry?.counts?.tests ?? 0}`}</div> : null}
        {loading ? <AdminListSkeleton rows={5} /> : null}
        {error ? <div className="border border-rose-200/80 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div> : null}
        {feedback ? <div className="border border-emerald-200/80 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{feedback}</div> : null}

        {!loading ? (
          <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
            <article className="space-y-3 border border-slate-200/80 bg-white p-4">
              <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{activeTab === "passages" ? "reading_passages" : activeTab === "blocks" ? "reading_blocks" : "reading_tests"}</p><button className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700" onClick={() => { if (activeTab === "passages") setPassageJson(JSON.stringify(PASSAGE_TEMPLATE, null, 2)); if (activeTab === "blocks") setBlockJson(JSON.stringify(BLOCK_TEMPLATE, null, 2)); if (activeTab === "tests") setTestJson(JSON.stringify(TEST_TEMPLATE, null, 2)); }} type="button">New template</button></div>
              <div className="space-y-2">
                {(activeTab === "passages" ? passages : activeTab === "blocks" ? blocks : tests).map((item) => <button className="w-full border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:bg-slate-100" key={item._id} onClick={() => { if (activeTab === "passages") setPassageJson(JSON.stringify(item, null, 2)); if (activeTab === "blocks") setBlockJson(JSON.stringify(item, null, 2)); if (activeTab === "tests") setTestJson(JSON.stringify(item, null, 2)); }} type="button"><p className="font-mono text-xs text-slate-800">{item._id}</p><p className="mt-1 text-xs text-slate-600">{item.title || item.passageId || "-"}</p></button>)}
              </div>
            </article>

            <article className="space-y-3 border border-slate-200/80 bg-white p-4" onPaste={handleImagePaste}>
              {(activeTab === "passages" || activeTab === "blocks") ? <div className="grid gap-3 lg:grid-cols-[280px_1fr]"><div className="space-y-2"><input accept="image/*" className="block w-full cursor-pointer border border-slate-200/80 bg-slate-50 px-3 py-2 text-sm text-slate-700 file:mr-3 file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-700" onChange={(event) => setExtractImageFile(event.target.files?.[0] || null)} type="file" /><p className="text-xs text-slate-500">Tip: click here and paste image with Ctrl+V.</p><button className="emerald-gradient-fill inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300/20 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55" disabled={extracting || !extractImageFile} onClick={() => extractFromImage(activeTab)} type="button"><Upload className="h-4 w-4" />{extracting ? "Extracting..." : "Extract JSON from image"}</button></div></div> : null}
              {activeTab === "blocks" ? (
                <SelectControl
                  className="px-3 py-2 pr-10 text-sm text-slate-700"
                  onChange={(event) =>
                    setBlockJson((prev) => {
                      const parsed = parseJsonInput(prev);
                      if (!parsed.ok || !parsed.value || typeof parsed.value !== "object") {
                        return prev;
                      }

                      parsed.value.passageId = event.target.value;
                      setSelectedPassageForBlock(event.target.value);
                      return JSON.stringify(parsed.value, null, 2);
                    })
                  }
                  value={selectedPassageForBlock || ""}
                >
                  <option value="">Choose passageId to attach block</option>
                  {passageIds.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </SelectControl>
              ) : null}
              {activeTab === "tests" ? (
                <div className="grid gap-2 border border-slate-200/80 bg-slate-50/50 p-3 lg:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Add passage ref
                    </p>
                    <SelectControl
                      className="px-3 py-2 pr-10 text-sm"
                      onChange={(event) => setTestPassageId(event.target.value)}
                      value={testPassageId}
                    >
                      <option value="">PassageId</option>
                      {passageIds.map((id) => (
                        <option key={id} value={id}>
                          {id}
                        </option>
                      ))}
                    </SelectControl>
                    <div className="grid grid-cols-2 gap-2">
                      <input className="border border-slate-200 bg-white px-3 py-2 text-sm" onChange={(event) => setTestRangeStart(event.target.value)} placeholder="start" type="number" value={testRangeStart} />
                      <input className="border border-slate-200 bg-white px-3 py-2 text-sm" onChange={(event) => setTestRangeEnd(event.target.value)} placeholder="end" type="number" value={testRangeEnd} />
                    </div>
                    <button className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50" onClick={addPassageRefToTestJson} type="button">Add passage</button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Add block ref
                    </p>
                    <SelectControl
                      className="px-3 py-2 pr-10 text-sm"
                      onChange={(event) => setTestBlockPassageId(event.target.value)}
                      value={testBlockPassageId}
                    >
                      <option value="">PassageId</option>
                      {passageIds.map((id) => (
                        <option key={id} value={id}>
                          {id}
                        </option>
                      ))}
                    </SelectControl>
                    <SelectControl
                      className="px-3 py-2 pr-10 text-sm"
                      onChange={(event) => setTestBlockId(event.target.value)}
                      value={testBlockId}
                    >
                      <option value="">BlockId</option>
                      {blockIds.map((id) => (
                        <option key={id} value={id}>
                          {id}
                        </option>
                      ))}
                    </SelectControl>
                    <button className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50" onClick={addBlockRefToTestJson} type="button">Add block</button>
                  </div>
                </div>
              ) : null}
              <textarea className="h-[360px] w-full border border-slate-200/80 bg-slate-50/60 p-3 font-mono text-xs leading-6 text-slate-800 outline-none focus:border-emerald-400" onChange={(event) => { if (activeTab === "passages") setPassageJson(event.target.value); if (activeTab === "blocks") setBlockJson(event.target.value); if (activeTab === "tests") setTestJson(event.target.value); }} placeholder="JSON editor" spellCheck={false} value={activeTab === "passages" ? passageJson : activeTab === "blocks" ? blockJson : testJson} />
              <div className="flex flex-wrap gap-2"><button className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50" onClick={validateCurrent} type="button">Validate JSON</button><button className="emerald-gradient-fill inline-flex items-center justify-center rounded-full border border-emerald-300/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white disabled:cursor-not-allowed disabled:opacity-55" disabled={saving || !(activeTab === "passages" ? passageJson : activeTab === "blocks" ? blockJson : testJson).trim()} onClick={saveCurrent} type="button">{saving ? "Saving..." : `Save to ${activeTab === "passages" ? "reading_passages" : activeTab === "blocks" ? "reading_blocks" : "reading_tests"}`}</button></div>
              {validationErrors.length > 0 ? <div className="border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-900"><p className="font-semibold uppercase tracking-[0.12em]">Validation issues</p><ul className="mt-2 list-disc space-y-1 pl-5">{validationErrors.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
              <div className="border border-slate-200/80 bg-slate-50/60 px-3 py-2 text-xs text-slate-700">
                <p className="font-semibold uppercase tracking-[0.12em] text-slate-600">ID pattern examples</p>
                <p className="mt-1 font-mono">Test: rc_cmbr_10_1</p>
                <p className="font-mono">Passage: rc_cmbr_10_1_1</p>
                <p className="font-mono">Block: rc_cmbr_10_1_1_1-6</p>
              </div>
            </article>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default SuperAdminReadingPage;
