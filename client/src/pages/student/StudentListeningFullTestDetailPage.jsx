
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { apiRequest, API_BASE_URL } from "../../lib/apiClient";

const START_COUNTDOWN_SECONDS = 3;
const GOOD_SCORE_THRESHOLD_PERCENT = 70;
const TOMATO_COLOR = "#ff6347";
const BLOCK_RANGE_ID_PATTERN = /^(.*)_(\d+)-(\d+)$/;

function toReadableLabel(value) {
  const safe = String(value || "").trim();
  if (!safe) {
    return "Unknown";
  }

  return safe
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function decodeValue(value) {
  try {
    return decodeURIComponent(String(value || "").trim());
  } catch {
    return String(value || "").trim();
  }
}

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseBlockQuestionRange(blockId) {
  const safeBlockId = String(blockId || "").trim();
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

  return { start, end };
}

function resolveQuestionRangeFromBlockEntry(block = {}) {
  const explicitStart = toFiniteNumber(block?.questionRange?.start);
  const explicitEnd = toFiniteNumber(block?.questionRange?.end);
  if (Number.isFinite(explicitStart) && Number.isFinite(explicitEnd) && explicitStart <= explicitEnd) {
    return { start: explicitStart, end: explicitEnd };
  }

  return parseBlockQuestionRange(block?.blockId);
}

function compareBlocksByQuestionRange(left, right) {
  const leftStart = toFiniteNumber(left?.questionRange?.start);
  const rightStart = toFiniteNumber(right?.questionRange?.start);
  const leftStartIsFinite = Number.isFinite(leftStart);
  const rightStartIsFinite = Number.isFinite(rightStart);
  if (leftStartIsFinite || rightStartIsFinite) {
    if (leftStartIsFinite && !rightStartIsFinite) {
      return -1;
    }

    if (!leftStartIsFinite && rightStartIsFinite) {
      return 1;
    }

    const startDiff = leftStart - rightStart;
    if (startDiff !== 0) {
      return startDiff;
    }
  }

  const leftEnd = toFiniteNumber(left?.questionRange?.end);
  const rightEnd = toFiniteNumber(right?.questionRange?.end);
  const leftEndIsFinite = Number.isFinite(leftEnd);
  const rightEndIsFinite = Number.isFinite(rightEnd);
  if (leftEndIsFinite || rightEndIsFinite) {
    if (leftEndIsFinite && !rightEndIsFinite) {
      return -1;
    }

    if (!leftEndIsFinite && rightEndIsFinite) {
      return 1;
    }

    const endDiff = leftEnd - rightEnd;
    if (endDiff !== 0) {
      return endDiff;
    }
  }

  const partDiff = Number(left?.partNumber || 0) - Number(right?.partNumber || 0);
  if (partDiff !== 0) {
    return partDiff;
  }

  return String(left?.blockId || "").localeCompare(String(right?.blockId || ""));
}

function normalizeAnswerText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function toAnswerArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  const safe = String(value || "").trim();
  return safe ? [safe] : [];
}

function toChoiceArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  const safe = String(value || "").trim();
  if (!safe) {
    return [];
  }

  if (safe.includes(",") || safe.includes(";")) {
    return safe
      .split(/[;,]/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [safe];
}

function inferChoiceSelectionLimit(questionText, instructionText, fallback = 1) {
  const source = `${String(questionText || "")} ${String(instructionText || "")}`.toLowerCase();
  const limitPatterns = [
    { regex: /\b(four|4)\b/, value: 4 },
    { regex: /\b(three|3)\b/, value: 3 },
    { regex: /\b(two|2)\b/, value: 2 },
    { regex: /\b(one|1)\b/, value: 1 },
  ];

  for (const pattern of limitPatterns) {
    if (pattern.regex.test(source)) {
      return pattern.value;
    }
  }

  return Math.max(1, Number(fallback) || 1);
}

function toChoiceTokenSet(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return new Set();
  }

  const tokens = normalized
    .split(/[;,/]+/g)
    .map((item) => item.trim())
    .filter(Boolean);

  return new Set(tokens);
}

function areSetsEqual(left, right) {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
}

function getNodeElement(node) {
  if (!node) {
    return null;
  }

  return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
}

function unwrapHighlightNode(node) {
  const parent = node?.parentNode;
  if (!parent) {
    return;
  }

  while (node.firstChild) {
    parent.insertBefore(node.firstChild, node);
  }

  parent.removeChild(node);
  parent.normalize();
}

function normalizeSelectedText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveQuestionIdForDisplay(question, context, fallbackIndex = 0) {
  const explicitId = String(question?.qid || question?.id || "").trim();
  if (explicitId) {
    return explicitId;
  }

  const number = Number(question?.number);
  if (Number.isFinite(number)) {
    const mapped = context?.questionIdByNumber?.get?.(number);
    if (mapped) {
      return mapped;
    }
  }

  return context?.orderedQuestionIds?.[fallbackIndex] || "";
}

function getChoiceOptionValue(option, optionIndex) {
  const byKey = String(option?.key || "").trim();
  if (byKey) {
    return byKey;
  }

  const byLabel = String(option?.label || "").trim();
  if (byLabel) {
    return byLabel;
  }

  const byId = String(option?.id || "").trim();
  if (byId) {
    return byId;
  }

  const byValue = String(option?.value || "").trim();
  if (byValue) {
    return byValue;
  }

  return String.fromCharCode(65 + optionIndex);
}

function getChoiceOptionLabel(option, optionIndex) {
  const byKey = String(option?.key || "").trim();
  if (byKey) {
    return byKey;
  }

  const byLabel = String(option?.label || "").trim();
  if (byLabel) {
    return byLabel;
  }

  return String.fromCharCode(65 + optionIndex);
}

function getChoiceOptionText(option, optionIndex) {
  const byText = String(option?.text || "").trim();
  if (byText) {
    return byText;
  }

  const byTitle = String(option?.title || "").trim();
  if (byTitle) {
    return byTitle;
  }

  return getChoiceOptionValue(option, optionIndex);
}

function collectQuestionIdsFromNode(node, ids) {
  if (Array.isArray(node)) {
    node.forEach((entry) => collectQuestionIdsFromNode(entry, ids));
    return;
  }

  if (!node || typeof node !== "object") {
    return;
  }

  if (node.type === "gap") {
    const questionId = String(node.qid || node.id || node.number || "").trim();
    if (questionId) {
      ids.add(questionId);
    }
  }

  Object.values(node).forEach((value) => collectQuestionIdsFromNode(value, ids));
}

function collectInlineQuestionIds(display) {
  const ids = new Set();
  collectQuestionIdsFromNode(display, ids);
  return ids;
}

function renderContentToken(token, key, context) {
  if (typeof token === "string") {
    return (
      <span className="whitespace-pre-wrap" key={key}>
        {token}
      </span>
    );
  }

  if (!token || typeof token !== "object") {
    return null;
  }

  if (token.type === "gap") {
    const questionId = String(token.qid || token.id || token.number || "").trim();
    if (!questionId) {
      return (
        <span
          className="inline-flex min-w-8 items-center justify-center border border-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-600"
          key={key}
        >
          [{token.number || "?"}]
        </span>
      );
    }

    return (
      <input
        autoComplete="off"
        className={`h-10 w-44 border bg-white px-3 text-center text-sm font-semibold text-slate-700 outline-none transition ${context.isInputDisabled
          ? "cursor-not-allowed border-slate-300 text-slate-400"
          : "border-slate-300 focus:border-emerald-500"
          }`}
        disabled={context.isInputDisabled}
        key={key}
        maxLength={42}
        onChange={(event) => context.onAnswerChange(questionId, event.target.value)}
        onKeyDown={(event) => context.onAnswerKeyDown(event, questionId)}
        placeholder={String(token.number || "")}
        ref={(node) => context.registerAnswerInputRef(questionId, node)}
        spellCheck={false}
        type="text"
        value={context.answersById[questionId] || ""}
      />
    );
  }

  if (token.type === "example_gap") {
    return (
      <span
        className="inline-flex border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
        key={key}
      >
        {token.text || ""}
      </span>
    );
  }

  return (
    <span
      className="inline-flex border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
      key={key}
    >
      {JSON.stringify(token)}
    </span>
  );
}

function renderContent(content = [], context) {
  if (!Array.isArray(content) || content.length === 0) {
    return null;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {content.map((token, index) => renderContentToken(token, `${index}-${typeof token}`, context))}
    </span>
  );
}

function renderStructuredContent(value, context, keyPrefix = "content") {
  if (Array.isArray(value)) {
    const hasNestedArrays = value.some((entry) => Array.isArray(entry));
    if (!hasNestedArrays) {
      return renderContent(value, context);
    }

    return (
      <div className="space-y-1.5">
        {value.map((entry, index) => (
          <div className="text-sm leading-7 text-slate-700" key={`${keyPrefix}-${index}`}>
            {renderStructuredContent(entry, context, `${keyPrefix}-${index}`)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "string" || (value && typeof value === "object")) {
    return renderContent([value], context);
  }

  return null;
}
function renderChoiceOptions(question, options = [], keyPrefix = "option", context, fallbackIndex = 0) {
  if (!Array.isArray(options) || options.length === 0) {
    return null;
  }

  const questionId = resolveQuestionIdForDisplay(question, context, fallbackIndex);
  const selectedValues = toChoiceArray(context?.answersById?.[questionId]).map((item) =>
    normalizeAnswerText(item),
  );
  const explicitSelectionLimit = Number(
    question?.selectionLimit ?? question?.maxSelections ?? question?.maxAnswers,
  );
  const selectionLimit = Math.max(
    1,
    Number.isFinite(explicitSelectionLimit) && explicitSelectionLimit > 0
      ? explicitSelectionLimit
      : Number(context?.getChoiceSelectionLimit?.(question, questionId) || 1),
  );

  return (
    <ul className="mt-2 space-y-2">
      {options.map((option, optionIndex) => (
        <li key={`${keyPrefix}-${optionIndex}`}>
          {(() => {
            const optionValue = getChoiceOptionValue(option, optionIndex);
            const isSelected = selectedValues.includes(normalizeAnswerText(optionValue));
            return (
          <button
            className={`flex w-full items-start gap-2 border px-3 py-2 text-left text-sm leading-6 transition ${
              isSelected
                ? "border-emerald-400 bg-emerald-50 text-slate-900"
                : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200"
            } ${context?.isInputDisabled ? "cursor-not-allowed opacity-75" : ""}`}
            disabled={context?.isInputDisabled || !questionId}
            onClick={() =>
              context?.onChoiceSelect?.(questionId, optionValue, selectionLimit)
            }
            type="button"
          >
            <span className="inline-flex min-w-6 font-semibold text-slate-900">
              {getChoiceOptionLabel(option, optionIndex)}.
            </span>
            <span>{getChoiceOptionText(option, optionIndex) || "-"}</span>
          </button>
            );
          })()}
        </li>
      ))}
    </ul>
  );
}

function renderDisplayElement(element, index, context) {
  const type = element?.type || "";
  const key = `${type}-${index}`;

  if (type === "subheading") {
    return (
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700" key={key}>
        {element.text || "-"}
      </h3>
    );
  }

  if (type === "bullet_row") {
    return (
      <li className="ml-5 list-disc text-sm leading-7 text-slate-700" key={key}>
        {renderContent(element.content, context)}
      </li>
    );
  }

  if (type === "example" || type === "form_row") {
    return (
      <div className="grid gap-2 border border-slate-200 bg-white px-4 py-3 sm:grid-cols-[220px_1fr]" key={key}>
        <p className="text-sm font-semibold text-slate-700">{element.label || "-"}</p>
        <div className="text-sm leading-7 text-slate-700">{renderContent(element.content, context)}</div>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700" key={key}>
      {element?.label ? <p className="font-semibold text-slate-700">{element.label}</p> : null}
      {renderContent(element?.content, context)}
    </div>
  );
}

function renderTaskContent(display, context) {
  const directQuestion = String(display?.question || display?.stem || "").trim();
  const directOptions = Array.isArray(display?.options) ? display.options : [];
  if (directQuestion && directOptions.length > 0) {
    const hasExplicitQuestionReference =
      Boolean(String(display?.qid || display?.id || "").trim()) ||
      Number.isFinite(Number(display?.number));
    const sharedQuestionTargets = hasExplicitQuestionReference
      ? []
      : Array.isArray(context?.orderedQuestions)
        ? context.orderedQuestions
          .map((question, index) => ({
            id: String(question?.id || "").trim(),
            number: Number.isFinite(Number(question?.number)) ? Number(question.number) : index + 1,
          }))
          .filter((question) => question.id)
        : [];

    if (sharedQuestionTargets.length > 1) {
      return (
        <section className="space-y-3 border border-slate-200 bg-slate-50/50 px-4 py-4">
          <p className="text-base font-semibold leading-7 text-slate-900">{directQuestion}</p>
          <div className="space-y-3">
            {sharedQuestionTargets.map((question, questionIndex) => (
              <section
                className="space-y-2 border border-slate-200 bg-white/90 px-3 py-3"
                key={`shared-question-${question.id}`}
              >
                <p className="text-sm font-semibold leading-6 text-slate-900">
                  {Number.isFinite(Number(question.number))
                    ? `${Number(question.number)}.`
                    : `Question ${questionIndex + 1}`}
                </p>
                {renderChoiceOptions(
                  {
                    id: question.id,
                    number: question.number,
                    text: directQuestion,
                    selectionLimit: 1,
                  },
                  directOptions,
                  `shared-question-${questionIndex}-option`,
                  context,
                  questionIndex,
                )}
              </section>
            ))}
          </div>
        </section>
      );
    }

    return (
      <section className="space-y-3 border border-slate-200 bg-slate-50/50 px-4 py-4">
        <p className="text-base font-semibold leading-7 text-slate-900">{directQuestion}</p>
        {renderChoiceOptions(display, directOptions, "single-question-option", context, 0)}
      </section>
    );
  }

  const mcQuestions = Array.isArray(display?.questions) ? display.questions : [];
  if (mcQuestions.length > 0) {
    return (
      <div className="space-y-4">
        {String(display?.title || "").trim() ? (
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">
            {String(display.title).trim()}
          </h3>
        ) : null}
        {mcQuestions.map((question, questionIndex) => (
          <section
            className="space-y-2 border border-slate-200 bg-slate-50/50 px-4 py-4"
            key={`mc-question-${question?.qid || question?.id || questionIndex}`}
          >
            <p className="text-sm font-semibold leading-7 text-slate-900">
              {Number.isFinite(Number(question?.number)) ? `${Number(question.number)}. ` : ""}
              {String(question?.text || "").trim() || "Question"}
            </p>
            {renderChoiceOptions(
              question,
              Array.isArray(question?.options) ? question.options : [],
              `mc-question-${questionIndex}-option`,
              context,
              questionIndex,
            )}
          </section>
        ))}
      </div>
    );
  }

  const elements = Array.isArray(display?.elements) ? display.elements : [];
  if (elements.length > 0) {
    return <div className="space-y-3">{elements.map((element, index) => renderDisplayElement(element, index, context))}</div>;
  }

  const sections = Array.isArray(display?.sections) ? display.sections : [];
  if (sections.length > 0) {
    return (
      <div className="space-y-5">
        {sections.map((section, sectionIndex) => (
          <section className="space-y-3" key={`section-${sectionIndex}`}>
            {section?.heading ? (
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">{section.heading}</h3>
            ) : null}
            <ul className="ml-5 list-disc space-y-2 text-sm leading-7 text-slate-700">
              {(Array.isArray(section?.items) ? section.items : []).map((item, itemIndex) => (
                <li key={`section-${sectionIndex}-item-${itemIndex}`}>
                  {renderStructuredContent(item, context, `section-${sectionIndex}-item-${itemIndex}`)}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  const rows = Array.isArray(display?.rows) ? display.rows : [];
  if (rows.length > 0) {
    const columns = Array.isArray(display?.columns) ? display.columns : [];

    return (
      <div className="overflow-x-auto border border-slate-200">
        <table className="min-w-full border-collapse text-sm text-slate-700">
          {columns.length > 0 ? (
            <thead className="bg-slate-50">
              <tr>
                {columns.map((column, columnIndex) => (
                  <th
                    className="border border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-600"
                    key={`column-${columnIndex}`}
                    scope="col"
                  >
                    {column || "-"}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr className="align-top" key={`row-${rowIndex}`}>
                <th className="border border-slate-200 bg-white px-3 py-2 text-left font-semibold text-slate-700" scope="row">
                  {row?.label || "-"}
                </th>
                {(Array.isArray(row?.cells) ? row.cells : []).map((cell, cellIndex) => (
                  <td className="border border-slate-200 px-3 py-2 text-sm leading-7 text-slate-700" key={`row-${rowIndex}-cell-${cellIndex}`}>
                    {renderStructuredContent(cell, context, `row-${rowIndex}-cell-${cellIndex}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const legacyHeadings = Array.isArray(display?.headings) ? display.headings : [];
  const legacyReservedKeys = new Set([
    "title",
    "headings",
    "rows",
    "columns",
    "elements",
    "sections",
    "items",
    "questions",
    "question",
    "stem",
    "options",
  ]);
  const legacyRows = Object.entries(display || {})
    .filter(([key, value]) => !legacyReservedKeys.has(key) && Array.isArray(value))
    .map(([key, value]) => ({
      label: toReadableLabel(key),
      cells: value,
    }));

  if (legacyHeadings.length > 0 && legacyRows.length > 0) {
    return (
      <div className="overflow-x-auto border border-slate-200">
        <table className="min-w-full border-collapse text-sm text-slate-700">
          <thead className="bg-slate-50">
            <tr>
              <th
                className="border border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-600"
                scope="col"
              >
                -
              </th>
              {legacyHeadings.map((heading, headingIndex) => (
                <th
                  className="border border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-600"
                  key={`legacy-heading-${headingIndex}`}
                  scope="col"
                >
                  {String(heading || "").trim() || "-"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {legacyRows.map((row, rowIndex) => (
              <tr className="align-top" key={`legacy-row-${rowIndex}`}>
                <th className="border border-slate-200 bg-white px-3 py-2 text-left font-semibold text-slate-700" scope="row">
                  {row.label || "-"}
                </th>
                {legacyHeadings.map((_, cellIndex) => (
                  <td className="border border-slate-200 px-3 py-2 text-sm leading-7 text-slate-700" key={`legacy-row-${rowIndex}-cell-${cellIndex}`}>
                    {renderStructuredContent(
                      row.cells[cellIndex],
                      context,
                      `legacy-row-${rowIndex}-cell-${cellIndex}`,
                    ) || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const items = Array.isArray(display?.items) ? display.items : [];
  if (items.length > 0) {
    return (
      <ul className="ml-5 list-disc space-y-2 text-sm leading-7 text-slate-700">
        {items.map((item, itemIndex) => (
          <li key={`items-${itemIndex}`}>{renderStructuredContent(item, context, `items-${itemIndex}`)}</li>
        ))}
      </ul>
    );
  }

  return <p className="text-sm text-slate-500">No task content available for this block.</p>;
}

function StudentListeningFullTestDetailPage() {
  const { testId: testIdParam = "", partNumber: partNumberParam = "" } = useParams();
  const testId = decodeValue(testIdParam);
  const parsedPartNumber = Number.parseInt(decodeValue(partNumberParam), 10);
  const activePartNumber =
    Number.isFinite(parsedPartNumber) && parsedPartNumber > 0 ? parsedPartNumber : null;
  const isPartMode = Number.isFinite(activePartNumber);
  const backLink = isPartMode ? "/student/tests/listening/by-part" : "/student/tests/listening/full";
  const backLabel = isPartMode ? "Part-by-part listening" : "Full listening tests";
  const runTypeLabel = isPartMode ? `Part ${activePartNumber}` : "full listening test";

  const [test, setTest] = useState(null);
  const [blocksById, setBlocksById] = useState({});
  const [isLoadingTest, setIsLoadingTest] = useState(false);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const [error, setError] = useState("");
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [answersByBlockId, setAnswersByBlockId] = useState({});

  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isCountdownRunning, setIsCountdownRunning] = useState(false);
  const [countdownValue, setCountdownValue] = useState(null);
  const [hasExamStarted, setHasExamStarted] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const [isFinalModalOpen, setIsFinalModalOpen] = useState(false);
  const [finalResult, setFinalResult] = useState(null);

  const audioRef = useRef(null);
  const instructionRef = useRef(null);
  const taskContentRef = useRef(null);
  const answerInputRefs = useRef(new Map());
  const countdownIntervalRef = useRef(null);
  const submittedBlockIdsRef = useRef(new Set());
  const resultByBlockIdRef = useRef(new Map());
  const pendingSubmitPromisesRef = useRef([]);
  const allowManualPauseRef = useRef(false);
  const isFinalizingRef = useRef(false);
  const shouldAutoPlayRef = useRef(false);
  const pauseGuardUntilRef = useRef(0);
  useEffect(() => {
    let isMounted = true;

    async function loadTest() {
      setIsLoadingTest(true);
      setError("");
      setBlocksById({});
      setCurrentBlockIndex(0);
      setAnswersByBlockId({});
      setAudioError("");
      setSubmitError("");
      setIsFinalModalOpen(false);
      setFinalResult(null);
      setIsStartModalOpen(false);
      setIsCountdownRunning(false);
      setCountdownValue(null);
      setHasExamStarted(false);
      setIsAudioPlaying(false);

      submittedBlockIdsRef.current.clear();
      resultByBlockIdRef.current.clear();
      pendingSubmitPromisesRef.current = [];
      isFinalizingRef.current = false;
      shouldAutoPlayRef.current = false;
      pauseGuardUntilRef.current = 0;

      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }

      try {
        const response = await apiRequest(`/listening-tests/${encodeURIComponent(testId)}`, {
          auth: false,
        });
        if (!isMounted) {
          return;
        }

        setTest(response?.test || null);
      } catch (nextError) {
        if (!isMounted) {
          return;
        }

        setError(nextError.message || "Failed to load full listening test.");
      } finally {
        if (isMounted) {
          setIsLoadingTest(false);
        }
      }
    }

    loadTest();

    return () => {
      isMounted = false;
    };
  }, [activePartNumber, testId]);

  const orderedBlocks = useMemo(() => {
    const parts = Array.isArray(test?.parts) ? test.parts : [];
    const scopedParts = isPartMode
      ? parts.filter((part) => Number(part?.partNumber) === Number(activePartNumber))
      : parts;
    const flattened = [];
    const seenBlockIds = new Set();

    for (const part of scopedParts) {
      const blocks = Array.isArray(part?.blocks) ? part.blocks : [];
      for (const block of blocks) {
        const blockId = String(block?.blockId || "").trim();
        if (!blockId || seenBlockIds.has(blockId)) {
          continue;
        }
        seenBlockIds.add(blockId);

        flattened.push({
          blockId,
          partNumber: part?.partNumber,
          questionRange: resolveQuestionRangeFromBlockEntry(block),
          questionFamily: block?.questionFamily || "",
        });
      }
    }

    return flattened.sort(compareBlocksByQuestionRange);
  }, [activePartNumber, isPartMode, test?.parts]);

  useEffect(() => {
    let isMounted = true;

    async function loadBlocks() {
      if (!orderedBlocks.length) {
        setBlocksById({});
        setIsStartModalOpen(false);
        if (isPartMode) {
          setError(`No blocks found for Part ${activePartNumber}.`);
        }
        return;
      }

      setIsLoadingBlocks(true);
      setError("");

      try {
        const responses = await Promise.all(
          orderedBlocks.map(({ blockId }) =>
            apiRequest(`/listening-blocks/${encodeURIComponent(blockId)}`, { auth: false }),
          ),
        );

        if (!isMounted) {
          return;
        }

        const nextBlocksById = {};
        responses.forEach((response, index) => {
          const blockId = orderedBlocks[index]?.blockId;
          if (!blockId) {
            return;
          }

          nextBlocksById[blockId] = {
            block: response?.block || null,
            audio: response?.audio || null,
          };
        });

        setBlocksById(nextBlocksById);
        setCurrentBlockIndex(0);
        setIsStartModalOpen(true);
      } catch (nextError) {
        if (!isMounted) {
          return;
        }

        setError(nextError.message || "Failed to load test blocks.");
      } finally {
        if (isMounted) {
          setIsLoadingBlocks(false);
        }
      }
    }

    loadBlocks();

    return () => {
      isMounted = false;
    };
  }, [activePartNumber, isPartMode, orderedBlocks]);

  const currentEntry = orderedBlocks[currentBlockIndex] || null;
  const currentBlockId = currentEntry?.blockId || "";
  const currentBlockPayload = currentBlockId ? blocksById[currentBlockId] : null;
  const currentBlock = currentBlockPayload?.block || null;
  const currentAudio = currentBlockPayload?.audio || null;
  const blockIndexById = useMemo(() => {
    const map = new Map();
    orderedBlocks.forEach((entry, index) => {
      map.set(entry.blockId, index);
    });
    return map;
  }, [orderedBlocks]);

  const currentAudioUrl = useMemo(
    () =>
      currentBlockId
        ? `${API_BASE_URL}/listening-blocks/${encodeURIComponent(currentBlockId)}/audio`
        : "",
    [currentBlockId],
  );

  const orderedQuestions = useMemo(() => {
    const questions = Array.isArray(currentBlock?.questions) ? [...currentBlock.questions] : [];
    return questions
      .map((question, index) => {
        const questionId = String(question?.id || question?.qid || question?.number || `q-${index + 1}`).trim();
        return {
          id: questionId,
          number: Number.isFinite(Number(question?.number)) ? Number(question.number) : index + 1,
          text: String(question?.text || "").trim(),
          answers: toAnswerArray(question?.answer || question?.answers),
        };
      })
      .filter((question) => question.id)
      .sort((left, right) => Number(left.number || 0) - Number(right.number || 0));
  }, [currentBlock?.questions]);

  const questionMetaById = useMemo(() => {
    const map = new Map();
    const instructionText = String(currentBlock?.instruction?.text || "").trim();

    orderedQuestions.forEach((question) => {
      const acceptedAnswers = toAnswerArray(question?.answers);
      const selectionLimit = inferChoiceSelectionLimit(
        String(question?.text || ""),
        instructionText,
        acceptedAnswers.length > 1 ? acceptedAnswers.length : 1,
      );

      map.set(question.id, {
        selectionLimit,
      });
    });

    return map;
  }, [currentBlock?.instruction?.text, orderedQuestions]);

  const questionIdByNumber = useMemo(() => {
    const map = new Map();
    orderedQuestions.forEach((question) => {
      const questionNumber = Number(question?.number);
      if (!Number.isFinite(questionNumber) || map.has(questionNumber)) {
        return;
      }

      map.set(questionNumber, question.id);
    });
    return map;
  }, [orderedQuestions]);

  const inlineQuestionIdSet = useMemo(
    () => collectInlineQuestionIds(currentBlock?.display),
    [currentBlock?.display],
  );

  const currentAnswers = answersByBlockId[currentBlockId] || {};

  const hasInlineChoiceQuestions = useMemo(() => {
    const directQuestion = String(currentBlock?.display?.question || currentBlock?.display?.stem || "").trim();
    const directOptions = Array.isArray(currentBlock?.display?.options) ? currentBlock.display.options : [];
    const groupedQuestions = Array.isArray(currentBlock?.display?.questions) ? currentBlock.display.questions : [];
    return (directQuestion && directOptions.length > 0) || groupedQuestions.length > 0;
  }, [currentBlock?.display]);

  const fallbackQuestionIds = useMemo(() => {
    if (hasInlineChoiceQuestions) {
      return [];
    }

    return orderedQuestions
      .filter((question) => !inlineQuestionIdSet.has(question.id))
      .map((question) => question.id);
  }, [hasInlineChoiceQuestions, inlineQuestionIdSet, orderedQuestions]);

  const clearHighlights = useCallback((rootElement) => {
    if (!rootElement) {
      return;
    }

    const highlightedNodes = rootElement.querySelectorAll("[data-listening-highlight='true']");
    highlightedNodes.forEach((node) => unwrapHighlightNode(node));
  }, []);

  const handleTextSelectionToggle = useCallback((containerRef) => {
    const rootElement = containerRef?.current;
    if (!rootElement) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }

    const selectedText = selection.toString();
    if (!selectedText || !selectedText.trim()) {
      selection.removeAllRanges();
      return;
    }

    const range = selection.getRangeAt(0);
    if (!rootElement.contains(range.commonAncestorContainer)) {
      return;
    }

    const startElement = getNodeElement(selection.anchorNode);
    const endElement = getNodeElement(selection.focusNode);
    if (startElement?.closest?.("input, textarea") || endElement?.closest?.("input, textarea")) {
      return;
    }

    const startHighlight = startElement?.closest?.("[data-listening-highlight='true']");
    const endHighlight = endElement?.closest?.("[data-listening-highlight='true']");

    if (startHighlight && startHighlight === endHighlight) {
      const normalizedSelected = normalizeSelectedText(selectedText);
      const normalizedHighlight = normalizeSelectedText(startHighlight.textContent);

      if (normalizedSelected && normalizedSelected === normalizedHighlight) {
        unwrapHighlightNode(startHighlight);
        selection.removeAllRanges();
        return;
      }
    }

    const marker = document.createElement("mark");
    marker.setAttribute("data-listening-highlight", "true");
    marker.className = "bg-yellow-300/80 text-slate-900";

    try {
      range.surroundContents(marker);
    } catch {
      // Ignore invalid multi-node selections that cannot be wrapped safely.
    }

    selection.removeAllRanges();
  }, []);

  const registerAnswerInputRef = useCallback((questionId, node) => {
    const safeQuestionId = String(questionId || "").trim();
    if (!safeQuestionId) {
      return;
    }

    if (node) {
      answerInputRefs.current.set(safeQuestionId, node);
      return;
    }

    answerInputRefs.current.delete(safeQuestionId);
  }, []);
  const handleAnswerChange = useCallback(
    (questionId, value) => {
      if (!currentBlockId) {
        return;
      }

      const safeQuestionId = String(questionId || "").trim();
      if (!safeQuestionId) {
        return;
      }

      setAnswersByBlockId((previousMap) => ({
        ...previousMap,
        [currentBlockId]: {
          ...(previousMap[currentBlockId] || {}),
          [safeQuestionId]: String(value || ""),
        },
      }));
    },
    [currentBlockId],
  );

  const orderedQuestionIds = useMemo(() => orderedQuestions.map((question) => question.id), [orderedQuestions]);

  const handleAnswerKeyDown = useCallback(
    (event, questionId) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      const currentIndex = orderedQuestionIds.indexOf(questionId);
      if (currentIndex < 0) {
        return;
      }

      const nextQuestionId = orderedQuestionIds[currentIndex + 1];
      if (!nextQuestionId) {
        return;
      }

      const nextInput = answerInputRefs.current.get(nextQuestionId);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    },
    [orderedQuestionIds],
  );

  const buildAnswerPayloadForCurrentBlock = useCallback(() => {
    return orderedQuestions.map((question) => ({
      questionId: question.id,
      questionNumber: question.number,
      value: (() => {
        const rawValue = currentAnswers[question.id];
        if (Array.isArray(rawValue)) {
          return rawValue.join(", ");
        }

        return String(rawValue || "").trim();
      })(),
    }));
  }, [currentAnswers, orderedQuestions]);

  const evaluateCurrentBlockLocally = useCallback(() => {
    const answersPayload = buildAnswerPayloadForCurrentBlock();
    const byQuestionId = new Map(answersPayload.map((answer) => [answer.questionId, answer.value]));
    const isMultipleChoiceBlock = /multiple[_-]?choice/i.test(
      `${String(currentBlock?.blockType || "")} ${String(currentBlock?.questionFamily || "")}`,
    );
    const isMultipleChoiceMultiBlock = /multiple[_-]?choice[_-]?multi/i.test(
      `${String(currentBlock?.blockType || "")} ${String(currentBlock?.questionFamily || "")}`,
    );

    let results = [];

    if (isMultipleChoiceMultiBlock) {
      const expectedChoiceSet = new Set();
      orderedQuestions.forEach((question) => {
        const acceptedAnswers = toAnswerArray(question.answers);
        acceptedAnswers.forEach((answer) => {
          const tokenSet = toChoiceTokenSet(answer);
          tokenSet.forEach((token) => expectedChoiceSet.add(token));
        });
      });
      const expectedTokens = Array.from(expectedChoiceSet).sort((left, right) => left.localeCompare(right));

      const submittedChoiceSet = new Set();
      answersPayload.forEach((answerItem) => {
        const tokenSet = toChoiceTokenSet(answerItem?.value || "");
        tokenSet.forEach((token) => submittedChoiceSet.add(token));
      });

      results = orderedQuestions.map((question, index) => {
        const expectedToken = expectedTokens[index] || "";
        const isGradable = Boolean(expectedToken);
        const isCorrect = isGradable && submittedChoiceSet.has(expectedToken);
        return {
          questionId: question.id,
          questionNumber: question.number,
          studentAnswer: isCorrect ? expectedToken.toUpperCase() : "",
          acceptedAnswers: isGradable ? [expectedToken.toUpperCase()] : toAnswerArray(question.answers),
          isGradable,
          isCorrect,
        };
      });
    } else {
      results = orderedQuestions.map((question) => {
        const studentAnswer = String(byQuestionId.get(question.id) || "").trim();
        const acceptedAnswers = toAnswerArray(question.answers);
        const normalizedAccepted = new Set(acceptedAnswers.map((item) => normalizeAnswerText(item)).filter(Boolean));
        const normalizedStudent = normalizeAnswerText(studentAnswer);
        const isGradable = normalizedAccepted.size > 0;
        const inferredSelectionLimit = inferChoiceSelectionLimit(
          String(question?.text || ""),
          String(currentBlock?.instruction?.text || ""),
          acceptedAnswers.length > 1 ? acceptedAnswers.length : 1,
        );
        const shouldUseMultiSelectMatch =
          isMultipleChoiceBlock &&
          (inferredSelectionLimit > 1 ||
            (acceptedAnswers.length > 1 &&
              acceptedAnswers.every((answer) => toChoiceTokenSet(answer).size <= 1)));

        let isCorrect = false;
        if (isGradable && shouldUseMultiSelectMatch) {
          const expectedChoiceSet = new Set();
          acceptedAnswers.forEach((answer) => {
            const tokenSet = toChoiceTokenSet(answer);
            tokenSet.forEach((token) => expectedChoiceSet.add(token));
          });

          const studentChoiceSet = toChoiceTokenSet(studentAnswer);
          isCorrect = studentChoiceSet.size > 0 && areSetsEqual(studentChoiceSet, expectedChoiceSet);
        } else {
          isCorrect = isGradable && normalizedStudent && normalizedAccepted.has(normalizedStudent);
        }

        return {
          questionId: question.id,
          questionNumber: question.number,
          studentAnswer,
          acceptedAnswers,
          isGradable,
          isCorrect,
        };
      });
    }

    const gradableResults = results.filter((item) => item.isGradable);
    const scoreBase = gradableResults.length > 0 ? gradableResults : results;
    const totalQuestions = scoreBase.length;
    const correctCount = scoreBase.filter((item) => item.isCorrect).length;
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const title =
      String(currentBlock?.display?.title || "").trim() ||
      `${toReadableLabel(currentEntry?.questionFamily)} Task ${currentBlockIndex + 1}`;

    const incorrectItems = scoreBase
      .filter((item) => !item.isCorrect)
      .map((item) => ({
        blockId: currentBlockId,
        blockTitle: title,
        questionNumber: item.questionNumber,
        studentAnswer: item.studentAnswer,
        acceptedAnswers: item.acceptedAnswers,
      }));

    return {
      blockId: currentBlockId,
      blockTitle: title,
      correctCount,
      totalQuestions,
      percentage,
      incorrectItems,
      answersPayload,
    };
  }, [
    buildAnswerPayloadForCurrentBlock,
    currentBlock?.display?.title,
    currentBlock?.blockType,
    currentBlock?.questionFamily,
    currentBlock?.instruction?.text,
    currentBlockId,
    currentBlockIndex,
    currentEntry?.questionFamily,
    orderedQuestions,
  ]);

  const summarizeAndOpenFinalModal = useCallback(
    async (forceReason = "") => {
      if (isFinalizingRef.current) {
        return;
      }

      isFinalizingRef.current = true;
      shouldAutoPlayRef.current = false;
      pauseGuardUntilRef.current = Date.now() + 700;
      allowManualPauseRef.current = true;
      const audioElement = audioRef.current;
      if (audioElement) {
        audioElement.pause();
      }
      allowManualPauseRef.current = false;

      setHasExamStarted(false);
      setIsAudioPlaying(false);

      try {
        await Promise.allSettled(pendingSubmitPromisesRef.current);
      } catch {
        // Ignore background submit failures here.
      }

      const allBlockResults = orderedBlocks
        .map((entry) => resultByBlockIdRef.current.get(entry.blockId))
        .filter(Boolean);

      const totalCorrect = allBlockResults.reduce((sum, result) => sum + Number(result.correctCount || 0), 0);
      const totalQuestions = allBlockResults.reduce((sum, result) => sum + Number(result.totalQuestions || 0), 0);
      const percentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
      const incorrectItems = allBlockResults.flatMap((result) =>
        Array.isArray(result.incorrectItems) ? result.incorrectItems : [],
      );

      setFinalResult({
        totalCorrect,
        totalQuestions,
        percentage,
        incorrectItems,
        forceReason: forceReason || "",
      });
      setIsFinalModalOpen(true);
    },
    [orderedBlocks],
  );

  const submitCurrentBlock = useCallback(
    (submitReason) => {
      if (!currentBlockId || !currentBlock) {
        return;
      }

      if (submittedBlockIdsRef.current.has(currentBlockId)) {
        return;
      }

      const localResult = evaluateCurrentBlockLocally();
      submittedBlockIdsRef.current.add(currentBlockId);
      resultByBlockIdRef.current.set(currentBlockId, localResult);

      const submitPromise = apiRequest(`/listening-blocks/${encodeURIComponent(currentBlockId)}/submit`, {
        method: "POST",
        body: {
          answers: localResult.answersPayload,
          submitReason: String(submitReason || "audio-ended"),
        },
      }).catch((nextError) => {
        setSubmitError(nextError.message || "Some blocks could not be saved to history.");
      });

      pendingSubmitPromisesRef.current.push(submitPromise);
    },
    [currentBlock, currentBlockId, evaluateCurrentBlockLocally],
  );

  const completeCurrentBlockAndMoveNext = useCallback(
    async (submitReason, forceFinishReason = "") => {
      if (!currentBlockId || isFinalizingRef.current) {
        return;
      }

      submitCurrentBlock(submitReason);

      if (forceFinishReason) {
        await summarizeAndOpenFinalModal(forceFinishReason);
        return;
      }

      const resolvedCurrentIndex = blockIndexById.has(currentBlockId)
        ? Number(blockIndexById.get(currentBlockId))
        : currentBlockIndex;
      const isLastBlock = resolvedCurrentIndex >= orderedBlocks.length - 1;
      if (isLastBlock) {
        await summarizeAndOpenFinalModal("");
        return;
      }

      setCurrentBlockIndex((previousIndex) => {
        const baseIndex = Math.max(previousIndex, resolvedCurrentIndex);
        return Math.min(baseIndex + 1, Math.max(orderedBlocks.length - 1, 0));
      });
    },
    [
      blockIndexById,
      currentBlockId,
      currentBlockIndex,
      orderedBlocks.length,
      submitCurrentBlock,
      summarizeAndOpenFinalModal,
    ],
  );

  const forceCompleteExam = useCallback(
    (reasonText, submitReason) => {
      if (isFinalizingRef.current || isFinalModalOpen) {
        return;
      }

      setSubmitError("");
      void completeCurrentBlockAndMoveNext(
        submitReason || "auto-complete",
        reasonText || `This ${runTypeLabel} was auto-completed.`,
      );
    },
    [completeCurrentBlockAndMoveNext, isFinalModalOpen, runTypeLabel],
  );

  useEffect(() => {
    answerInputRefs.current.clear();
    clearHighlights(instructionRef.current);
    clearHighlights(taskContentRef.current);
  }, [clearHighlights, currentBlockId]);

  useEffect(() => {
    if (!hasExamStarted || isStartModalOpen || isFinalModalOpen || isFinalizingRef.current) {
      return;
    }

    if (!currentBlockId || !currentBlock || !currentAudio?.exists) {
      void completeCurrentBlockAndMoveNext("audio-missing");
      return;
    }

    setAudioError("");
    setIsAudioPlaying(false);

    const audioElement = audioRef.current;
    if (!audioElement) {
      return;
    }
    shouldAutoPlayRef.current = true;
    pauseGuardUntilRef.current = Date.now() + 700;

    const timer = window.setTimeout(() => {
      audioElement.play().catch(() => {
        setAudioError("Automatic audio start was blocked. Keep this tab active and focused.");
      });
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    completeCurrentBlockAndMoveNext,
    currentAudio?.exists,
    currentBlock,
    currentBlockId,
    hasExamStarted,
    isFinalModalOpen,
    isStartModalOpen,
  ]);
  useEffect(() => {
    if (!hasExamStarted || isFinalModalOpen) {
      return undefined;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        forceCompleteExam("You switched tab/browser. Test auto-completed.", "tab-hidden");
      }
    };

    const handlePageHide = () => {
      forceCompleteExam("You left or refreshed the page. Test auto-completed.", "page-hide");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [forceCompleteExam, hasExamStarted, isFinalModalOpen]);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, []);

  const handleUnderstandStart = useCallback(() => {
    if (isCountdownRunning || !orderedBlocks.length || isFinalModalOpen) {
      return;
    }

    setIsCountdownRunning(true);
    setCountdownValue(START_COUNTDOWN_SECONDS);

    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    countdownIntervalRef.current = window.setInterval(() => {
      setCountdownValue((previousValue) => {
        if (previousValue === null) {
          return null;
        }

        if (previousValue <= 1) {
          if (countdownIntervalRef.current) {
            window.clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }

          setIsCountdownRunning(false);
          setIsStartModalOpen(false);
          setHasExamStarted(true);
          return null;
        }

        return previousValue - 1;
      });
    }, 1000);
  }, [isCountdownRunning, isFinalModalOpen, orderedBlocks.length]);

  const handleTryAgain = useCallback(() => {
    shouldAutoPlayRef.current = false;
    pauseGuardUntilRef.current = Date.now() + 700;
    allowManualPauseRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      try {
        audioRef.current.currentTime = 0;
      } catch {
        // Ignore seek errors.
      }
    }
    allowManualPauseRef.current = false;

    setAnswersByBlockId({});
    setCurrentBlockIndex(0);
    setAudioError("");
    setSubmitError("");
    setIsFinalModalOpen(false);
    setFinalResult(null);
    setIsCountdownRunning(false);
    setCountdownValue(null);
    setHasExamStarted(false);
    setIsAudioPlaying(false);

    submittedBlockIdsRef.current.clear();
    resultByBlockIdRef.current.clear();
    pendingSubmitPromisesRef.current = [];
    isFinalizingRef.current = false;

    clearHighlights(instructionRef.current);
    clearHighlights(taskContentRef.current);

    setIsStartModalOpen(true);
  }, [clearHighlights]);

  const isInputDisabled = !hasExamStarted || isFinalModalOpen;
  const showAudioPlayingEffect =
    Boolean(currentAudio?.exists) &&
    hasExamStarted &&
    !isFinalModalOpen &&
    isAudioPlaying;

  const handleChoiceSelect = useCallback((questionId, value, selectionLimit = 1) => {
    if (!hasExamStarted || isFinalModalOpen) {
      return;
    }

    const safeQuestionId = String(questionId || "").trim();
    if (!safeQuestionId) {
      return;
    }

    setAnswersByBlockId((previousMap) => {
      const currentBlockAnswers = previousMap[currentBlockId] || {};
      const safeValue = String(value || "").trim();
      if (!safeValue) {
        return previousMap;
      }

      const nextLimit = Math.max(1, Number(selectionLimit) || 1);
      const currentValues = toChoiceArray(currentBlockAnswers[safeQuestionId]);
      const normalizedCurrent = currentValues.map((item) => normalizeAnswerText(item));
      const normalizedSafeValue = normalizeAnswerText(safeValue);
      const existingIndex = normalizedCurrent.findIndex((item) => item === normalizedSafeValue);

      let nextValue;
      if (existingIndex >= 0) {
        const nextValues = currentValues.filter((_, index) => index !== existingIndex);
        nextValue = nextLimit <= 1 ? (nextValues[0] || "") : nextValues;
      } else if (nextLimit <= 1) {
        nextValue = safeValue;
      } else if (currentValues.length >= nextLimit) {
        nextValue = currentValues;
      } else {
        nextValue = [...currentValues, safeValue];
      }

      return {
        ...previousMap,
        [currentBlockId]: {
          ...currentBlockAnswers,
          [safeQuestionId]: nextValue,
        },
      };
    });
  }, [currentBlockId, hasExamStarted, isFinalModalOpen]);

  const renderContext = useMemo(
    () => ({
      answersById: currentAnswers,
      getChoiceSelectionLimit: (question, questionId) => {
        const questionMeta = questionMetaById.get(String(questionId || "").trim());
        if (questionMeta?.selectionLimit) {
          return questionMeta.selectionLimit;
        }

        return inferChoiceSelectionLimit(
          String(question?.text || question?.question || question?.stem || ""),
          String(currentBlock?.instruction?.text || ""),
          1,
        );
      },
      isInputDisabled,
      onAnswerChange: handleAnswerChange,
      onAnswerKeyDown: handleAnswerKeyDown,
      onChoiceSelect: handleChoiceSelect,
      orderedQuestions,
      orderedQuestionIds,
      questionIdByNumber,
      registerAnswerInputRef,
    }),
    [
      currentAnswers,
      questionMetaById,
      currentBlock?.instruction?.text,
      handleAnswerChange,
      handleAnswerKeyDown,
      handleChoiceSelect,
      isInputDisabled,
      orderedQuestions,
      orderedQuestionIds,
      questionIdByNumber,
      registerAnswerInputRef,
    ],
  );

  const finalPercentage = Number(finalResult?.percentage || 0);
  const isGoodFinalScore = finalPercentage >= GOOD_SCORE_THRESHOLD_PERCENT;

  return (
    <div className="space-y-8 pt-2 sm:pt-4">
      <header className="flex items-center justify-between gap-3">
        <Link
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-900"
          to={backLink}
        >
          <ChevronLeft className="h-4 w-4" />
          {backLabel}
        </Link>

        {showAudioPlayingEffect ? (
          <div className="inline-flex items-end gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Playing
            </span>
            <div className="flex h-4 items-end gap-1">
              <motion.span
                animate={{ scaleY: [0.35, 1, 0.35] }}
                className="h-3 w-1 origin-bottom bg-emerald-500"
                transition={{ duration: 0.7, ease: "easeInOut", repeat: Infinity, repeatType: "loop" }}
              />
              <motion.span
                animate={{ scaleY: [0.35, 1, 0.35] }}
                className="h-4 w-1 origin-bottom bg-emerald-500"
                transition={{
                  duration: 0.7,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatType: "loop",
                  delay: 0.12,
                }}
              />
              <motion.span
                animate={{ scaleY: [0.35, 1, 0.35] }}
                className="h-2.5 w-1 origin-bottom bg-emerald-500"
                transition={{
                  duration: 0.7,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatType: "loop",
                  delay: 0.24,
                }}
              />
            </div>
          </div>
        ) : null}
      </header>

      {isLoadingTest || isLoadingBlocks ? <p className="text-sm text-slate-600">Loading test...</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {submitError ? (
        <p className="rounded-none border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-600">{submitError}</p>
      ) : null}
      {audioError ? (
        <p className="rounded-none border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-600">{audioError}</p>
      ) : null}

      {!isLoadingTest && !isLoadingBlocks && !error && currentBlock ? (
        <>
          {currentAudio?.exists ? (
            <audio
              className="hidden"
              key={currentBlockId}
              onCanPlay={() => {
                if (!shouldAutoPlayRef.current) {
                  return;
                }

                const audioElement = audioRef.current;
                if (!audioElement) {
                  return;
                }

                audioElement.play().catch(() => {
                  setAudioError("Automatic audio start was blocked. Keep this tab active and focused.");
                });
              }}
              onEnded={() => {
                shouldAutoPlayRef.current = false;
                setIsAudioPlaying(false);
                void completeCurrentBlockAndMoveNext("audio-ended");
              }}
              onPause={() => {
                if (
                  !hasExamStarted ||
                  isFinalModalOpen ||
                  allowManualPauseRef.current ||
                  isFinalizingRef.current ||
                  Date.now() < pauseGuardUntilRef.current
                ) {
                  return;
                }

                const audioElement = audioRef.current;
                if (!audioElement || audioElement.ended) {
                  return;
                }

                pauseGuardUntilRef.current = Date.now() + 260;
                window.setTimeout(() => {
                  audioElement.play().catch(() => {
                    setAudioError("Audio pause is disabled during the full test.");
                  });
                }, 0);
              }}
              onPlay={() => {
                shouldAutoPlayRef.current = false;
                setAudioError("");
                setIsAudioPlaying(true);
              }}
              preload="auto"
              ref={audioRef}
            >
              <source src={currentAudioUrl} type={currentAudio?.mimeType || "audio/mpeg"} />
              Your browser does not support audio playback.
            </audio>
          ) : null}

          <section
            className="rounded-none border border-slate-800 bg-slate-950 p-6 text-slate-100 select-text"
            onMouseUp={() => handleTextSelectionToggle(instructionRef)}
            onTouchEnd={() => handleTextSelectionToggle(instructionRef)}
            ref={instructionRef}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">Instruction</p>
            <p className="mt-3 text-base leading-8">
              {currentBlock?.instruction?.text || "No instruction."}
            </p>
          </section>

          <section
            className="rounded-none border border-slate-200/80 bg-white/95 p-6 select-text"
            onMouseUp={() => handleTextSelectionToggle(taskContentRef)}
            onTouchEnd={() => handleTextSelectionToggle(taskContentRef)}
            ref={taskContentRef}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Task Content</p>
            <div className="mt-4">{renderTaskContent(currentBlock?.display, renderContext)}</div>
          </section>

          {fallbackQuestionIds.length > 0 ? (
            <section className="rounded-none border border-slate-200/80 bg-white/95 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Answers</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {fallbackQuestionIds.map((questionId) => {
                  const question = orderedQuestions.find((item) => item.id === questionId);
                  return (
                    <label className="space-y-2" htmlFor={`answer-${questionId}`} key={questionId}>
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Question {question?.number || questionId}
                      </span>
                      <input
                        autoComplete="off"
                        className={`h-10 w-full border bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition ${isInputDisabled
                          ? "cursor-not-allowed border-slate-300 text-slate-400"
                          : "border-slate-300 focus:border-emerald-500"
                          }`}
                        disabled={isInputDisabled}
                        id={`answer-${questionId}`}
                        maxLength={42}
                        onChange={(event) => handleAnswerChange(questionId, event.target.value)}
                        onKeyDown={(event) => handleAnswerKeyDown(event, questionId)}
                        ref={(node) => registerAnswerInputRef(questionId, node)}
                        spellCheck={false}
                        type="text"
                        value={currentAnswers[questionId] || ""}
                      />
                    </label>
                  );
                })}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
      {isFinalModalOpen && finalResult ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4"
          initial={{ opacity: 0 }}
          transition={{ duration: 0.26, ease: "easeOut" }}
        >
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-slate-200 bg-white p-6 text-center shadow-2xl sm:p-7"
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            transition={{ duration: 0.32, ease: "easeOut", delay: 0.04 }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Task Submitted</p>

            <p
              className="my-4 text-7xl font-black tracking-tight"
              style={{ color: isGoodFinalScore ? "#059669" : TOMATO_COLOR }}
            >
              {finalResult.totalCorrect}/{finalResult.totalQuestions}
            </p>

            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">
              {finalResult.percentage}% correct answers
            </p>

            <p className="mt-4 text-sm text-slate-600">
              Submit a second attempt to unlock answer keys.
            </p>
            <p className="text-sm text-slate-600">
              After your second submission, you can review the correct answers.
            </p>

            {finalResult.forceReason ? (
              <p className="mx-auto mt-4 max-w-xl rounded-none border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {finalResult.forceReason}
              </p>
            ) : null}

            {Array.isArray(finalResult.incorrectItems) && finalResult.incorrectItems.length > 0 ? (
              <div className="mt-6 space-y-2 text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Incorrect Answers</p>
                <div className="space-y-2">
                  {finalResult.incorrectItems.map((item, index) => (
                    <div className="border border-slate-200 bg-slate-50 px-3 py-2 text-sm" key={`${item.blockId}-${item.questionNumber}-${index}`}>
                      <p className="font-semibold text-slate-900">
                        {item.blockTitle} - Q{item.questionNumber}
                      </p>
                      <p className="text-slate-700">
                        Your answer: <span className="font-medium">{item.studentAnswer || "-"}</span>
                      </p>
                      <p className="text-slate-700">
                        Correct:{" "}
                        <span className="font-medium">
                          {Array.isArray(item.acceptedAnswers) && item.acceptedAnswers.length > 0
                            ? item.acceptedAnswers.join(" / ")
                            : "-"}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-6 text-sm font-medium text-emerald-700">Perfect score. No incorrect answers.</p>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:bg-slate-50"
                onClick={handleTryAgain}
                type="button"
              >
                Try Again
              </button>
              <Link
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:brightness-105"
                to={backLink}
              >
                Leave
              </Link>
            </div>
          </motion.div>
        </motion.div>
      ) : null}

      {isStartModalOpen ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4"
          initial={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-xl border border-slate-200 bg-white p-6 text-center shadow-2xl sm:p-7"
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ duration: 0.34, ease: "easeOut", delay: 0.05 }}
          >
            <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Before You Start</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900"><b>PAY ATTENTION !!!</b></h2>

            <div className="mx-auto mt-4 max-w-2xl space-y-2 text-base font-medium leading-8 text-slate-700">
              <p>
                As soon as you start, audio begins and cannot be paused.
                If you switch tabs, change browser, or refresh, the test auto-submits.
                Select text to highlight it. Select the same highlighted text again to remove highlight.
                Press Enter to move to the next answer field.
              </p>
            </div>

            <button
              className="mx-auto mt-6 inline-flex w-full max-w-[330px] items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 px-8 py-4 text-sm font-black uppercase tracking-[0.22em] text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isCountdownRunning || !orderedBlocks.length}
              onClick={handleUnderstandStart}
              type="button"
            >
              {isCountdownRunning && Number.isFinite(countdownValue)
                ? `Starting in ${countdownValue}`
                : "I Understand"}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </div>
  );
}

export default StudentListeningFullTestDetailPage;
