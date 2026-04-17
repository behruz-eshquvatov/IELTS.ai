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

function getOptionText(option) {
  if (typeof option === "string") {
    return option;
  }

  return String(option?.text || option?.title || option?.value || "").trim() || "-";
}

function renderInlineToken(token, key) {
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

function renderInlineContent(value, keyPrefix = "inline") {
  if (Array.isArray(value)) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        {value.map((token, index) => renderInlineToken(token, `${keyPrefix}-${index}`))}
      </span>
    );
  }

  return renderInlineToken(value, `${keyPrefix}-single`);
}

function renderStructuredValue(value, keyPrefix = "structured") {
  if (Array.isArray(value)) {
    const hasNestedArrays = value.some((entry) => Array.isArray(entry));
    if (!hasNestedArrays) {
      return renderInlineContent(value, keyPrefix);
    }

    return (
      <div className="space-y-2">
        {value.map((entry, index) => (
          <div className="text-sm leading-7 text-slate-700" key={`${keyPrefix}-${index}`}>
            {renderStructuredValue(entry, `${keyPrefix}-${index}`)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "string" || typeof value === "number" || (value && typeof value === "object")) {
    return renderInlineContent([value], keyPrefix);
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

function renderGenericTable(table, keyPrefix = "table") {
  const columns = Array.isArray(table?.columns) ? table.columns : [];
  const rows = normalizeTableRows(table?.rows);
  if (columns.length === 0 && rows.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto border border-slate-200">
      <table className="min-w-full border-collapse text-sm text-slate-700">
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
                  {renderStructuredValue(cell, `${keyPrefix}-row-${rowIndex}-cell-${cellIndex}`) || "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderDisplayElement(element, index, keyPrefix = "element") {
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
        {renderStructuredValue(element?.content, `${key}-content`) || "-"}
      </li>
    );
  }

  if (type === "example" || type === "form_row") {
    return (
      <div className="grid gap-2 border border-slate-200 bg-white px-4 py-3 sm:grid-cols-[220px_1fr]" key={key}>
        <p className="text-sm font-semibold text-slate-700">{String(element?.label || "").trim() || "-"}</p>
        <div className="text-sm leading-7 text-slate-700">{renderStructuredValue(element?.content, `${key}-content`) || "-"}</div>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700" key={key}>
      {element?.label ? <p className="font-semibold text-slate-700">{String(element.label).trim()}</p> : null}
      {renderStructuredValue(element?.content || element?.text || element, `${key}-fallback`) || "-"}
    </div>
  );
}

function renderPassageContentBlock(contentBlock, index) {
  const type = String(contentBlock?.type || "").trim().toLowerCase();
  const key = `passage-content-${index}`;

  if (type === "intro") {
    return (
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500" key={key}>
        {String(contentBlock?.text || "").trim() || "-"}
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

function renderChoiceQuestion(question, questionIndex, keyPrefix = "choice-question") {
  const questionText = String(question?.text || question?.question || "").trim();
  const options = Array.isArray(question?.options) ? question.options : [];
  return (
    <section className="space-y-2 border border-slate-200 bg-slate-50/70 px-4 py-3" key={`${keyPrefix}-${questionIndex}`}>
      <p className="text-sm font-semibold leading-7 text-slate-900">
        {Number.isFinite(Number(question?.number)) ? `${Number(question.number)}. ` : ""}
        {questionText || "Question"}
      </p>
      {options.length > 0 ? (
        <ul className="space-y-2">
          {options.map((option, optionIndex) => (
            <li className="flex items-start gap-2 text-sm text-slate-700" key={`${keyPrefix}-${questionIndex}-option-${optionIndex}`}>
              <span className="font-semibold text-slate-900">{getOptionLabel(option, optionIndex)}.</span>
              <span>{getOptionText(option)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function renderPromptList(prompts = [], keyPrefix = "prompt") {
  if (!Array.isArray(prompts) || prompts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {prompts.map((prompt, index) => (
        <div className="border border-slate-200 bg-white px-3 py-2 text-sm leading-7 text-slate-700" key={`${keyPrefix}-${index}`}>
          <span className="mr-2 font-semibold text-slate-900">
            {Number.isFinite(Number(prompt?.number)) ? `${Number(prompt.number)}.` : `${index + 1}.`}
          </span>
          <span>{String(prompt?.text || prompt?.statement || "").trim() || "-"}</span>
        </div>
      ))}
    </div>
  );
}

function renderOptionList(options = [], title = "Options", keyPrefix = "option-list") {
  if (!Array.isArray(options) || options.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <ul className="space-y-1.5 text-sm text-slate-700">
        {options.map((option, optionIndex) => (
          <li className="flex items-start gap-2" key={`${keyPrefix}-${optionIndex}`}>
            <span className="font-semibold text-slate-900">{getOptionLabel(option, optionIndex)}.</span>
            <span>{getOptionText(option)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function renderReadingBlockDisplay(block) {
  const display = block?.display && typeof block.display === "object" ? block.display : {};
  const directQuestion = String(display?.question || display?.stem || "").trim();
  const directOptions = Array.isArray(display?.options) ? display.options : [];
  const displayQuestions = Array.isArray(display?.questions) ? display.questions : [];
  const displayPrompts = Array.isArray(display?.prompts) ? display.prompts : [];
  const headingOptions = Array.isArray(display?.headingOptions) ? display.headingOptions : [];
  const featureOptions = Array.isArray(display?.featureOptions) ? display.featureOptions : [];

  if (directQuestion && directOptions.length > 0) {
    return (
      <section className="space-y-2 border border-slate-200 bg-slate-50/70 px-4 py-3">
        <p className="text-sm font-semibold leading-7 text-slate-900">{directQuestion}</p>
        <ul className="space-y-2">
          {directOptions.map((option, optionIndex) => (
            <li className="flex items-start gap-2 text-sm text-slate-700" key={`direct-option-${optionIndex}`}>
              <span className="font-semibold text-slate-900">{getOptionLabel(option, optionIndex)}.</span>
              <span>{getOptionText(option)}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (displayQuestions.length > 0) {
    return <div className="space-y-3">{displayQuestions.map((question, questionIndex) => renderChoiceQuestion(question, questionIndex))}</div>;
  }

  if (displayPrompts.length > 0 || headingOptions.length > 0 || featureOptions.length > 0 || directOptions.length > 0) {
    return (
      <div className="space-y-4">
        {renderOptionList(directOptions, "Options", "display-options")}
        {renderOptionList(headingOptions, "Heading Options", "heading-options")}
        {renderOptionList(featureOptions, "Feature Options", "feature-options")}
        {renderPromptList(displayPrompts, "display-prompts")}
      </div>
    );
  }

  if (display?.table && typeof display.table === "object") {
    return renderGenericTable(display.table, "block-table");
  }

  if (Array.isArray(display?.elements) && display.elements.length > 0) {
    return <div className="space-y-3">{display.elements.map((element, index) => renderDisplayElement(element, index, "display-element"))}</div>;
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
                  {renderStructuredValue(item, `display-section-${sectionIndex}-item-${itemIndex}`) || "-"}
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
            {renderStructuredValue(item, `display-item-${itemIndex}`) || "-"}
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

function ReadingBlockPanel({ block, index }) {
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
    <article className="space-y-3 border border-slate-200 bg-white p-4" key={block?._id || `block-${index}`}>
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {toReadableLabel(block?.blockType || "reading_block")}
          {questionRange ? ` | ${questionRange}` : ""}
        </p>
        {String(block?.instruction?.text || "").trim() ? (
          <p className="text-sm leading-7 text-slate-700">{String(block.instruction.text).trim()}</p>
        ) : null}
      </header>
      {renderReadingBlockDisplay(block)}
    </article>
  );
}

function ReadingPassageWithBlocks({
  passage,
  blocks = [],
  sectionTitle = "",
  sectionMeta = "",
  emptyBlocksText = "No reading blocks found for this passage.",
}) {
  const contentBlocks = Array.isArray(passage?.contentBlocks) ? passage.contentBlocks : [];

  return (
    <section className="space-y-4 border border-slate-200/80 bg-white/95 p-5 sm:p-6">
      <header className="space-y-1">
        {sectionTitle ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{sectionTitle}</p>
        ) : null}
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-slate-900">
          {String(passage?.title || passage?._id || "Reading Passage").trim()}
        </h2>
        {sectionMeta ? <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{sectionMeta}</p> : null}
      </header>

      <div className="space-y-3 border border-slate-200 bg-slate-50/40 p-4">
        {contentBlocks.length > 0 ? (
          contentBlocks.map((contentBlock, index) => renderPassageContentBlock(contentBlock, index))
        ) : (
          <p className="text-sm text-slate-500">No passage content available.</p>
        )}
      </div>

      <div className="space-y-3">
        {blocks.length > 0 ? (
          blocks.map((block, index) => <ReadingBlockPanel block={block} index={index} key={block?._id || index} />)
        ) : (
          <p className="text-sm text-slate-500">{emptyBlocksText}</p>
        )}
      </div>
    </section>
  );
}

export default ReadingPassageWithBlocks;
export { toReadableLabel };
