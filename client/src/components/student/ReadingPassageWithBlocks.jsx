import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useExamCopyBlocker from "../../hooks/useExamCopyBlocker";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useExamLeaveProtection from "../../hooks/useExamLeaveProtection";
import useTextHighlighting from "../../hooks/useTextHighlighting";
import ExamLeaveWarningModal from "./exam/ExamLeaveWarningModal";
import { SelectControl } from "../ui/StyledFormControls";

const START_COUNTDOWN_SECONDS = 3;
const DEFAULT_ATTEMPT_DURATION_SECONDS = 20 * 60;
const GOOD_SCORE_THRESHOLD_PERCENT = 70;
const TOMATO_COLOR = "#ff6347";
const AUTO_COMPLETE_KEY_PREFIX = "student:reading:auto-complete:";
const EMPTY_ARRAY = Object.freeze([]);

function isReadingTimingInstruction(value) {
  const safe = String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

  return (
    safe.includes("you should spend about 20 minutes") &&
    safe.includes("questions") &&
    safe.includes("reading passage") &&
    safe.includes("below")
  );
}

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

function formatTimerLabel(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function toReadingBand(correctCount, totalQuestions) {
  const safeTotal = Math.max(0, Number(totalQuestions) || 0);
  if (safeTotal <= 0) {
    return 0;
  }

  const safeCorrect = Math.max(0, Math.min(safeTotal, Number(correctCount) || 0));
  const scaledCorrect = safeTotal === 40
    ? Math.round(safeCorrect)
    : Math.round((safeCorrect / safeTotal) * 40);

  if (scaledCorrect >= 39) return 9;
  if (scaledCorrect >= 37) return 8.5;
  if (scaledCorrect >= 35) return 8;
  if (scaledCorrect >= 33) return 7.5;
  if (scaledCorrect >= 30) return 7;
  if (scaledCorrect >= 27) return 6.5;
  if (scaledCorrect >= 23) return 6;
  if (scaledCorrect >= 19) return 5.5;
  if (scaledCorrect >= 15) return 5;
  if (scaledCorrect >= 13) return 4.5;
  if (scaledCorrect >= 10) return 4;
  if (scaledCorrect >= 8) return 3.5;
  if (scaledCorrect >= 6) return 3;
  if (scaledCorrect >= 4) return 2.5;
  return 0;
}

function formatBandScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "0";
  }

  return numeric.toFixed(1);
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

function getOptionLabel(option, optionIndex) {
  if (typeof option === "string") {
    return String.fromCharCode(65 + optionIndex);
  }

  const key = String(option?.key || option?.label || option?.id || "").trim();
  if (key) {
    return key;
  }

  return String.fromCharCode(65 + optionIndex);
}

function getOptionValue(option, optionIndex) {
  if (typeof option === "string") {
    return option;
  }

  const key = String(option?.key || option?.label || option?.id || option?.value || "").trim();
  if (key) {
    return key;
  }

  return String.fromCharCode(65 + optionIndex);
}

function getOptionText(option) {
  if (typeof option === "string") {
    return option;
  }

  const candidates = [
    option?.text,
    option?.title,
    option?.statement,
    option?.prompt,
    option?.heading,
    option?.ending,
    option?.content,
    option?.description,
    option?.name,
    option?.value,
    option?.key,
    option?.label,
  ];

  for (const candidate of candidates) {
    const normalized = String(candidate || "").trim();
    if (normalized) {
      return normalized;
    }
  }

  return "-";
}

function getDisplayPrompts(display = {}) {
  return Array.isArray(display?.prompts) ? display.prompts : [];
}

function getPromptText(prompt) {
  const isInvalidObjectString = (value) => value.toLowerCase() === "[object object]";
  const candidates = [
    prompt?.text,
    prompt?.statement,
    prompt?.prompt,
    prompt?.sentence,
    prompt?.stem,
    prompt?.question,
    prompt?.line,
    prompt?.item,
    prompt?.clause,
    prompt?.feature,
    prompt?.name,
  ];

  for (const candidate of candidates) {
    const normalized = String(candidate || "").trim();
    if (normalized && !isInvalidObjectString(normalized)) {
      return normalized;
    }
  }

  const paragraphId = String(prompt?.paragraphId || prompt?.paragraph || "").trim();
  if (paragraphId) {
    return `Paragraph ${paragraphId}`;
  }

  const sectionId = String(prompt?.sectionId || prompt?.section || "").trim();
  if (sectionId) {
    return `Section ${sectionId}`;
  }

  return "";
}

function inferBinaryOptionItems(block) {
  const source = `${String(block?.blockType || "")} ${String(block?.questionFamily || "")} ${String(block?.instruction?.text || "")} ${String(block?.display?.title || "")}`
    .toLowerCase();
  const hasYesNo = /yes[_\s-]*no[_\s-]*not[_\s-]*given/.test(source);
  const hasTrueFalse = /true[_\s-]*false[_\s-]*not[_\s-]*given/.test(source);

  if (hasYesNo) {
    return [
      { value: "YES", label: "YES" },
      { value: "NO", label: "NO" },
      { value: "NOT GIVEN", label: "NOT GIVEN" },
    ];
  }

  if (hasTrueFalse) {
    return [
      { value: "TRUE", label: "TRUE" },
      { value: "FALSE", label: "FALSE" },
      { value: "NOT GIVEN", label: "NOT GIVEN" },
    ];
  }

  const answerTokens = Array.from(
    new Set(
      (Array.isArray(block?.questions) ? block.questions : [])
        .flatMap((question) => toAnswerArray(question?.answers ?? question?.answer))
        .map((value) => String(value || "").trim().toUpperCase())
        .filter(Boolean),
    ),
  );
  const hasAnswerYesNo = ["YES", "NO", "NOT GIVEN"].every((token) => answerTokens.includes(token));
  if (hasAnswerYesNo) {
    return [
      { value: "YES", label: "YES" },
      { value: "NO", label: "NO" },
      { value: "NOT GIVEN", label: "NOT GIVEN" },
    ];
  }

  return [
    { value: "TRUE", label: "TRUE" },
    { value: "FALSE", label: "FALSE" },
    { value: "NOT GIVEN", label: "NOT GIVEN" },
  ];
}

function hasGapTokenInValue(value) {
  if (Array.isArray(value)) {
    return value.some((item) => hasGapTokenInValue(item));
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  if (String(value?.type || "").trim() === "gap") {
    return true;
  }

  return Object.values(value).some((item) => hasGapTokenInValue(item));
}

function isGapFillLikeBlock(block) {
  const source = `${String(block?.questionFamily || "")} ${String(block?.blockType || "")}`.toLowerCase();
  return (
    source.includes("gap_fill")
    || source.includes("summary_completion")
    || source.includes("note_completion")
    || source.includes("table_completion")
    || source.includes("flow_chart_completion")
    || source.includes("sentence_completion")
    || source.includes("diagram_label_completion")
  );
}

function resolveStorageIdByToken(token, answerContext = null) {
  const tokenId = String(token?.qid || token?.id || "").trim();
  const tokenNumber = Number(token?.number);

  if (tokenId && answerContext?.questionStorageIdById instanceof Map) {
    const mappedById = String(answerContext.questionStorageIdById.get(tokenId) || "").trim();
    if (mappedById) {
      return mappedById;
    }
  }

  if (Number.isFinite(tokenNumber) && answerContext?.questionStorageIdByNumber instanceof Map) {
    const mappedByNumber = String(answerContext.questionStorageIdByNumber.get(tokenNumber) || "").trim();
    if (mappedByNumber) {
      return mappedByNumber;
    }
  }

  return tokenId;
}

function renderInlineToken(token, key, answerContext = null) {
  if (typeof token === "string" || typeof token === "number") {
    return (
      <span className="whitespace-pre-wrap" key={key}>
        {String(token)}
      </span>
    );
  }

  if (!token || typeof token !== "object") {
    return null;
  }

  if (token.type === "gap") {
    const label = Number.isFinite(Number(token.number)) ? Number(token.number) : token.qid || "?";
    const questionStorageId = resolveStorageIdByToken(token, answerContext);
    const inlineRawValue = questionStorageId ? answerContext?.selectedAnswersById?.[questionStorageId] : "";
    const inlineValue = Array.isArray(inlineRawValue)
      ? inlineRawValue.join(", ")
      : String(inlineRawValue || "");

    if (answerContext?.showInlineGapInputs && questionStorageId) {
      return (
        <span className="inline-flex items-center gap-1.5" key={key}>
          <span className="text-[11px] font-semibold text-slate-500">{label}.</span>
          <input
            autoComplete="off"
            aria-label={`Answer for question ${label}`}
            className={`h-8 w-24 border bg-white px-2 text-xs font-semibold text-slate-700 outline-none transition ${
              answerContext?.isInputDisabled
                ? "cursor-not-allowed border-slate-200 text-slate-400"
                : "border-emerald-300 focus:border-emerald-500"
            }`}
            disabled={answerContext?.isInputDisabled}
            maxLength={64}
            onChange={(event) => answerContext?.onAnswerChange?.(questionStorageId, event.target.value)}
            placeholder={String(label)}
            spellCheck={false}
            type="text"
            value={inlineValue}
          />
        </span>
      );
    }

    return (
      <span
        className="inline-flex items-center border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"
        key={key}
      >
        [{label}]
      </span>
    );
  }

  if (token.type === "example_gap") {
    return (
      <span className="inline-flex border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700" key={key}>
        {String(token.text || "").trim() || ""}
      </span>
    );
  }

  if (typeof token.text === "string") {
    return (
      <span className="whitespace-pre-wrap" key={key}>
        {token.text}
      </span>
    );
  }

  return (
    <span className="inline-flex border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700" key={key}>
      {JSON.stringify(token)}
    </span>
  );
}

function renderInlineContent(value, keyPrefix = "inline", answerContext = null) {
  if (Array.isArray(value)) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        {value.map((token, index) => renderInlineToken(token, `${keyPrefix}-${index}`, answerContext))}
      </span>
    );
  }

  return renderInlineToken(value, `${keyPrefix}-single`, answerContext);
}

function renderStructuredValue(value, keyPrefix = "structured", answerContext = null) {
  if (Array.isArray(value)) {
    const hasNestedArrays = value.some((entry) => Array.isArray(entry));
    if (!hasNestedArrays) {
      return renderInlineContent(value, keyPrefix, answerContext);
    }

    return (
      <div className="space-y-2">
        {value.map((entry, index) => (
          <div className="text-sm leading-7 text-slate-700" key={`${keyPrefix}-${index}`}>
            {renderStructuredValue(entry, `${keyPrefix}-${index}`, answerContext)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "string" || typeof value === "number" || (value && typeof value === "object")) {
    return renderInlineContent([value], keyPrefix, answerContext);
  }

  return null;
}

function normalizeTableRows(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row) => {
    if (Array.isArray(row)) {
      return row;
    }

    if (row && typeof row === "object") {
      if (Array.isArray(row.cells)) {
        return row.label ? [row.label, ...row.cells] : row.cells;
      }

      return Object.values(row);
    }

    return [row];
  });
}

function renderGenericTable(table, keyPrefix = "table", answerContext = null) {
  const columns = Array.isArray(table?.columns) ? table.columns : [];
  const rows = normalizeTableRows(table?.rows);
  if (columns.length === 0 && rows.length === 0) {
    return null;
  }

  const maxColumnCount = Math.max(
    columns.length,
    ...rows.map((row) => (Array.isArray(row) ? row.length : 0)),
    1,
  );
  const minTableWidthPx = Math.max(560, maxColumnCount * 170);

  return (
    <div className="max-w-full overflow-x-auto border border-slate-200">
      <table
        className="w-max border-collapse text-sm text-slate-700"
        style={{ minWidth: `${minTableWidthPx}px` }}
      >
        {columns.length > 0 ? (
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column, columnIndex) => (
                <th
                  className="border border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-600"
                  key={`${keyPrefix}-column-${columnIndex}`}
                  scope="col"
                >
                  {String(column || "").trim() || "-"}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr className="align-top" key={`${keyPrefix}-row-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td className="border border-slate-200 px-3 py-2 text-sm leading-7 text-slate-700" key={`${keyPrefix}-row-${rowIndex}-cell-${cellIndex}`}>
                  {renderStructuredValue(cell, `${keyPrefix}-row-${rowIndex}-cell-${cellIndex}`, answerContext) || "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderDisplayElement(element, index, keyPrefix = "element", answerContext = null) {
  const type = String(element?.type || "").trim();
  const key = `${keyPrefix}-${index}`;

  if (type === "subheading") {
    return (
      <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700" key={key}>
        {String(element?.text || "").trim() || "-"}
      </h4>
    );
  }

  if (type === "bullet_row") {
    return (
      <li className="ml-5 list-disc text-sm leading-7 text-slate-700" key={key}>
        {renderStructuredValue(element?.content, `${key}-content`, answerContext) || "-"}
      </li>
    );
  }

  if (type === "example" || type === "form_row") {
    return (
      <div className="grid gap-2 border border-slate-200 bg-white px-4 py-3 sm:grid-cols-[220px_1fr]" key={key}>
        <p className="text-sm font-semibold text-slate-700">{String(element?.label || "").trim() || "-"}</p>
        <div className="text-sm leading-7 text-slate-700">{renderStructuredValue(element?.content, `${key}-content`, answerContext) || "-"}</div>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700" key={key}>
      {element?.label ? <p className="font-semibold text-slate-700">{String(element.label).trim()}</p> : null}
      {renderStructuredValue(element?.content || element?.text || element, `${key}-fallback`, answerContext) || "-"}
    </div>
  );
}

function renderPassageContentBlock(contentBlock, index) {
  const type = String(contentBlock?.type || "").trim().toLowerCase();
  const key = `passage-content-${index}`;
  const text = String(contentBlock?.text || "").trim();

  if (isReadingTimingInstruction(text)) {
    return null;
  }

  if (type === "intro") {
    return (
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500" key={key}>
        {text || "-"}
      </p>
    );
  }

  if (type === "title") {
    return (
      <h3 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900" key={key}>
        {String(contentBlock?.text || "").trim() || "-"}
      </h3>
    );
  }

  if (type === "subtitle") {
    return (
      <h4 className="text-lg font-semibold text-slate-800" key={key}>
        {String(contentBlock?.text || "").trim() || "-"}
      </h4>
    );
  }

  if (type === "section_heading") {
    return (
      <h5 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700" key={key}>
        {String(contentBlock?.text || "").trim() || "-"}
      </h5>
    );
  }

  if (type === "paragraph") {
    const paragraphText = String(contentBlock?.text || "").trim();
    const paragraphId = String(contentBlock?.paragraphId || "").trim();
    return (
      <p className="text-sm leading-7 text-slate-800" key={key}>
        {paragraphId ? <span className="mr-2 font-semibold text-slate-900">{paragraphId}.</span> : null}
        {paragraphText || "-"}
      </p>
    );
  }

  if (type === "note") {
    return (
      <div className="border-l-4 border-emerald-400 bg-emerald-50/60 px-4 py-3 text-sm leading-7 text-emerald-900" key={key}>
        {String(contentBlock?.text || "").trim() || "-"}
      </div>
    );
  }

  if (type === "table") {
    const tableNode = contentBlock?.table && typeof contentBlock.table === "object"
      ? contentBlock.table
      : contentBlock;
    return (
      <div className="space-y-2" key={key}>
        {String(contentBlock?.caption || "").trim() ? (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {String(contentBlock.caption).trim()}
          </p>
        ) : null}
        {renderGenericTable(tableNode, `passage-table-${index}`) || (
          <p className="text-sm text-slate-500">Table content is not available.</p>
        )}
      </div>
    );
  }

  if (type === "diagram") {
    const imageUrl = String(contentBlock?.imageUrl || contentBlock?.url || "").trim();
    const caption = String(contentBlock?.caption || contentBlock?.text || "").trim();
    return (
      <div className="space-y-3 border border-slate-200 bg-slate-50 px-4 py-3" key={key}>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Diagram</p>
        {caption ? <p className="text-sm leading-7 text-slate-700">{caption}</p> : null}
        {imageUrl ? (
          <img alt={caption || "Passage diagram"} className="max-h-96 w-full object-contain" src={imageUrl} />
        ) : (
          <p className="text-sm text-slate-500">No diagram image URL provided in this passage block.</p>
        )}
      </div>
    );
  }

  return (
    <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700" key={key}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {toReadableLabel(type || "content")}
      </p>
      {String(contentBlock?.text || "").trim() ? (
        <p className="mt-1 leading-7 text-slate-700">{String(contentBlock.text).trim()}</p>
      ) : (
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs text-slate-600">
          {JSON.stringify(contentBlock, null, 2)}
        </pre>
      )}
    </div>
  );
}

function renderChoiceQuestion(
  question,
  questionIndex,
  keyPrefix = "choice-question",
  answerContext = null,
) {
  const questionText = String(question?.text || question?.question || "").trim();
  const options = Array.isArray(question?.options) ? question.options : [];
  const explicitQuestionId = String(question?.qid || question?.id || "").trim();
  const questionNumber = Number(question?.number);
  const answerStorageId = (() => {
    if (explicitQuestionId && answerContext?.questionStorageIdById instanceof Map) {
      const mapped = answerContext.questionStorageIdById.get(explicitQuestionId);
      if (mapped) {
        return mapped;
      }
    }

    if (Number.isFinite(questionNumber) && answerContext?.questionStorageIdByNumber instanceof Map) {
      const mapped = answerContext.questionStorageIdByNumber.get(questionNumber);
      if (mapped) {
        return mapped;
      }
    }

    if (Array.isArray(answerContext?.orderedStorageIds)) {
      return String(answerContext.orderedStorageIds[questionIndex] || "").trim();
    }

    return "";
  })();
  const inlineAnswerValueRaw = answerStorageId ? answerContext?.selectedAnswersById?.[answerStorageId] : "";
  const inlineAnswerValue = Array.isArray(inlineAnswerValueRaw)
    ? inlineAnswerValueRaw.join(", ")
    : inlineAnswerValueRaw || "";
  const selectedChoices = toChoiceArray(inlineAnswerValueRaw).map((item) => normalizeAnswerText(item));
  const explicitSelectionLimit = Number(
    question?.selectionLimit ?? question?.maxSelections ?? question?.maxAnswers,
  );
  const expectedAnswerCount = answerStorageId
    ? Number(answerContext?.answerCountByStorageId?.get(answerStorageId) || 0)
    : 0;
  const inferredSelectionLimit = inferChoiceSelectionLimit(
    questionText,
    answerContext?.instructionText || "",
    expectedAnswerCount > 1 ? expectedAnswerCount : 1,
  );
  const selectionLimit = Math.max(
    1,
    Number.isFinite(explicitSelectionLimit) && explicitSelectionLimit > 0
      ? explicitSelectionLimit
      : inferredSelectionLimit,
  );

  return (
    <section className="space-y-2 border border-slate-200 bg-slate-50/70 px-4 py-3" key={`${keyPrefix}-${questionIndex}`}>
      <p className="text-sm font-semibold leading-7 text-slate-900">
        {Number.isFinite(Number(question?.number)) ? `${Number(question.number)}. ` : ""}
        {questionText || "Question"}
      </p>
      {options.length > 0 ? (
        <ul className="space-y-2">
          {options.map((option, optionIndex) => (
            <li key={`${keyPrefix}-${questionIndex}-option-${optionIndex}`}>
              {answerStorageId && typeof answerContext?.onChoiceSelect === "function" ? (
                <button
                  className={`flex w-full items-start gap-2 border px-3 py-2 text-left text-sm leading-6 transition ${
                    selectedChoices.includes(normalizeAnswerText(getOptionValue(option, optionIndex)))
                      ? "border-emerald-400 bg-emerald-50 text-slate-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200"
                  } ${answerContext?.isInputDisabled ? "cursor-not-allowed opacity-75" : ""}`}
                  disabled={answerContext?.isInputDisabled}
                  onClick={() =>
                    answerContext?.onChoiceSelect?.(
                      answerStorageId,
                      getOptionValue(option, optionIndex),
                      selectionLimit,
                    )
                  }
                  type="button"
                >
                  <span className="inline-flex min-w-6 font-semibold text-slate-900">
                    {getOptionLabel(option, optionIndex)}.
                  </span>
                  <span>{getOptionText(option)}</span>
                </button>
              ) : (
                <div className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">{getOptionLabel(option, optionIndex)}.</span>
                  <span>{getOptionText(option)}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {answerStorageId && options.length === 0 ? (
        <input
          autoComplete="off"
          className={`h-10 w-full bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition ${
            answerContext?.isInputDisabled
              ? "cursor-not-allowed text-slate-400"
              : "ring-1 ring-slate-300 focus:ring-emerald-500"
          }`}
          disabled={answerContext?.isInputDisabled}
          maxLength={64}
          onChange={(event) => answerContext?.onAnswerChange?.(answerStorageId, event.target.value)}
          spellCheck={false}
          type="text"
          value={inlineAnswerValue}
        />
      ) : null}
    </section>
  );
}

function renderPromptList(prompts = [], keyPrefix = "prompt", answerContext = null) {
  if (!Array.isArray(prompts) || prompts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {prompts.map((prompt, index) => {
        const promptNumber = Number(prompt?.number);
        const promptId = String(prompt?.qid || prompt?.id || "").trim();
        const promptQuestionStorageId = (() => {
          if (promptId) {
            const mappedById = String(
              answerContext?.questionStorageIdById?.get(promptId)
              || answerContext?.questionIdById?.get?.(promptId)
              || "",
            ).trim();
            if (mappedById) {
              return mappedById;
            }
          }

          if (Number.isFinite(promptNumber)) {
            const mappedByNumber = String(
              answerContext?.questionStorageIdByNumber?.get(promptNumber)
              || answerContext?.questionIdByNumber?.get(promptNumber)
              || "",
            ).trim();
            if (mappedByNumber) {
              return mappedByNumber;
            }
          }

          return promptId;
        })();

        const selectedRaw = answerContext?.selectedAnswersById?.[promptQuestionStorageId];
        const selectedValue = Array.isArray(selectedRaw)
          ? String(selectedRaw[0] || "").trim()
          : String(selectedRaw || "").trim();

        return (
          <div className="flex items-center justify-between gap-3 text-sm leading-7 text-slate-700" key={`${keyPrefix}-${index}`}>
            <div className="min-w-0 flex-1">
              <span className="mr-2 font-semibold text-slate-900">
                {Number.isFinite(promptNumber) ? `${promptNumber}.` : `${index + 1}.`}
              </span>
              <span>{getPromptText(prompt) || "-"}</span>
            </div>

            {answerContext?.showPromptSelect && promptQuestionStorageId ? (
              <SelectControl
                className={`h-9 min-w-30 px-3 pr-10 text-xs font-semibold uppercase tracking-[0.12em] ${
                  answerContext?.isInputDisabled
                    ? "cursor-not-allowed border-slate-300 text-slate-400"
                    : "border-slate-300"
                }`}
                disabled={answerContext?.isInputDisabled}
                onChange={(event) => answerContext?.onSelect?.(promptQuestionStorageId, event.target.value)}
                value={selectedValue}
              >
                <option value="">Select</option>
                {(Array.isArray(answerContext?.optionItems) ? answerContext.optionItems : []).map((item) => (
                  <option key={`${promptQuestionStorageId}-${item.value}`} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </SelectControl>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function renderOptionList(
  options = [],
  title = "Options",
  keyPrefix = "option-list",
  boxed = false,
  valuesOnly = false,
) {
  if (!Array.isArray(options) || options.length === 0) {
    return null;
  }

  return (
    <div className={boxed ? "space-y-2 border border-slate-200 bg-slate-50 px-4 py-3" : "space-y-2"}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <ul className="space-y-1.5 text-sm text-slate-700">
        {options.map((option, optionIndex) => (
          <li className="flex items-start gap-2" key={`${keyPrefix}-${optionIndex}`}>
            {valuesOnly ? (
              <span className="font-semibold text-slate-900">{getOptionValue(option, optionIndex)}.</span>
            ) : (
              <>
                <span className="font-semibold text-slate-900">{getOptionLabel(option, optionIndex)}.</span>
                <span>{getOptionText(option)}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function renderReadingBlockDisplay(block, answerContext = null) {
  const display = block?.display && typeof block.display === "object" ? block.display : {};
  const directQuestion = String(display?.question || display?.stem || "").trim();
  const directOptions = Array.isArray(display?.options) ? display.options : [];
  const displayQuestions = Array.isArray(display?.questions) ? display.questions : [];
  const displayPrompts = getDisplayPrompts(display);
  const headingOptions = Array.isArray(display?.headingOptions) ? display.headingOptions : [];
  const featureOptions = Array.isArray(display?.featureOptions) ? display.featureOptions : [];
  const isBinaryJudgement = Boolean(answerContext?.isBinaryJudgement);

  if (directQuestion && directOptions.length > 0) {
    const directQuestionStorageId = String(answerContext?.orderedStorageIds?.[0] || "").trim();
    const directSelectedRaw = directQuestionStorageId
      ? answerContext?.selectedAnswersById?.[directQuestionStorageId]
      : "";
    const directSelectedChoices = toChoiceArray(directSelectedRaw).map((item) => normalizeAnswerText(item));
    const directExpectedAnswerCount = directQuestionStorageId
      ? Number(answerContext?.answerCountByStorageId?.get(directQuestionStorageId) || 0)
      : 0;
    const directSelectionLimit = inferChoiceSelectionLimit(
      directQuestion,
      answerContext?.instructionText || "",
      directExpectedAnswerCount > 1 ? directExpectedAnswerCount : 1,
    );

    return (
      <section className="space-y-2 border border-slate-200 bg-slate-50/70 px-4 py-3">
        <p className="text-sm font-semibold leading-7 text-slate-900">{directQuestion}</p>
        <ul className="space-y-2">
          {directOptions.map((option, optionIndex) => (
            <li key={`direct-option-${optionIndex}`}>
              {answerContext?.showDirectQuestionOptions
              && directQuestionStorageId
              && typeof answerContext?.onChoiceSelect === "function" ? (
                <button
                  className={`flex w-full items-start gap-2 border px-3 py-2 text-left text-sm leading-6 transition ${
                    directSelectedChoices.includes(normalizeAnswerText(getOptionValue(option, optionIndex)))
                      ? "border-emerald-400 bg-emerald-50 text-slate-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200"
                  } ${answerContext?.isInputDisabled ? "cursor-not-allowed opacity-75" : ""}`}
                  disabled={answerContext?.isInputDisabled}
                  onClick={() =>
                    answerContext?.onChoiceSelect?.(
                      directQuestionStorageId,
                      getOptionValue(option, optionIndex),
                      directSelectionLimit,
                    )
                  }
                  type="button"
                >
                  <span className="inline-flex min-w-6 font-semibold text-slate-900">
                    {getOptionLabel(option, optionIndex)}.
                  </span>
                  <span>{getOptionText(option)}</span>
                </button>
              ) : (
                <div className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">{getOptionLabel(option, optionIndex)}.</span>
                  <span>{getOptionText(option)}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (displayQuestions.length > 0) {
    return (
      <div className="space-y-3">
        {displayQuestions.map((question, questionIndex) =>
          renderChoiceQuestion(question, questionIndex, "choice-question", answerContext))}
      </div>
    );
  }

  if (displayPrompts.length > 0 || headingOptions.length > 0 || featureOptions.length > 0 || directOptions.length > 0) {
    return (
      <div className="space-y-3">
        {!isBinaryJudgement ? renderOptionList(directOptions, "Options", "display-options") : null}
        {!isBinaryJudgement ? renderOptionList(headingOptions, "Heading Options", "heading-options", true) : null}
        {!isBinaryJudgement ? renderOptionList(featureOptions, "Feature Options", "feature-options") : null}
        {renderPromptList(displayPrompts, "display-prompts", answerContext)}
      </div>
    );
  }

  if (display?.table && typeof display.table === "object") {
    return renderGenericTable(display.table, "block-table", answerContext);
  }

  if (Array.isArray(display?.elements) && display.elements.length > 0) {
    return (
      <div className="space-y-3">
        {display.elements.map((element, index) =>
          renderDisplayElement(element, index, "display-element", answerContext))}
      </div>
    );
  }

  if (Array.isArray(display?.sections) && display.sections.length > 0) {
    return (
      <div className="space-y-4">
        {display.sections.map((section, sectionIndex) => (
          <section className="space-y-2" key={`display-section-${sectionIndex}`}>
            {String(section?.heading || "").trim() ? (
              <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">
                {String(section.heading).trim()}
              </h4>
            ) : null}
            <ul className="ml-5 list-disc space-y-2 text-sm leading-7 text-slate-700">
              {(Array.isArray(section?.items) ? section.items : []).map((item, itemIndex) => (
                <li key={`display-section-${sectionIndex}-item-${itemIndex}`}>
                  {renderStructuredValue(item, `display-section-${sectionIndex}-item-${itemIndex}`, answerContext) || "-"}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  if (Array.isArray(display?.items) && display.items.length > 0) {
    return (
      <ul className="ml-5 list-disc space-y-2 text-sm leading-7 text-slate-700">
        {display.items.map((item, itemIndex) => (
          <li key={`display-item-${itemIndex}`}>
            {renderStructuredValue(item, `display-item-${itemIndex}`, answerContext) || "-"}
          </li>
        ))}
      </ul>
    );
  }

  if (Object.keys(display).length > 0) {
    return (
      <pre className="overflow-x-auto whitespace-pre-wrap break-words border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
        {JSON.stringify(display, null, 2)}
      </pre>
    );
  }

  return <p className="text-sm text-slate-500">No structured block display available.</p>;
}

function getQuestionId(question, questionIndex = 0) {
  const safeId = String(question?.id || question?.qid || question?.number || `q-${questionIndex + 1}`).trim();
  return safeId;
}

function getBlockQuestions(block, blockIndex = 0) {
  const rawQuestions = Array.isArray(block?.questions) ? [...block.questions] : [];
  const blockKey = String(block?._id || block?.id || `block-${blockIndex + 1}`).trim() || `block-${blockIndex + 1}`;
  return rawQuestions
    .map((question, questionIndex) => {
      const id = getQuestionId(question, questionIndex);
      if (!id) {
        return null;
      }

      return {
        id,
        storageId: `${blockKey}::${id}`,
        number: Number.isFinite(Number(question?.number)) ? Number(question.number) : questionIndex + 1,
        text: String(question?.text || question?.question || "").trim(),
        answers: toAnswerArray(question?.answers ?? question?.answer),
        raw: question,
      };
    })
    .filter(Boolean)
    .sort((left, right) => Number(left.number || 0) - Number(right.number || 0));
}

function getQuestionOptions(block, question) {
  const display = block?.display && typeof block.display === "object" ? block.display : {};
  const displayQuestions = Array.isArray(display?.questions) ? display.questions : [];

  const explicit = displayQuestions.find((displayQuestion) => {
    const displayQuestionId = String(displayQuestion?.qid || displayQuestion?.id || "").trim();
    if (displayQuestionId && displayQuestionId === question.id) {
      return true;
    }

    const displayNumber = Number(displayQuestion?.number);
    return Number.isFinite(displayNumber) && displayNumber === Number(question.number);
  });

  if (explicit && Array.isArray(explicit?.options) && explicit.options.length > 0) {
    return explicit.options;
  }

  const directOptions = Array.isArray(display?.options) ? display.options : [];
  const hasDirectQuestion = String(display?.question || display?.stem || "").trim();
  if (hasDirectQuestion && directOptions.length > 0) {
    return directOptions;
  }

  return [];
}

function isBinaryJudgementBlock(block) {
  const source = `${String(block?.blockType || "")} ${String(block?.questionFamily || "")}`.toLowerCase();
  return (
    /true[_-]?false[_-]?not[_-]?given/.test(source)
    || /yes[_-]?no[_-]?not[_-]?given/.test(source)
    || source.includes("binary_judgement")
  );
}

function readAutoCompleteState(storageKey) {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(storageKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persistAutoCompleteState(storageKey, payload) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // Ignore storage quota and serialization errors.
  }
}

function clearAutoCompleteState(storageKey) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    // Ignore storage errors.
  }
}

function ReadingBlockPanel({ block, children, displayAnswerContext = null }) {
  const questionNumbers = Array.isArray(block?.questions)
    ? block.questions
      .map((question) => Number(question?.number))
      .filter((number) => Number.isFinite(number))
      .sort((left, right) => left - right)
    : [];
  const startNumber = questionNumbers[0];
  const endNumber = questionNumbers[questionNumbers.length - 1];
  const questionRange =
    questionNumbers.length > 0
      ? startNumber === endNumber
        ? `Q${startNumber}`
        : `Q${startNumber}-${endNumber}`
      : null;

  return (
    <article className="overflow-hidden bg-white">
      <header className="space-y-1 border border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {toReadableLabel(block?.blockType || "reading_block")}
          {questionRange ? ` | ${questionRange}` : ""}
        </p>
        {String(block?.instruction?.text || "").trim() ? (
          <p className="text-sm font-semibold leading-7 text-slate-700">{String(block.instruction.text).trim()}</p>
        ) : null}
      </header>
      <div className="space-y-3 py-4">
        {renderReadingBlockDisplay(block, displayAnswerContext)}
        {children}
      </div>
    </article>
  );
}

function ReadingPassageWithBlocks({
  passage,
  blocks = [],
  evaluationBlocks = null,
  activePassageNumber = null,
  allPassageNumbers = null,
  onAttemptSubmit = null,
  emptyBlocksText = "No reading blocks found for this passage.",
  attemptDurationSeconds = DEFAULT_ATTEMPT_DURATION_SECONDS,
  attemptSessionKey = "",
  resetOnContentChange = true,
  primaryActionLabel = "Complete",
  onPrimaryAction = null,
  secondaryActionLabel = "",
  onSecondaryAction = null,
  isSecondaryActionVisible = false,
  isPrimaryActionDisabled = null,
  isSecondaryActionDisabled = false,
}) {
  const navigate = useNavigate();
  const normalizedAttemptDuration = Math.max(1, Number(attemptDurationSeconds) || DEFAULT_ATTEMPT_DURATION_SECONDS);
  const attemptMinutesLabel = Math.max(1, Math.round(normalizedAttemptDuration / 60));
  const contentBlocks = Array.isArray(passage?.contentBlocks) ? passage.contentBlocks : [];

  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isCountdownRunning, setIsCountdownRunning] = useState(false);
  const [countdownValue, setCountdownValue] = useState(null);
  const [hasAttemptStarted, setHasAttemptStarted] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(normalizedAttemptDuration);
  const [isSubmittingAttempt, setIsSubmittingAttempt] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [selectedAnswersById, setSelectedAnswersById] = useState({});
  const [result, setResult] = useState(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isAutoCompleted, setIsAutoCompleted] = useState(false);
  const [autoCompleteReason, setAutoCompleteReason] = useState("");
  const [isRouteLeaveSubmitting, setIsRouteLeaveSubmitting] = useState(false);
  const [shouldProceedAfterResult, setShouldProceedAfterResult] = useState(false);
  const [reviewRoute, setReviewRoute] = useState("");

  const passageRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const hasSubmittedAttemptRef = useRef(false);
  const passageTimingMsByNumberRef = useRef({});
  const activeTrackedPassageNumberRef = useRef(null);
  const activeTrackedStartedAtRef = useRef(null);
  const latestActivePassageNumberRef = useRef(null);
  const lastAttemptResetSignatureRef = useRef(null);

  const { clearHighlights, toggleSelectionHighlight } = useTextHighlighting({
    dataAttribute: "data-reading-highlight",
  });

  const defaultAutoCompleteStorageKey = useMemo(
    () =>
      `${AUTO_COMPLETE_KEY_PREFIX}${encodeURIComponent(
        [String(passage?._id || ""), ...blocks.map((block) => String(block?._id || ""))]
          .filter(Boolean)
          .join("|"),
      )}`,
    [blocks, passage?._id],
  );
  const autoCompleteStorageKey = String(attemptSessionKey || defaultAutoCompleteStorageKey).trim() || defaultAutoCompleteStorageKey;
  const normalizedActivePassageNumber = Number.isFinite(Number(activePassageNumber))
    ? Number(activePassageNumber)
    : null;
  const normalizedPassageNumbers = useMemo(() => {
    const fromProp = Array.isArray(allPassageNumbers) ? allPassageNumbers : EMPTY_ARRAY;
    const normalized = fromProp
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (normalized.length === 0 && Number.isFinite(normalizedActivePassageNumber)) {
      return [normalizedActivePassageNumber];
    }

    return Array.from(new Set(normalized)).sort((left, right) => left - right);
  }, [allPassageNumbers, normalizedActivePassageNumber]);

  useEffect(() => {
    latestActivePassageNumberRef.current = Number.isFinite(Number(normalizedActivePassageNumber))
      ? Number(normalizedActivePassageNumber)
      : null;
  }, [normalizedActivePassageNumber]);

  const blocksWithQuestions = useMemo(() => {
    return blocks.map((block, index) => ({
      block,
      index,
      questions: getBlockQuestions(block, index),
    }));
  }, [blocks]);
  const evaluationBlocksWithQuestions = useMemo(() => {
    const sourceBlocks =
      Array.isArray(evaluationBlocks) && evaluationBlocks.length > 0 ? evaluationBlocks : blocks;

    return sourceBlocks.map((block, index) => ({
      block,
      index,
      questions: getBlockQuestions(block, index),
    }));
  }, [blocks, evaluationBlocks]);
  const contentResetKey = resetOnContentChange
    ? [
      String(passage?._id || ""),
      ...blocksWithQuestions.map(({ block, index }) => String(block?._id || `block-${index}`)),
    ].join("|")
    : "continuous";
  const hasQuestionBlocksForReset = resetOnContentChange ? blocksWithQuestions.length > 0 : true;
  const attemptResetSignature = `${autoCompleteStorageKey}|${contentResetKey}`;

  const clearRunningIntervals = useCallback(() => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const clearPassageHighlights = useCallback(() => {
    clearHighlights(passageRef);
  }, [clearHighlights]);

  const initializePassageTimingState = useCallback(
    (timingEntries = []) => {
      const nextMap = {};
      normalizedPassageNumbers.forEach((passageNumber) => {
        nextMap[passageNumber] = 0;
      });

      if (Array.isArray(timingEntries)) {
        timingEntries.forEach((entry) => {
          const passageNumber = Number(entry?.passageNumber);
          if (!Number.isFinite(passageNumber) || passageNumber <= 0) {
            return;
          }

          const seconds = Math.max(0, Number(entry?.timeSpentSeconds) || 0);
          nextMap[passageNumber] = Math.round(seconds * 1000);
        });
      }

      const activePassageNumber = latestActivePassageNumberRef.current;
      if (
        Number.isFinite(Number(activePassageNumber))
        && !Object.prototype.hasOwnProperty.call(nextMap, Number(activePassageNumber))
      ) {
        nextMap[Number(activePassageNumber)] = 0;
      }

      passageTimingMsByNumberRef.current = nextMap;
      activeTrackedPassageNumberRef.current = Number.isFinite(Number(activePassageNumber))
        ? Number(activePassageNumber)
        : null;
      activeTrackedStartedAtRef.current = null;
    },
    [normalizedPassageNumbers],
  );

  const commitActivePassageTiming = useCallback((nowMs = Date.now()) => {
    const currentPassageNumber = activeTrackedPassageNumberRef.current;
    const startedAtMs = activeTrackedStartedAtRef.current;
    if (
      typeof currentPassageNumber !== "number" ||
      !Number.isFinite(currentPassageNumber) ||
      typeof startedAtMs !== "number" ||
      !Number.isFinite(startedAtMs)
    ) {
      return;
    }

    const elapsedMs = Math.max(0, nowMs - startedAtMs);
    if (elapsedMs > 0) {
      const currentValue = Math.max(0, Number(passageTimingMsByNumberRef.current[currentPassageNumber]) || 0);
      passageTimingMsByNumberRef.current[currentPassageNumber] = currentValue + elapsedMs;
    }

    activeTrackedStartedAtRef.current = null;
  }, []);

  const buildPassageTimingPayload = useCallback(() => {
    const nowMs = Date.now();
    const timingMap = { ...passageTimingMsByNumberRef.current };
    const currentPassageNumber = activeTrackedPassageNumberRef.current;
    const startedAtMs = activeTrackedStartedAtRef.current;
    if (
      typeof currentPassageNumber === "number" &&
      Number.isFinite(currentPassageNumber) &&
      typeof startedAtMs === "number" &&
      Number.isFinite(startedAtMs)
    ) {
      const elapsedMs = Math.max(0, nowMs - startedAtMs);
      timingMap[currentPassageNumber] = Math.max(0, Number(timingMap[currentPassageNumber]) || 0) + elapsedMs;
    }

    const numbersFromMap = Object.keys(timingMap)
      .map((key) => Number(key))
      .filter((value) => Number.isFinite(value) && value > 0);
    const allNumbers = Array.from(new Set([...normalizedPassageNumbers, ...numbersFromMap])).sort((left, right) => left - right);

    return allNumbers.map((passageNumber) => ({
      passageNumber,
      timeSpentSeconds: Math.max(0, Math.round((Number(timingMap[passageNumber]) || 0) / 1000)),
    }));
  }, [normalizedPassageNumbers]);

  const handleTextSelectionToggle = useCallback(() => {
    toggleSelectionHighlight(passageRef);
  }, [toggleSelectionHighlight]);

  const evaluateAttempt = useCallback(() => {
    const blockResults = evaluationBlocksWithQuestions.map(({ block, index, questions }) => {
      const isMultipleChoiceBlock = /multiple[_-]?choice/i.test(
        `${String(block?.blockType || "")} ${String(block?.questionFamily || "")}`,
      );
      const isMultipleChoiceMultiBlock = /multiple[_-]?choice[_-]?multi/i.test(
        `${String(block?.blockType || "")} ${String(block?.questionFamily || "")}`,
      );

      let questionResults = [];
      if (isMultipleChoiceMultiBlock) {
        const expectedChoiceSet = new Set();
        questions.forEach((question) => {
          question.answers.forEach((answer) => {
            const tokenSet = toChoiceTokenSet(answer);
            tokenSet.forEach((token) => expectedChoiceSet.add(token));
          });
        });
        const expectedTokens = Array.from(expectedChoiceSet).sort((left, right) => left.localeCompare(right));

        const submittedChoiceSet = new Set();
        questions.forEach((question) => {
          const storageId = String(question?.storageId || question?.id || "").trim();
          const rawStudentValue = selectedAnswersById[storageId];
          const studentAnswer = Array.isArray(rawStudentValue)
            ? rawStudentValue.join(", ")
            : String(rawStudentValue || "").trim();
          const tokenSet = toChoiceTokenSet(studentAnswer);
          tokenSet.forEach((token) => submittedChoiceSet.add(token));
        });

        questionResults = questions.map((question, questionIndex) => {
          const expectedToken = expectedTokens[questionIndex] || "";
          const isGradable = Boolean(expectedToken);
          const isCorrect = isGradable && submittedChoiceSet.has(expectedToken);
          return {
            questionId: question.id,
            questionNumber: question.number,
            studentAnswer: isCorrect ? expectedToken.toUpperCase() : "",
            acceptedAnswers: isGradable ? [expectedToken.toUpperCase()] : question.answers,
            isGradable,
            isCorrect,
          };
        });
      } else {
        questionResults = questions.map((question) => {
          const storageId = String(question?.storageId || question?.id || "").trim();
          const rawStudentValue = selectedAnswersById[storageId];
          const studentAnswer = Array.isArray(rawStudentValue)
            ? rawStudentValue.join(", ")
            : String(rawStudentValue || "").trim();
          const acceptedAnswers = toAnswerArray(question.answers);
          const normalizedAccepted = new Set(acceptedAnswers.map((item) => normalizeAnswerText(item)).filter(Boolean));
          const normalizedStudent = normalizeAnswerText(studentAnswer);
          const isGradable = normalizedAccepted.size > 0;
          const inferredSelectionLimit = inferChoiceSelectionLimit(
            String(question?.text || ""),
            String(block?.instruction?.text || ""),
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

      const gradableResults = questionResults.filter((item) => item.isGradable);
      const scoreBase = gradableResults.length > 0 ? gradableResults : questionResults;
      const totalQuestions = scoreBase.length;
      const correctCount = scoreBase.filter((item) => item.isCorrect).length;
      const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
      const blockTitle =
        String(block?.display?.title || "").trim() ||
        `${toReadableLabel(block?.questionFamily || block?.blockType || "Reading Block")} ${index + 1}`;
      const questionFamily = String(block?.questionFamily || "").trim();
      const blockType = String(block?.blockType || "").trim();

      return {
        blockId: String(block?._id || `block-${index}`),
        section: "reading",
        questionFamily,
        blockType,
        blockTitle,
        correctCount,
        totalQuestions,
        percentage,
        answerItems: scoreBase.map((item) => ({
          section: "reading",
          questionFamily,
          blockType,
          blockId: String(block?._id || `block-${index}`),
          blockTitle,
          questionNumber: item.questionNumber,
          studentAnswer: item.studentAnswer,
          acceptedAnswers: item.acceptedAnswers,
          isCorrect: Boolean(item.isCorrect),
        })),
        incorrectItems: scoreBase
          .filter((item) => !item.isCorrect)
          .map((item) => ({
            section: "reading",
            questionFamily,
            blockType,
            blockId: String(block?._id || `block-${index}`),
            blockTitle,
            questionNumber: item.questionNumber,
            studentAnswer: item.studentAnswer,
            acceptedAnswers: item.acceptedAnswers,
          })),
      };
    });

    const totalQuestions = blockResults.reduce((sum, item) => sum + Number(item.totalQuestions || 0), 0);
    const correctCount = blockResults.reduce((sum, item) => sum + Number(item.correctCount || 0), 0);
    const incorrectCount = Math.max(totalQuestions - correctCount, 0);
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const band = toReadingBand(correctCount, totalQuestions);
    const answerItems = blockResults.flatMap((item) => item.answerItems || []);
    const incorrectItems = blockResults.flatMap((item) => item.incorrectItems || []);

    return {
      totalQuestions,
      correctCount,
      incorrectCount,
      percentage,
      band,
      answerItems,
      incorrectItems,
    };
  }, [evaluationBlocksWithQuestions, selectedAnswersById]);

  const completeAttempt = useCallback(
    async (submitReason, forceReason = "") => {
      if (hasSubmittedAttemptRef.current) {
        return;
      }

      hasSubmittedAttemptRef.current = true;
      setIsSubmittingAttempt(true);
      setSubmitError("");

      try {
        commitActivePassageTiming(Date.now());
        clearRunningIntervals();
        setHasAttemptStarted(false);
        setIsCountdownRunning(false);
        setCountdownValue(null);
        setIsStartModalOpen(false);

        const passageTiming = buildPassageTimingPayload();
        const passageTimingSeconds = passageTiming.reduce(
          (sum, entry) => sum + Math.max(0, Math.round(Number(entry?.timeSpentSeconds) || 0)),
          0,
        );
        const elapsedAttemptSeconds = Math.max(0, normalizedAttemptDuration - remainingSeconds);
        const totalTimeSpentSeconds = Math.max(passageTimingSeconds, elapsedAttemptSeconds);
        const nextResult = {
          ...evaluateAttempt(),
          submitReason: String(submitReason || "manual"),
          forceReason: forceReason || "",
          passageTiming,
          totalTimeSpentSeconds,
        };

        let submitResponse = null;
        if (typeof onAttemptSubmit === "function") {
          try {
            submitResponse = await onAttemptSubmit({
              submitReason: String(submitReason || "manual"),
              forceReason: forceReason || "",
              evaluation: nextResult,
              passageTiming,
              totalTimeSpentSeconds,
            });
          } catch (submitError) {
            setSubmitError(submitError?.message || "This attempt was completed locally but could not be synced.");
          }
        }

        const nextReviewRoute = String(submitResponse?.reviewRoute || "").trim();
        if (nextReviewRoute) {
          nextResult.reviewRoute = nextReviewRoute;
          setReviewRoute(nextReviewRoute);
        }

        if (forceReason) {
          persistAutoCompleteState(autoCompleteStorageKey, {
            reason: forceReason,
            result: nextResult,
            submittedAt: new Date().toISOString(),
          });
        }

        setResult(nextResult);
        setIsResultModalOpen(true);
      } catch (nextError) {
        hasSubmittedAttemptRef.current = false;
        setSubmitError(nextError.message || "Failed to submit this reading task.");
      } finally {
        setIsSubmittingAttempt(false);
      }
    },
    [
      autoCompleteStorageKey,
      buildPassageTimingPayload,
      clearRunningIntervals,
      commitActivePassageTiming,
      evaluateAttempt,
      normalizedAttemptDuration,
      onAttemptSubmit,
      remainingSeconds,
    ],
  );

  const autoCompleteAttempt = useCallback(
    (reason, submitReason = "focus-lost") => {
      if (hasSubmittedAttemptRef.current || isResultModalOpen) {
        return;
      }

      setIsAutoCompleted(true);
      setAutoCompleteReason(String(reason || "This task was auto-submitted."));
      completeAttempt(submitReason, String(reason || "This task was auto-submitted."));
    },
    [completeAttempt, isResultModalOpen],
  );

  const handleUnderstandStart = useCallback(() => {
    if (isCountdownRunning || hasAttemptStarted || isResultModalOpen) {
      return;
    }

    clearAutoCompleteState(autoCompleteStorageKey);
    hasSubmittedAttemptRef.current = false;
    setIsAutoCompleted(false);
    setAutoCompleteReason("");
    setIsCountdownRunning(true);
    setCountdownValue(START_COUNTDOWN_SECONDS);

    clearRunningIntervals();
    countdownIntervalRef.current = window.setInterval(() => {
      setCountdownValue((previousValue) => {
        if (previousValue === null) {
          return null;
        }

        if (previousValue <= 1) {
          clearRunningIntervals();
          setIsCountdownRunning(false);
          setCountdownValue(null);
          setIsStartModalOpen(false);
          setHasAttemptStarted(true);
          setRemainingSeconds(normalizedAttemptDuration);
          return null;
        }

        return previousValue - 1;
      });
    }, 1000);
  }, [
    autoCompleteStorageKey,
    clearRunningIntervals,
    hasAttemptStarted,
    isCountdownRunning,
    isResultModalOpen,
    normalizedAttemptDuration,
  ]);

  const handleStartOverlayClose = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/student/tests/reading");
  }, [navigate]);

  const handleTryAgain = useCallback(() => {
    clearAutoCompleteState(autoCompleteStorageKey);
    clearRunningIntervals();
    clearPassageHighlights();
    initializePassageTimingState();
    hasSubmittedAttemptRef.current = false;
    setSelectedAnswersById({});
    setResult(null);
    setIsResultModalOpen(false);
    setSubmitError("");
    setRemainingSeconds(normalizedAttemptDuration);
    setHasAttemptStarted(false);
    setIsCountdownRunning(false);
    setCountdownValue(null);
    setIsAutoCompleted(false);
    setAutoCompleteReason("");
    setIsRouteLeaveSubmitting(false);
    setShouldProceedAfterResult(false);
    setReviewRoute("");
    setIsStartModalOpen(blocksWithQuestions.length > 0);
  }, [
    autoCompleteStorageKey,
    blocksWithQuestions.length,
    clearPassageHighlights,
    clearRunningIntervals,
    initializePassageTimingState,
    normalizedAttemptDuration,
  ]);

  const handleAnswerChange = useCallback((questionId, value) => {
    const safeQuestionId = String(questionId || "").trim();
    if (!safeQuestionId || !hasAttemptStarted || isResultModalOpen || isSubmittingAttempt) {
      return;
    }

    setSelectedAnswersById((previousMap) => ({
      ...previousMap,
      [safeQuestionId]: String(value || ""),
    }));
  }, [hasAttemptStarted, isResultModalOpen, isSubmittingAttempt]);

  const handleChoiceSelect = useCallback(
    (questionId, value, selectionLimit = 1) => {
      const safeQuestionId = String(questionId || "").trim();
      if (!safeQuestionId || !hasAttemptStarted || isResultModalOpen || isSubmittingAttempt) {
        return;
      }

      const safeValue = String(value ?? "").trim();

      setSelectedAnswersById((previousMap) => {
        if (!safeValue) {
          return {
            ...previousMap,
            [safeQuestionId]: "",
          };
        }

        const nextLimit = Math.max(1, Number(selectionLimit) || 1);
        const currentValues = toChoiceArray(previousMap[safeQuestionId]);
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
          [safeQuestionId]: nextValue,
        };
      });
    },
    [hasAttemptStarted, isResultModalOpen, isSubmittingAttempt],
  );

  const isExamSessionActive = hasAttemptStarted && !isResultModalOpen && !isSubmittingAttempt;
  useBodyScrollLock(isResultModalOpen || isStartModalOpen);

  const persistBeforeUnloadSnapshot = useCallback(() => {
    if (!isExamSessionActive) {
      return;
    }

    const snapshot = evaluateAttempt();
    const passageTiming = buildPassageTimingPayload();
    persistAutoCompleteState(autoCompleteStorageKey, {
      reason: "You refreshed or left the page. This reading task was auto-submitted.",
      result: {
        ...snapshot,
        passageTiming,
        submitReason: "before-unload",
        forceReason: "You refreshed or left the page. This reading task was auto-submitted.",
      },
      submittedAt: new Date().toISOString(),
    });
  }, [autoCompleteStorageKey, buildPassageTimingPayload, evaluateAttempt, isExamSessionActive]);

  const leaveProtection = useExamLeaveProtection({
    isEnabled: isExamSessionActive,
    onBeforeUnload: persistBeforeUnloadSnapshot,
  });
  useExamCopyBlocker(isExamSessionActive);

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
    await completeAttempt("leave-page", "You left this page. This task was auto-submitted.");
    if (!hasSubmittedAttemptRef.current) {
      setShouldProceedAfterResult(false);
      leaveProtection.cancelNavigation();
    }
    setIsRouteLeaveSubmitting(false);
  }, [completeAttempt, isRouteLeaveSubmitting, leaveProtection]);

  const handleResultPrimaryAction = useCallback(() => {
    if (shouldProceedAfterResult && leaveProtection.hasBlockedNavigation) {
      leaveProtection.proceedNavigation();
      return;
    }

    const targetReviewRoute = String(result?.reviewRoute || reviewRoute || "").trim();
    if (targetReviewRoute) {
      navigate(targetReviewRoute);
      return;
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/student/tests/reading");
  }, [leaveProtection, navigate, result?.reviewRoute, reviewRoute, shouldProceedAfterResult]);

  useEffect(() => {
    const nowMs = Date.now();
    const nextPassageNumber = Number.isFinite(normalizedActivePassageNumber) ? normalizedActivePassageNumber : null;
    const previousPassageNumber = activeTrackedPassageNumberRef.current;

    if (
      typeof nextPassageNumber === "number" &&
      !Object.prototype.hasOwnProperty.call(passageTimingMsByNumberRef.current, nextPassageNumber)
    ) {
      passageTimingMsByNumberRef.current[nextPassageNumber] = 0;
    }

    if (
      typeof previousPassageNumber === "number" &&
      Number.isFinite(previousPassageNumber) &&
      previousPassageNumber !== nextPassageNumber
    ) {
      commitActivePassageTiming(nowMs);
    }

    activeTrackedPassageNumberRef.current = nextPassageNumber;

    const shouldTrackCurrentPassage =
      hasAttemptStarted &&
      !isResultModalOpen &&
      typeof nextPassageNumber === "number" &&
      Number.isFinite(nextPassageNumber);

    if (shouldTrackCurrentPassage) {
      if (!Number.isFinite(Number(activeTrackedStartedAtRef.current))) {
        activeTrackedStartedAtRef.current = nowMs;
      }
      return;
    }

    commitActivePassageTiming(nowMs);
  }, [commitActivePassageTiming, hasAttemptStarted, isResultModalOpen, normalizedActivePassageNumber]);

  useEffect(() => {
    return () => {
      commitActivePassageTiming(Date.now());
    };
  }, [commitActivePassageTiming]);

  useEffect(() => {
    if (lastAttemptResetSignatureRef.current === attemptResetSignature) {
      return;
    }

    lastAttemptResetSignatureRef.current = attemptResetSignature;
    clearRunningIntervals();
    clearPassageHighlights();
    initializePassageTimingState();
    setSubmitError("");
    setSelectedAnswersById({});
    setResult(null);
    setIsResultModalOpen(false);
    setHasAttemptStarted(false);
    setIsCountdownRunning(false);
    setCountdownValue(null);
    setRemainingSeconds(normalizedAttemptDuration);
    hasSubmittedAttemptRef.current = false;
    setIsAutoCompleted(false);
    setAutoCompleteReason("");
    setIsRouteLeaveSubmitting(false);
    setShouldProceedAfterResult(false);
    setReviewRoute("");

    const persisted = readAutoCompleteState(autoCompleteStorageKey);
    if (persisted?.result) {
      initializePassageTimingState(persisted?.result?.passageTiming);
      setResult(persisted.result);
      setIsResultModalOpen(true);
      setIsStartModalOpen(false);
      setIsAutoCompleted(true);
      setAutoCompleteReason(String(persisted.reason || "This task was auto-submitted."));
      hasSubmittedAttemptRef.current = true;
      return;
    }

    setIsStartModalOpen(hasQuestionBlocksForReset);
  }, [
    attemptResetSignature,
    autoCompleteStorageKey,
    clearPassageHighlights,
    clearRunningIntervals,
    hasQuestionBlocksForReset,
    initializePassageTimingState,
    normalizedAttemptDuration,
  ]);

  useEffect(() => {
    return () => {
      clearRunningIntervals();
    };
  }, [clearRunningIntervals]);

  useEffect(() => {
    if (!hasAttemptStarted || isResultModalOpen) {
      return undefined;
    }

    timerIntervalRef.current = window.setInterval(() => {
      setRemainingSeconds((previousSeconds) => Math.max(previousSeconds - 1, 0));
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [hasAttemptStarted, isResultModalOpen]);

  useEffect(() => {
    if (!hasAttemptStarted || isResultModalOpen) {
      return;
    }

    if (remainingSeconds <= 0) {
      autoCompleteAttempt("Time is up. This reading task was auto-submitted.", "time-up");
    }
  }, [autoCompleteAttempt, hasAttemptStarted, isResultModalOpen, remainingSeconds]);

  useEffect(() => {
    if (!hasAttemptStarted || isResultModalOpen) {
      return undefined;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        autoCompleteAttempt("You switched tab/browser. This reading task was auto-submitted.", "tab-hidden");
      }
    };

    const handlePageHide = () => {
      autoCompleteAttempt("You left or refreshed the page. This reading task was auto-submitted.", "page-hide");
    };

    const handleWindowBlur = () => {
      autoCompleteAttempt("You did not follow the rule. This reading task was auto-submitted.", "window-blur");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [
    autoCompleteAttempt,
    hasAttemptStarted,
    isResultModalOpen,
  ]);

  const currentTimerLabel = formatTimerLabel(remainingSeconds);
  const isInputDisabled = !hasAttemptStarted || isResultModalOpen || isSubmittingAttempt;
  const resolvedPrimaryActionDisabled =
    isInputDisabled || (typeof isPrimaryActionDisabled === "boolean" ? isPrimaryActionDisabled : false);
  const resolvedSecondaryActionDisabled = isInputDisabled || isSecondaryActionDisabled;
  const resultPercentage = Number(result?.percentage || 0);
  const isGoodResult = resultPercentage >= GOOD_SCORE_THRESHOLD_PERCENT;
  const resultBandLabel = formatBandScore(result?.band ?? toReadingBand(result?.correctCount, result?.totalQuestions));

  return (
    <section className="space-y-4">
      {submitError ? (
        <p className="rounded-none border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{submitError}</p>
      ) : null}
      {isAutoCompleted && autoCompleteReason && !isResultModalOpen ? (
        <p className="rounded-none border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{autoCompleteReason}</p>
      ) : null}

      <div className="grid gap-0 lg:h-[calc(100vh-12.5rem)] lg:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)]">
        <section
          className="flex min-h-[24rem] flex-col overflow-hidden border border-slate-200/80 bg-white/95 lg:min-h-0"
          onMouseUp={isInputDisabled ? undefined : handleTextSelectionToggle}
          onTouchEnd={isInputDisabled ? undefined : handleTextSelectionToggle}
          ref={passageRef}
        >
        
          <div className="min-h-0 flex-1 overflow-y-auto p-4 select-text sm:p-5">
            <div className="space-y-3">
              {contentBlocks.length > 0 ? (
                contentBlocks.map((contentBlock, index) => renderPassageContentBlock(contentBlock, index))
              ) : (
                <p className="text-sm text-slate-500">No passage content available.</p>
              )}
            </div>
          </div>
        </section>

        <section className="flex min-h-[26rem] flex-col overflow-hidden bg-white/95 lg:min-h-0">
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={`text-2xl font-black tracking-tight ${remainingSeconds <= 60 ? "text-rose-600" : "text-slate-900"}`}>
                  {currentTimerLabel}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isSecondaryActionVisible && typeof onSecondaryAction === "function" ? (
                  <button
                    className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={resolvedSecondaryActionDisabled}
                    onClick={() => {
                      if (resolvedSecondaryActionDisabled) {
                        return;
                      }

                      onSecondaryAction();
                    }}
                    type="button"
                  >
                    {secondaryActionLabel || "Previous"}
                  </button>
                ) : null}
                <button
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={resolvedPrimaryActionDisabled}
                  onClick={() => {
                    if (resolvedPrimaryActionDisabled) {
                      return;
                    }

                    if (typeof onPrimaryAction === "function") {
                      onPrimaryAction();
                      return;
                    }

                    completeAttempt("manual");
                  }}
                  type="button"
                >
                  {isSubmittingAttempt && typeof onPrimaryAction !== "function" ? "Submitting..." : primaryActionLabel}
                </button>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
            {blocks.length > 0 ? (
              <div className="space-y-3">
                {blocksWithQuestions.map(({ block, index, questions }) => (
                  (() => {
                    const isBinaryJudgement = isBinaryJudgementBlock(block);
                    const display = block?.display && typeof block.display === "object" ? block.display : {};
                    const displayPrompts = getDisplayPrompts(
                      display,
                    );
                    const displayQuestions = Array.isArray(display?.questions) ? display.questions : [];
                    const directQuestionText = String(display?.question || display?.stem || "").trim();
                    const directOptions = Array.isArray(display?.options) ? display.options : [];
                    const questionIdByNumber = new Map(
                      questions
                        .map((question) => [Number(question?.number), String(question?.storageId || question?.id || "").trim()])
                        .filter(([number, questionId]) => Number.isFinite(number) && questionId),
                    );
                    const questionIdById = new Map(
                      questions
                        .map((question) => [String(question?.id || "").trim(), String(question?.storageId || question?.id || "").trim()])
                        .filter(([questionId, storageId]) => questionId && storageId),
                    );
                    const binaryOptionItems = (
                      Array.isArray(display?.options) && display.options.length > 0
                        ? display.options.map((option, optionIndex) => {
                          const optionText = String(getOptionText(option)).trim();
                          const optionValue = optionText || String(getOptionValue(option, optionIndex)).trim();
                          return {
                            value: optionValue,
                            label: optionText || optionValue,
                          };
                        })
                        : inferBinaryOptionItems(block)
                    ).filter((item) => item.value);
                    const headingOptionItems = (
                      Array.isArray(display?.headingOptions) ? display.headingOptions : []
                    )
                      .map((option, optionIndex) => {
                        const optionValue = String(getOptionValue(option, optionIndex)).trim();
                        if (!optionValue) {
                          return null;
                        }

                        return {
                          value: optionValue,
                          label: optionValue,
                        };
                      })
                      .filter(Boolean);
                    const hasInlineHeadingPrompts =
                      !isBinaryJudgement
                      && displayPrompts.length > 0
                      && headingOptionItems.length > 0;
                    const hasInlineBinaryPrompts =
                      isBinaryJudgement
                      && displayPrompts.length > 0
                      && binaryOptionItems.length > 0;
                    const hasInlineDisplayQuestions =
                      !isBinaryJudgement
                      && displayQuestions.length > 0;
                    const hasInlineGapInputs =
                      isGapFillLikeBlock(block)
                      && hasGapTokenInValue(display);
                    const hasInlineDirectQuestionOptions =
                      !isBinaryJudgement
                      && !hasInlineDisplayQuestions
                      && Boolean(directQuestionText)
                      && directOptions.length > 0
                      && questions.length === 1;
                    const hasInlinePromptSelect = hasInlineBinaryPrompts || hasInlineHeadingPrompts;
                    const promptSelectItems = hasInlineBinaryPrompts ? binaryOptionItems : headingOptionItems;
                    const answerCountByStorageId = new Map(
                      questions.map((question) => [
                        String(question?.storageId || question?.id || "").trim(),
                        Array.isArray(question?.answers) ? question.answers.length : 0,
                      ]),
                    );
                    const displayAnswerContext =
                      hasInlinePromptSelect || hasInlineDisplayQuestions || hasInlineDirectQuestionOptions || hasInlineGapInputs
                        ? {
                          isBinaryJudgement,
                          showPromptSelect: hasInlinePromptSelect,
                          showDirectQuestionOptions: hasInlineDirectQuestionOptions,
                          showInlineGapInputs: hasInlineGapInputs,
                          isInputDisabled,
                          onSelect: (questionId, value) => handleChoiceSelect(questionId, value, 1),
                          onChoiceSelect: handleChoiceSelect,
                          onAnswerChange: handleAnswerChange,
                          optionItems: promptSelectItems,
                          instructionText: String(block?.instruction?.text || ""),
                          answerCountByStorageId,
                          questionIdByNumber,
                          questionStorageIdByNumber: questionIdByNumber,
                          questionStorageIdById: questionIdById,
                          orderedStorageIds: questions.map((question) => String(question?.storageId || question?.id || "").trim()),
                          selectedAnswersById,
                        }
                        : null;

                    return (
                      <ReadingBlockPanel
                        block={block}
                        displayAnswerContext={displayAnswerContext}
                        key={block?._id || `block-${index}`}
                      >
                        {questions.length > 0
                        && !hasInlinePromptSelect
                        && !hasInlineDisplayQuestions
                        && !hasInlineDirectQuestionOptions
                        && !hasInlineGapInputs ? (
                          <section className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Answers</p>
                        <div className="space-y-3">
                          {questions.map((question) => {
                            const options = getQuestionOptions(block, question);
                            const explicitSelectionLimit = Number(
                              question?.raw?.selectionLimit ?? question?.raw?.maxSelections ?? question?.raw?.maxAnswers,
                            );
                            const inferredSelectionLimit = inferChoiceSelectionLimit(
                              question?.text || "",
                              String(block?.instruction?.text || ""),
                              question.answers.length > 1 ? question.answers.length : 1,
                            );
                            const selectionLimit = Math.max(
                              1,
                              Number.isFinite(explicitSelectionLimit) && explicitSelectionLimit > 0
                                ? explicitSelectionLimit
                                : inferredSelectionLimit,
                            );

                            const answerStorageId = String(question?.storageId || question?.id || "").trim();
                            const selectedChoices = toChoiceArray(selectedAnswersById[answerStorageId]).map((item) =>
                              normalizeAnswerText(item),
                            );

                            return (
                              <div className="space-y-2" key={question.id}>
                                <p className="text-sm font-semibold leading-6 text-slate-900">
                                  {Number.isFinite(Number(question.number))
                                    ? `${Number(question.number)}. `
                                    : ""}
                                  {question.text || "Answer"}
                                </p>

                                {options.length > 0 ? (
                                  <ul className="space-y-2">
                                    {options.map((option, optionIndex) => {
                                      const optionValue = getOptionValue(option, optionIndex);
                                      const isSelected = selectedChoices.includes(normalizeAnswerText(optionValue));
                                      return (
                                        <li key={`${question.id}-option-${optionIndex}`}>
                                          <button
                                            className={`flex w-full items-start gap-2 border px-3 py-2 text-left text-sm leading-6 transition ${
                                              isSelected
                                                ? "border-emerald-400 bg-emerald-50 text-slate-900"
                                                : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200"
                                            } ${isInputDisabled ? "cursor-not-allowed opacity-75" : ""}`}
                                            disabled={isInputDisabled}
                                            onClick={() => handleChoiceSelect(answerStorageId, optionValue, selectionLimit)}
                                            type="button"
                                          >
                                            <span className="inline-flex min-w-6 font-semibold text-slate-900">
                                              {getOptionLabel(option, optionIndex)}.
                                            </span>
                                            <span>{getOptionText(option) || "-"}</span>
                                          </button>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : (
                                  <input
                                    autoComplete="off"
                                    className={`h-10 w-full bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition ${
                                      isInputDisabled
                                        ? "cursor-not-allowed text-slate-400"
                                        : "ring-1 ring-slate-300 focus:ring-emerald-500"
                                    }`}
                                    disabled={isInputDisabled}
                                    maxLength={64}
                                    onChange={(event) => handleAnswerChange(answerStorageId, event.target.value)}
                                    spellCheck={false}
                                    type="text"
                                    value={
                                      Array.isArray(selectedAnswersById[answerStorageId])
                                        ? selectedAnswersById[answerStorageId].join(", ")
                                        : selectedAnswersById[answerStorageId] || ""
                                    }
                                  />
                                )}
                              </div>
                            );
                          })}
                          </div>
                        </section>
                        ) : null}
                      </ReadingBlockPanel>
                    );
                  })()
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">{emptyBlocksText}</p>
            )}
          </div>
        </section>
      </div>

      {isResultModalOpen && result ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4"
          onClick={(event) => event.stopPropagation()}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-slate-200 bg-white p-6 text-center shadow-2xl sm:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Task Submitted</p>
            <p
              className="my-4 text-7xl font-black tracking-tight"
              style={{ color: isGoodResult ? "#059669" : TOMATO_COLOR }}
            >
              {result.correctCount}/{result.totalQuestions}
            </p>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">
              Score: {resultBandLabel}
            </p>

            <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
              <div className="border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Correct</p>
                <p className="mt-1 text-xl font-semibold text-emerald-700">{result.correctCount}</p>
              </div>
              <div className="border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Incorrect</p>
                <p className="mt-1 text-xl font-semibold text-rose-700">{result.incorrectCount}</p>
              </div>
            </div>

            {result.forceReason ? (
              <p className="mx-auto mt-4 max-w-xl rounded-none border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {result.forceReason}
              </p>
            ) : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {shouldProceedAfterResult ? null : (
                <button
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:bg-slate-50"
                  onClick={handleTryAgain}
                  type="button"
                >
                  Try Again
                </button>
              )}
              <button
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:brightness-105"
                onClick={handleResultPrimaryAction}
                type="button"
              >
                Review
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isStartModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4"
          onClick={handleStartOverlayClose}
        >
        <div
          className="relative w-full max-w-xl border border-slate-200 bg-white p-6 text-center shadow-2xl sm:p-7"
          onClick={(event) => event.stopPropagation()}
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
                You have <span className="text-yellow-500">{attemptMinutesLabel} minutes</span> for this reading task.
                If you <span className="text-yellow-500">switch</span> tabs, <span className="text-yellow-500">change</span> browser, or <span className="text-yellow-500">refresh</span>, this task is <span className="text-yellow-500">auto-submitted</span>.
                Select text in the passage to highlight it. Select the same highlighted text again to remove highlight.
              </p>
            </div>

            <button
              className="mx-auto mt-6 inline-flex w-full max-w-[330px] items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 px-8 py-4 text-sm font-black uppercase tracking-[0.22em] text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isCountdownRunning}
              onClick={handleUnderstandStart}
              type="button"
            >
              {isCountdownRunning && Number.isFinite(countdownValue)
                ? `Starting in ${countdownValue}`
                : "I Understand"}
            </button>
          </div>
        </div>
      ) : null}

      <ExamLeaveWarningModal
        isOpen={leaveProtection.isWarningOpen}
        isSubmitting={isRouteLeaveSubmitting}
        onLeave={handleConfirmLeavePage}
        onStay={handleStayOnExamPage}
      />
    </section>
  );
}

export default ReadingPassageWithBlocks;
