import { useState, useTransition } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import clsx from "clsx";
import { askAiSuggestions, generateAiResponse } from "../../data/siteContent";
import MagneticButton from "./MagneticButton";

function AskAIBox({ className, compact = false }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(generateAiResponse(""));
  const [isPending, startTransition] = useTransition();

  const updateAnswer = (nextQuestion) => {
    startTransition(() => {
      setAnswer(generateAiResponse(nextQuestion));
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    updateAnswer(question);
  };

  return (
    <div className={clsx("space-y-5", className)}>
      <div className="flex flex-wrap gap-2">
        {askAiSuggestions.map((suggestion) => (
          <button
            className="cursor-pointer border border-slate-200/90 bg-transparent px-4 py-2 text-sm text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
            key={suggestion}
            onClick={() => {
              setQuestion(suggestion);
              updateAnswer(suggestion);
            }}
            type="button"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            Ask about the platform, progress tracking, or teacher support
          </span>
          <textarea
            className="input-shell min-h-[120px] resize-none rounded-none border-slate-300 bg-transparent shadow-none focus:border-emerald-300 focus:shadow-none"
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Type your question here..."
            rows={compact ? 3 : 5}
            value={question}
          />
        </label>

        <MagneticButton
          innerClassName="group cursor-pointer relative inline-flex items-center justify-center overflow-hidden rounded-full border border-emerald-300/20 bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)]"
          type="submit"
        >
          <span className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
            <span className="h-full w-8 bg-white/35 blur-sm" />
          </span>
          <span className="relative inline-flex items-center gap-2">
            <span>{isPending ? "Thinking..." : "Ask AI"}</span>
            <ArrowRight className="h-4 w-4" />
          </span>
        </MagneticButton>
      </form>

      <div className="border border-slate-200/90 bg-transparent p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
          Response
        </p>
        <p className="text-[0.98rem] leading-8 text-slate-600">{answer}</p>
      </div>
    </div>
  );
}

export default AskAIBox;
