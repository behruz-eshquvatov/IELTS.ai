import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ChevronLeft, X } from "lucide-react";
import { motion as Motion } from "framer-motion";
import { apiRequest, API_BASE_URL } from "../../lib/apiClient";
import { getListeningPracticeConfig } from "../../data/listeningPractice";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useExamCopyBlocker from "../../hooks/useExamCopyBlocker";
import useExamLeaveProtection from "../../hooks/useExamLeaveProtection";
import useTextHighlighting from "../../hooks/useTextHighlighting";
import ExamLeaveWarningModal from "../../components/student/exam/ExamLeaveWarningModal";
import { TestPageSkeleton } from "../../components/ui/Skeleton";

const START_COUNTDOWN_SECONDS = 3;
const AUTO_COMPLETE_KEY_PREFIX = "student:listening:auto-complete:";
const GOOD_SCORE_THRESHOLD_PERCENT = 70;
const TOMATO_COLOR = "#ff6347";

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

function readAutoCompleteState(storageKey) {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = sessionStorage.getItem(storageKey);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function persistAutoCompleteState(storageKey, reason) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(
    storageKey,
    JSON.stringify({
      reason,
      timestamp: new Date().toISOString(),
    }),
  );
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

function computeNextChoiceValue(currentValue, value, selectionLimit = 1) {
  const safeValue = String(value || "").trim();
  if (!safeValue) {
    return currentValue || "";
  }

  const nextLimit = Math.max(1, Number(selectionLimit) || 1);
  const currentValues = toChoiceArray(currentValue);
  const normalizedCurrent = currentValues.map((item) => normalizeAnswerText(item));
  const normalizedSafeValue = normalizeAnswerText(safeValue);
  const existingIndex = normalizedCurrent.findIndex((item) => item === normalizedSafeValue);

  if (existingIndex >= 0) {
    const nextValues = currentValues.filter((_, index) => index !== existingIndex);
    return nextLimit <= 1 ? (nextValues[0] || "") : nextValues;
  }

  if (nextLimit <= 1) {
    return safeValue;
  }

  if (currentValues.length >= nextLimit) {
    return currentValues;
  }

  return [...currentValues, safeValue];
}

function toOrderedQuestionNumbers(values = []) {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set();
  const numbers = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .filter((value) => {
      const key = String(value);
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .sort((left, right) => left - right);

  return numbers;
}

function formatQuestionRangeLabel(questionNumbers = []) {
  const numbers = toOrderedQuestionNumbers(questionNumbers);
  if (numbers.length === 0) {
    return "";
  }

  if (numbers.length === 1) {
    return `Question ${numbers[0]}`;
  }

  return `Questions ${numbers[0]}-${numbers[numbers.length - 1]}`;
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
    const qid = String(token.qid || token.id || token.number || "").trim();
    if (!qid) {
      return (
        <span
          className="inline-flex min-w-8 items-center justify-center border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"
          key={key}
        >
          [{token.number || "?"}]
        </span>
      );
    }

    return (
      <input
        autoComplete="off"
        className={`h-9 w-36 border border-slate-300 bg-white px-3 text-center text-sm font-semibold text-slate-700 outline-none transition ${context.isInputDisabled
            ? "cursor-not-allowed text-slate-400"
            : "focus:border-emerald-500"
          }`}
        disabled={context.isInputDisabled}
        key={key}
        maxLength={42}
        onKeyDown={(event) => context.onGapKeyDown(event, qid)}
        placeholder={String(token.number || "")}
        ref={(node) => context.registerGapInputRef(qid, node)}
        spellCheck={false}
        type="text"
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

function renderTaskContent(display, context) {
  const isMultipleChoiceMultiBlock = Boolean(context?.isMultipleChoiceMultiBlock);
  const directQuestion = String(display?.prompt || display?.question || display?.stem || "").trim();
  const directOptions = Array.isArray(display?.options) ? display.options : [];

  if (isMultipleChoiceMultiBlock) {
    const legacyQuestions = Array.isArray(display?.questions) ? display.questions : [];
    const fallbackQuestion = legacyQuestions[0] || {};
    const prompt = directQuestion || String(fallbackQuestion?.text || "").trim();
    const options =
      directOptions.length > 0
        ? directOptions
        : Array.isArray(fallbackQuestion?.options)
          ? fallbackQuestion.options
          : [];
    const questionNumbersFromDisplay = toOrderedQuestionNumbers(display?.questionNumbers);
    const fallbackQuestionNumbers = Array.isArray(context?.orderedQuestions)
      ? context.orderedQuestions
        .map((question) => Number(question?.number))
        .filter((number) => Number.isFinite(number))
      : [];
    const resolvedQuestionNumbers =
      questionNumbersFromDisplay.length > 0 ? questionNumbersFromDisplay : toOrderedQuestionNumbers(fallbackQuestionNumbers);
    const questionRangeLabel = formatQuestionRangeLabel(resolvedQuestionNumbers);
    const sharedQuestionId = String(
      context?.sharedMultiChoiceQuestionId || context?.orderedQuestionIds?.[0] || "",
    ).trim();

    if (prompt && options.length > 0) {
      return (
        <section className="space-y-3 border border-slate-200 bg-slate-50/50 px-4 py-4">
          {String(display?.title || "").trim() ? (
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">
              {String(display.title).trim()}
            </h3>
          ) : null}
          {questionRangeLabel ? (
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
              {questionRangeLabel}
            </p>
          ) : null}
          <p className="text-base font-semibold leading-7 text-slate-900">{prompt}</p>
          {renderChoiceOptions(
            {
              id: sharedQuestionId,
              text: prompt,
              selectionLimit: context?.multipleChoiceSelectionLimit || 2,
            },
            options,
            "multiple-choice-multi-option",
            context,
            0,
          )}
        </section>
      );
    }
  }

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

    if (sharedQuestionTargets.length > 1 && !isMultipleChoiceMultiBlock) {
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
  if (mcQuestions.length > 0 && !isMultipleChoiceMultiBlock) {
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

function StudentListeningBlockPage() {
  const navigate = useNavigate();
  const { practiceKey: practiceKeyParam = "", blockId: blockIdParam = "" } = useParams();
  const practiceKey = decodeValue(practiceKeyParam);
  const blockId = decodeValue(blockIdParam);
  const attemptCategory = "additional";

  const [block, setBlock] = useState(null);
  const [audio, setAudio] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");


  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isCountdownRunning, setIsCountdownRunning] = useState(false);
  const [countdownValue, setCountdownValue] = useState(null);

  const [hasAttemptStarted, setHasAttemptStarted] = useState(false);
  const [isAutoCompleted, setIsAutoCompleted] = useState(false);
  const [autoCompleteReason, setAutoCompleteReason] = useState("");
  const [audioError, setAudioError] = useState("");
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isSubmittingAttempt, setIsSubmittingAttempt] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [selectedAnswersById, setSelectedAnswersById] = useState({});
  const [submissionResult, setSubmissionResult] = useState(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isRouteLeaveSubmitting, setIsRouteLeaveSubmitting] = useState(false);
  const [shouldProceedAfterResult, setShouldProceedAfterResult] = useState(false);

  const audioRef = useRef(null);
  const gapInputRefs = useRef(new Map());
  const countdownIntervalRef = useRef(null);
  const instructionRef = useRef(null);
  const taskContentRef = useRef(null);
  const hasSubmittedAttemptRef = useRef(false);

  const { clearHighlights, toggleSelectionHighlight } = useTextHighlighting({
    dataAttribute: "data-listening-highlight",
  });

  const autoCompleteStorageKey = useMemo(
    () => `${AUTO_COMPLETE_KEY_PREFIX}${encodeURIComponent(blockId)}`,
    [blockId],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadBlock() {
      setIsLoading(true);
      setError("");

      try {
        const practiceQuery = resolvedPracticeConfig?.canonicalKey || practiceKey;
        const response = await apiRequest(
          `/listening-blocks/${encodeURIComponent(blockId)}${practiceQuery
            ? `?practiceKey=${encodeURIComponent(practiceQuery)}`
            : ""}`,
        );

        if (!isMounted) {
          return;
        }

        const nextBlock = response?.block || null;
        const progressStatus = String(nextBlock?.progressStatus || nextBlock?.progression?.status || "available")
          .trim()
          .toLowerCase();
        if (progressStatus === "locked" && resolvedPracticeConfig) {
          setBlock(null);
          setAudio(null);
          setError("This task is locked. Complete the previous additional task first.");
          return;
        }

        setBlock(nextBlock);
        setAudio(response?.audio || null);
      } catch (nextError) {
        if (!isMounted) {
          return;
        }

        setError(nextError.message || "Failed to load listening task.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadBlock();

    return () => {
      isMounted = false;
    };
  }, [blockId, practiceKey, resolvedPracticeConfig]);

  const audioUrl = useMemo(
    () => `${API_BASE_URL}/listening-blocks/${encodeURIComponent(blockId)}/audio`,
    [blockId],
  );

  const resolvedPracticeConfig = useMemo(() => {
    const byParam = getListeningPracticeConfig(practiceKey);
    if (byParam) {
      return byParam;
    }

    const byBlockType = getListeningPracticeConfig(block?.blockType || "");
    if (byBlockType) {
      return byBlockType;
    }

    const byQuestionFamily = getListeningPracticeConfig(block?.questionFamily || "");
    if (byQuestionFamily) {
      return byQuestionFamily;
    }

    return null;
  }, [block?.blockType, block?.questionFamily, practiceKey]);

  const backLink = resolvedPracticeConfig
    ? `/student/tests/listening/${encodeURIComponent(resolvedPracticeConfig.canonicalKey)}`
    : "/student/tests/listening/full";
  const backLabel = resolvedPracticeConfig?.title || "Full listening tests";
  const sourceType = resolvedPracticeConfig ? "listening_question_family" : "listening_block";

  const orderedGapIds = useMemo(() => {
    const nextIds = [];
    const seen = new Set();

    const addId = (value) => {
      const safe = String(value || "").trim();
      if (!safe || seen.has(safe)) {
        return;
      }

      seen.add(safe);
      nextIds.push(safe);
    };

    const sortedQuestions = Array.isArray(block?.questions)
      ? [...block.questions].sort((left, right) => Number(left?.number || 0) - Number(right?.number || 0))
      : [];

    sortedQuestions.forEach((question) => {
      addId(question?.id || question?.qid || question?.number);
    });

    const elements = Array.isArray(block?.display?.elements) ? block.display.elements : [];
    elements.forEach((element) => {
      const content = Array.isArray(element?.content) ? element.content : [];
      content.forEach((token) => {
        if (token?.type === "gap") {
          addId(token?.qid || token?.id || token?.number);
        }
      });
    });

    return nextIds;
  }, [block]);

  const gapOrderLookup = useMemo(() => {
    const map = new Map();
    orderedGapIds.forEach((gapId, index) => {
      map.set(gapId, index);
    });
    return map;
  }, [orderedGapIds]);

  const orderedQuestions = useMemo(() => {
    const sortedQuestions = Array.isArray(block?.questions)
      ? [...block.questions].sort((left, right) => Number(left?.number || 0) - Number(right?.number || 0))
      : [];

    return sortedQuestions
      .map((question, index) => {
        const questionId = String(question?.id || question?.qid || question?.number || "").trim();
        if (!questionId) {
          return null;
        }

        return {
          id: questionId,
          number: Number.isFinite(Number(question?.number)) ? Number(question.number) : index + 1,
          text: String(question?.text || "").trim(),
          answers: toAnswerArray(question?.answer || question?.answers),
        };
      })
      .filter(Boolean);
  }, [block?.questions]);

  const questionIdByNumber = useMemo(() => {
    const map = new Map();
    orderedQuestions.forEach((question) => {
      const questionId = String(question?.id || "").trim();
      const questionNumber = Number(question?.number);
      if (!questionId || !Number.isFinite(questionNumber) || map.has(questionNumber)) {
        return;
      }

      map.set(questionNumber, questionId);
    });

    return map;
  }, [orderedQuestions]);

  const orderedQuestionIds = useMemo(() => {
    return orderedQuestions.map((question) => question.id);
  }, [orderedQuestions]);

  const isMultipleChoiceMultiBlock = useMemo(
    () =>
      /multiple[_-]?choice[_-]?multi/i.test(
        `${String(block?.blockType || "")} ${String(block?.questionFamily || "")}`,
      ),
    [block?.blockType, block?.questionFamily],
  );

  const sharedMultiChoiceQuestionIds = useMemo(
    () => (isMultipleChoiceMultiBlock ? orderedQuestionIds : []),
    [isMultipleChoiceMultiBlock, orderedQuestionIds],
  );
  const sharedMultiChoiceQuestionIdSet = useMemo(
    () => new Set(sharedMultiChoiceQuestionIds),
    [sharedMultiChoiceQuestionIds],
  );

  const multipleChoiceSelectionLimit = useMemo(() => {
    const explicitCorrectCount = Number(block?.instruction?.correctCount);
    if (isMultipleChoiceMultiBlock && Number.isFinite(explicitCorrectCount) && explicitCorrectCount >= 2) {
      return explicitCorrectCount;
    }

    const fallbackAnswerCount = Math.max(
      ...orderedQuestions.map((question) => toAnswerArray(question?.answers).length),
      1,
    );
    return inferChoiceSelectionLimit(
      String(block?.display?.prompt || block?.display?.question || block?.display?.stem || ""),
      String(block?.instruction?.text || ""),
      fallbackAnswerCount,
    );
  }, [
    block?.display?.prompt,
    block?.display?.question,
    block?.display?.stem,
    block?.instruction?.correctCount,
    block?.instruction?.text,
    isMultipleChoiceMultiBlock,
    orderedQuestions,
  ]);

  const questionMetaById = useMemo(() => {
    const map = new Map();
    const instructionText = String(block?.instruction?.text || "").trim();
    orderedQuestions.forEach((question) => {
      const questionId = String(question?.id || "").trim();
      if (!questionId) {
        return;
      }

      const acceptedAnswers = toAnswerArray(question?.answers);
      const inferredLimit = isMultipleChoiceMultiBlock
        ? multipleChoiceSelectionLimit
        : inferChoiceSelectionLimit(
          String(question?.text || ""),
          instructionText,
          acceptedAnswers.length > 1 ? acceptedAnswers.length : 1,
        );

      map.set(questionId, {
        selectionLimit: inferredLimit,
      });
    });

    return map;
  }, [block?.instruction?.text, isMultipleChoiceMultiBlock, multipleChoiceSelectionLimit, orderedQuestions]);

  const clearCountdownInterval = useCallback(() => {
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const clearAllHighlights = useCallback((containerRefOrElement) => {
    clearHighlights(containerRefOrElement);
  }, [clearHighlights]);

  const handleTextSelectionToggle = useCallback((containerRef) => {
    toggleSelectionHighlight(containerRef);
  }, [toggleSelectionHighlight]);

  const collectSubmittedAnswers = useCallback(() => {
    const answers = [];
    const seen = new Set();
    const questions = Array.isArray(block?.questions) ? block.questions : [];
    const sortedQuestions = [...questions].sort(
      (left, right) => Number(left?.number || 0) - Number(right?.number || 0),
    );

    sortedQuestions.forEach((question) => {
      const questionId = String(question?.id || question?.qid || question?.number || "").trim();
      if (!questionId || seen.has(questionId)) {
        return;
      }

      seen.add(questionId);
      const inputNode = gapInputRefs.current.get(questionId);
      const selectedChoiceValue = selectedAnswersById[questionId];
      const normalizedChoiceValue = Array.isArray(selectedChoiceValue)
        ? selectedChoiceValue.join(", ")
        : String(selectedChoiceValue || "").trim();
      answers.push({
        questionId,
        questionNumber: Number.isFinite(Number(question?.number)) ? Number(question.number) : null,
        value: String(inputNode?.value || normalizedChoiceValue || "").trim(),
      });
    });

    orderedGapIds.forEach((gapId, index) => {
      const safeGapId = String(gapId || "").trim();
      if (!safeGapId || seen.has(safeGapId)) {
        return;
      }

      seen.add(safeGapId);
      const inputNode = gapInputRefs.current.get(safeGapId);
      const selectedChoiceValue = selectedAnswersById[safeGapId];
      const normalizedChoiceValue = Array.isArray(selectedChoiceValue)
        ? selectedChoiceValue.join(", ")
        : String(selectedChoiceValue || "").trim();
      answers.push({
        questionId: safeGapId,
        questionNumber: index + 1,
        value: String(inputNode?.value || normalizedChoiceValue || "").trim(),
      });
    });

    return answers;
  }, [block?.questions, orderedGapIds, selectedAnswersById]);

  const submitAttempt = useCallback(
    async (submitReason, forceReason = "") => {
      if (!block || !blockId || hasSubmittedAttemptRef.current || isSubmittingAttempt) {
        return;
      }

      hasSubmittedAttemptRef.current = true;
      setIsSubmittingAttempt(true);
      setSubmitError("");

      try {
        const response = await apiRequest(`/listening-blocks/${encodeURIComponent(blockId)}/submit`, {
          method: "POST",
          body: {
            answers: collectSubmittedAnswers(),
            submitReason: String(submitReason || "audio-ended"),
            forceReason: String(forceReason || ""),
            attemptCategory,
            sourceType,
            practiceKey: resolvedPracticeConfig?.canonicalKey || practiceKey,
            route: `/student/tests/listening/${encodeURIComponent(
              resolvedPracticeConfig?.canonicalKey || practiceKey || "block",
            )}/${encodeURIComponent(blockId)}`,
          },
        });

        const attempt = response?.attempt || null;

        if (!attempt) {
          throw new Error("Submission response was empty.");
        }

        const audioElement = audioRef.current;
        if (audioElement) {
          audioElement.pause();
        }

        setHasAttemptStarted(false);
        setIsStartModalOpen(false);
        setIsCountdownRunning(false);
        setCountdownValue(null);
        setIsAudioPlaying(false);
        clearCountdownInterval();

        setSubmissionResult(attempt);
        setIsResultModalOpen(true);
      } catch (nextError) {
        hasSubmittedAttemptRef.current = false;
        setSubmitError(nextError.message || "Failed to submit this listening task.");
      } finally {
        setIsSubmittingAttempt(false);
      }
    },
    [
      attemptCategory,
      block,
      blockId,
      clearCountdownInterval,
      collectSubmittedAnswers,
      isSubmittingAttempt,
      practiceKey,
      resolvedPracticeConfig?.canonicalKey,
      sourceType,
    ],
  );

  const autoCompleteAttempt = useCallback(
    (reason, submitReason = "focus-lost") => {
      if (isAutoCompleted) {
        return;
      }

      persistAutoCompleteState(autoCompleteStorageKey, reason);
      setIsAutoCompleted(true);
      setAutoCompleteReason(reason);
      setIsStartModalOpen(false);
      setIsCountdownRunning(false);
      setCountdownValue(null);
      clearCountdownInterval();

      const audioElement = audioRef.current;
      if (audioElement) {
        audioElement.pause();
      }
      setIsAudioPlaying(false);
      void submitAttempt(submitReason, reason);
    },
    [autoCompleteStorageKey, clearCountdownInterval, isAutoCompleted, submitAttempt],
  );

  const isExamSessionActive =
    hasAttemptStarted && !isAutoCompleted && !isResultModalOpen && !isSubmittingAttempt;
  useBodyScrollLock(isResultModalOpen || isStartModalOpen);
  const persistBeforeUnloadState = useCallback(() => {
    if (!isExamSessionActive) {
      return;
    }

    persistAutoCompleteState(
      autoCompleteStorageKey,
      "You refreshed or left the page. This task was auto-completed.",
    );
  }, [autoCompleteStorageKey, isExamSessionActive]);
  const leaveProtection = useExamLeaveProtection({
    isEnabled: isExamSessionActive,
    onBeforeUnload: persistBeforeUnloadState,
  });
  useExamCopyBlocker(isExamSessionActive);

  useEffect(() => {
    return () => {
      clearCountdownInterval();
    };
  }, [clearCountdownInterval]);

  useEffect(() => {
    if (!block || isLoading || error) {
      return;
    }

    setHasAttemptStarted(false);
    setAudioError("");
    setIsAudioPlaying(false);
    setSubmitError("");
    setSubmissionResult(null);
    setIsResultModalOpen(false);
    setIsRouteLeaveSubmitting(false);
    setShouldProceedAfterResult(false);
    setIsSubmittingAttempt(false);
    hasSubmittedAttemptRef.current = false;
    setIsCountdownRunning(false);
    setCountdownValue(null);
    clearAllHighlights(instructionRef.current);
    clearAllHighlights(taskContentRef.current);
    gapInputRefs.current.clear();
    setSelectedAnswersById({});
    clearCountdownInterval();

    const persisted = readAutoCompleteState(autoCompleteStorageKey);
    if (persisted) {
      setIsAutoCompleted(true);
      setAutoCompleteReason(
        String(persisted.reason || "You switched tab/browser or refreshed. This task is auto-completed."),
      );
      setIsStartModalOpen(false);
      void (async () => {
        try {
          const response = await apiRequest(
            `/listening-blocks/${encodeURIComponent(blockId)}/attempts/latest`,
          );
          const latestAttempt = response?.attempt || null;
          if (latestAttempt) {
            setSubmissionResult(latestAttempt);
            setIsResultModalOpen(true);
          }
        } catch {
          // Ignore latest-attempt fetch errors and keep page usable.
        }
      })();
      return;
    }

    setIsAutoCompleted(false);
    setAutoCompleteReason("");
    setIsStartModalOpen(true);
  }, [autoCompleteStorageKey, block, blockId, clearAllHighlights, clearCountdownInterval, error, isLoading, orderedGapIds]);

  useEffect(() => {
    if (!hasAttemptStarted || isAutoCompleted) {
      return undefined;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        autoCompleteAttempt("You switched tab/browser. This task was auto-completed.", "tab-hidden");
      }
    };

    const handlePageHide = () => {
      autoCompleteAttempt("You refreshed or left the page. This task was auto-completed.", "page-hide");
    };

    const handleWindowBlur = () => {
      autoCompleteAttempt("You did not follow the rule. This task was auto-completed.", "window-blur");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [autoCompleteAttempt, hasAttemptStarted, isAutoCompleted]);

  const handleUnderstandStart = useCallback(() => {
    if (isCountdownRunning || isAutoCompleted || !audio?.exists) {
      return;
    }

    setIsCountdownRunning(true);
    setCountdownValue(START_COUNTDOWN_SECONDS);

    const audioElement = audioRef.current;
    if (audioElement) {
      try {
        audioElement.currentTime = 0;
      } catch {
        // Ignore seek errors while metadata is still loading.
      }
      audioElement.muted = true;
      audioElement.play().catch(() => {
        setAudioError("Automatic audio start was blocked. Please keep this page active.");
      });
    }

    clearCountdownInterval();
    countdownIntervalRef.current = window.setInterval(() => {
      setCountdownValue((previousValue) => {
        if (previousValue === null) {
          return null;
        }

        if (previousValue <= 1) {
          clearCountdownInterval();
          setIsCountdownRunning(false);
          setIsStartModalOpen(false);
          setHasAttemptStarted(true);

          const nextAudioElement = audioRef.current;
          if (nextAudioElement) {
            try {
              nextAudioElement.currentTime = 0;
            } catch {
              // Ignore seek errors while metadata is still loading.
            }
            nextAudioElement.muted = false;
            nextAudioElement.play().catch(() => {
              setAudioError("Audio did not start automatically. Please keep this page in focus.");
            });
          }

          return null;
        }

        return previousValue - 1;
      });
    }, 1000);
  }, [audio?.exists, clearCountdownInterval, isAutoCompleted, isCountdownRunning]);

  const handleStartOverlayClose = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(backLink);
  }, [backLink, navigate]);

  const handleAudioPause = useCallback(() => {
    if (!hasAttemptStarted || isAutoCompleted) {
      return;
    }

    const audioElement = audioRef.current;
    if (!audioElement || audioElement.ended) {
      return;
    }

    window.setTimeout(() => {
      audioElement.play().catch(() => {
        setAudioError("Audio pause is disabled during this task.");
      });
    }, 0);
  }, [hasAttemptStarted, isAutoCompleted]);

  const registerGapInputRef = useCallback((gapId, node) => {
    if (!gapId) {
      return;
    }

    if (node) {
      gapInputRefs.current.set(gapId, node);
      return;
    }

    gapInputRefs.current.delete(gapId);
  }, []);

  const handleGapKeyDown = useCallback(
    (event, gapId) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      const currentIndex = gapOrderLookup.get(gapId);
      if (!Number.isFinite(currentIndex)) {
        return;
      }

      const nextGapId = orderedGapIds[currentIndex + 1];
      if (!nextGapId) {
        return;
      }

      const nextInput = gapInputRefs.current.get(nextGapId);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    },
    [gapOrderLookup, orderedGapIds],
  );

  const handleChoiceSelect = useCallback((questionId, value, selectionLimit = 1) => {
    const safeQuestionId = String(questionId || "").trim();
    if (!safeQuestionId || isAutoCompleted || !hasAttemptStarted || isSubmittingAttempt) {
      return;
    }

    setSelectedAnswersById((previousMap) => {
      const targetQuestionIds =
        isMultipleChoiceMultiBlock && sharedMultiChoiceQuestionIdSet.has(safeQuestionId)
          ? sharedMultiChoiceQuestionIds
          : [safeQuestionId];
      const sourceQuestionId = targetQuestionIds[0] || safeQuestionId;
      const nextValue = computeNextChoiceValue(previousMap[sourceQuestionId], value, selectionLimit);
      const nextMap = {
        ...previousMap,
      };

      targetQuestionIds.forEach((targetQuestionId) => {
        nextMap[targetQuestionId] = nextValue;
      });

      return nextMap;
    });
  }, [
    hasAttemptStarted,
    isAutoCompleted,
    isSubmittingAttempt,
    isMultipleChoiceMultiBlock,
    sharedMultiChoiceQuestionIdSet,
    sharedMultiChoiceQuestionIds,
  ]);

  const isInputDisabled = isAutoCompleted || !hasAttemptStarted || isSubmittingAttempt;
  const showAudioPlayingEffect =
    Boolean(audio?.exists) && hasAttemptStarted && !isAutoCompleted && isAudioPlaying;
  const submissionPercentage = Number(submissionResult?.percentage || 0);
  const isGoodSubmission = submissionPercentage >= GOOD_SCORE_THRESHOLD_PERCENT;

  const handleRestartTask = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(autoCompleteStorageKey);
    }

    setIsAutoCompleted(false);
    setAutoCompleteReason("");
    setHasAttemptStarted(false);
    setIsStartModalOpen(true);
    setIsCountdownRunning(false);
    setCountdownValue(null);
    setAudioError("");
    setIsAudioPlaying(false);
    setSubmitError("");
    setSubmissionResult(null);
    setIsResultModalOpen(false);
    setIsRouteLeaveSubmitting(false);
    setShouldProceedAfterResult(false);
    setIsSubmittingAttempt(false);
    setSelectedAnswersById({});
    hasSubmittedAttemptRef.current = false;
    clearCountdownInterval();

    const audioElement = audioRef.current;
    if (audioElement) {
      audioElement.pause();
      try {
        audioElement.currentTime = 0;
      } catch {
        // Ignore seek errors while metadata is still loading.
      }
    }
    gapInputRefs.current.forEach((inputElement) => {
      if (inputElement) {
        inputElement.value = "";
      }
    });
    clearAllHighlights(instructionRef.current);
    clearAllHighlights(taskContentRef.current);
  }, [autoCompleteStorageKey, clearAllHighlights, clearCountdownInterval]);

  const handleStayOnExamPage = useCallback(() => {
    setIsRouteLeaveSubmitting(false);
    setShouldProceedAfterResult(false);
    leaveProtection.cancelNavigation();
  }, [leaveProtection]);

  const handleConfirmLeavePage = useCallback(async () => {
    if (isRouteLeaveSubmitting) {
      return;
    }

    setIsRouteLeaveSubmitting(true);
    leaveProtection.hideWarning();
    setShouldProceedAfterResult(true);
    await submitAttempt("leave-page", "You chose to leave this page. This task was auto-completed.");
    if (!hasSubmittedAttemptRef.current) {
      setShouldProceedAfterResult(false);
      leaveProtection.cancelNavigation();
    }
    setIsRouteLeaveSubmitting(false);
  }, [isRouteLeaveSubmitting, leaveProtection, submitAttempt]);

  const handleResultPrimaryAction = useCallback(() => {
    if (shouldProceedAfterResult && leaveProtection.hasBlockedNavigation) {
      leaveProtection.proceedNavigation();
      return;
    }
  }, [leaveProtection, shouldProceedAfterResult]);

  const renderContext = useMemo(
    () => ({
      answersById: selectedAnswersById,
      getChoiceSelectionLimit: (question, questionId) => {
        if (isMultipleChoiceMultiBlock) {
          return multipleChoiceSelectionLimit;
        }

        const questionMeta = questionMetaById.get(String(questionId || "").trim());
        if (questionMeta?.selectionLimit) {
          return questionMeta.selectionLimit;
        }

        const inferredFromQuestion = inferChoiceSelectionLimit(
          String(question?.text || question?.question || question?.stem || ""),
          String(block?.instruction?.text || ""),
          1,
        );
        return inferredFromQuestion;
      },
      isMultipleChoiceMultiBlock,
      isInputDisabled,
      multipleChoiceSelectionLimit,
      onChoiceSelect: handleChoiceSelect,
      onGapKeyDown: handleGapKeyDown,
      orderedQuestions,
      orderedQuestionIds,
      questionIdByNumber,
      registerGapInputRef,
      sharedMultiChoiceQuestionIdSet,
      sharedMultiChoiceQuestionId: sharedMultiChoiceQuestionIds[0] || "",
    }),
    [
      selectedAnswersById,
      isMultipleChoiceMultiBlock,
      multipleChoiceSelectionLimit,
      questionMetaById,
      block?.instruction?.text,
      handleChoiceSelect,
      handleGapKeyDown,
      isInputDisabled,
      orderedQuestions,
      orderedQuestionIds,
      questionIdByNumber,
      registerGapInputRef,
      sharedMultiChoiceQuestionIdSet,
      sharedMultiChoiceQuestionIds,
    ],
  );

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
              <Motion.span
                animate={{ scaleY: [0.35, 1, 0.35] }}
                className="h-3 w-1 origin-bottom bg-emerald-500"
                transition={{ duration: 0.7, ease: "easeInOut", repeat: Infinity, repeatType: "loop" }}
              />
              <Motion.span
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
              <Motion.span
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

      {isLoading ? <TestPageSkeleton /> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {isSubmittingAttempt ? <p className="text-sm text-slate-600">Submitting your task...</p> : null}

      {block && !error ? (
        <>
          {audio?.exists ? (
            <audio
              className="hidden"
              onPause={handleAudioPause}
              onPlay={() => {
                setAudioError("");
                setIsAudioPlaying(true);
              }}
              onEnded={() => {
                setIsAudioPlaying(false);
                void submitAttempt("audio-ended");
              }}
              preload="auto"
              ref={audioRef}
            >
              <source src={audioUrl} type={audio?.mimeType || "audio/mpeg"} />
              Your browser does not support audio playback.
            </audio>
          ) : null}

          {audioError ? (
            <p className="rounded-none border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-600">
              {audioError}
            </p>
          ) : null}

          {submitError ? (
            <p className="rounded-none border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-600">
              {submitError}
            </p>
          ) : null}
          {isAutoCompleted && autoCompleteReason && !isResultModalOpen ? (
            <p className="rounded-none border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-600">
              {autoCompleteReason}
            </p>
          ) : null}

          <section
            className="rounded-none border border-slate-800 bg-slate-950 p-6 text-slate-100 select-text"
            onMouseUp={() => handleTextSelectionToggle(instructionRef)}
            onTouchEnd={() => handleTextSelectionToggle(instructionRef)}
            ref={instructionRef}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">Instruction</p>
            <p className="mt-3 text-base leading-8">{block?.instruction?.text || "No instruction."}</p>
          </section>

          <section
            className="rounded-none border border-slate-200/80 bg-white/95 p-6 select-text"
            onMouseUp={() => handleTextSelectionToggle(taskContentRef)}
            onTouchEnd={() => handleTextSelectionToggle(taskContentRef)}
            ref={taskContentRef}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Task Content</p>
            <div className="mt-4">{renderTaskContent(block?.display, renderContext)}</div>
          </section>
        </>
      ) : null}

      {isResultModalOpen && submissionResult ? (
        <Motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4"
          initial={{ opacity: 0 }}
          onClick={() => setIsResultModalOpen(false)}
          role="presentation"
          transition={{ duration: 0.26, ease: "easeOut" }}
        >
          <Motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-xl border border-slate-200 bg-white p-6 text-center shadow-2xl sm:p-7"
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            onClick={(event) => event.stopPropagation()}
            transition={{ duration: 0.32, ease: "easeOut", delay: 0.04 }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Task Submitted</p>

            <p
              className="my-4 text-7xl font-black tracking-tight"
              style={{ color: isGoodSubmission ? "#059669" : TOMATO_COLOR }}
            >
              {submissionResult.correctCount}/{submissionResult.totalQuestions}
            </p>
            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">
              correct answers
            </p>

            <p className="mt-4 text-sm text-slate-600">
              Submit a second attempt to unlock answer keys.
            </p>
            <p className="text-sm text-slate-600">
              After your second submission, you can review the correct answers.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {shouldProceedAfterResult ? null : (
                <button
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:bg-slate-50"
                  onClick={handleRestartTask}
                  type="button"
                >
                  Try Again
                </button>
              )}
              {shouldProceedAfterResult ? (
                <button
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:brightness-105"
                  onClick={handleResultPrimaryAction}
                  type="button"
                >
                  Review
                </button>
              ) : (
                <Link
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:brightness-105"
                  to={backLink}
                >
                  Leave
                </Link>
              )}
            </div>
          </Motion.div>
        </Motion.div>
      ) : null}

      {isStartModalOpen ? (
        <Motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4"
          initial={{ opacity: 0 }}
          onClick={handleStartOverlayClose}
          role="presentation"
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          <Motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-xl border border-slate-200 bg-white p-6 text-center shadow-2xl sm:p-7"
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            onClick={(event) => event.stopPropagation()}
            transition={{ duration: 0.34, ease: "easeOut", delay: 0.05 }}
          >
            <button
              aria-label="Close and go back"
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              onClick={handleStartOverlayClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Before You Start</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900"><b>PAY ATTENTION !!!</b></h2>

            <div className="mx-auto mt-4 max-w-2xl space-y-2 text-base font-medium leading-8 text-slate-700">
              <p>
                After starting the test, the audio plays <span className="text-yellow-500">immediately</span> and cannot be <span className="text-yellow-500">paused</span>.

                If you <span className="text-yellow-500">switch</span> tabs, <span className="text-yellow-500">change</span> the browser, or <span className="text-yellow-500">refresh</span> the page, the test is <span className="text-yellow-500">auto-submitted</span>.
                Select text to highlight it. Select the highlighted text again to remove the highlight.

                Press Enter to move to the next answer field.
              </p>
            </div>

            <button
              className="mx-auto mt-6 inline-flex w-full max-w-[330px] items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 px-8 py-4 text-sm font-black uppercase tracking-[0.22em] text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isCountdownRunning || !audio?.exists}
              onClick={handleUnderstandStart}
              type="button"
            >
              {isCountdownRunning && Number.isFinite(countdownValue)
                ? `Starting in ${countdownValue}`
                : "I Understand"}
            </button>

          </Motion.div>
        </Motion.div>
      ) : null}

      <ExamLeaveWarningModal
        isOpen={leaveProtection.isWarningOpen}
        isSubmitting={isRouteLeaveSubmitting}
        onLeave={handleConfirmLeavePage}
        onStay={handleStayOnExamPage}
      />
    </div>
  );
}

export default StudentListeningBlockPage;

