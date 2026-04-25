import { BookOpenText, ClipboardList, Headphones, PenLine } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDateTime } from "./resultsUtils";

function getGroupTypeMeta(group = {}) {
  const category = String(group?.category || "").toLowerCase();
  const taskType = String(group?.taskType || "").toLowerCase();
  const source = `${category} ${taskType}`;

  if (source.includes("listening")) {
    return { Icon: Headphones };
  }

  if (source.includes("writing")) {
    return { Icon: PenLine };
  }

  if (source.includes("reading")) {
    return { Icon: BookOpenText };
  }

  return { Icon: ClipboardList };
}

function ResultGroupCard({ group }) {
  const latestAttempt = group?.latestAttempt || null;
  const openRoute = group?.navigation?.route || latestAttempt?.navigation?.route || "/student/results";
  const latestTimeLabel = latestAttempt?.totalTimeSpentLabel || "0m";
  const attemptsCount = Number(group?.attemptsCount ?? group?.attemptCount ?? 0);
  const title = group?.readableTitle || group?.title || "Completed task";
  const { Icon } = getGroupTypeMeta(group);

  return (
    <article className="rounded-none border border-slate-200/90 bg-white/95 p-5 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.45)]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center border border-slate-200 bg-slate-50 text-slate-500">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="min-w-0 truncate text-lg font-semibold leading-7 text-slate-900">
              {title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-700">
              <p className="inline-flex items-center gap-1 border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]">
                <span className="text-slate-500">Attempts:</span>
                <span className="font-bold text-slate-950">{attemptsCount}</span>
              </p>
              <p className="inline-flex items-center gap-1 border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]">
                <span className="text-slate-500">Latest Score:</span>
                <span className="font-bold text-slate-950">{group?.latestScoreLabel || "Completed"}</span>
              </p>
              <p className="inline-flex items-center gap-1 border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]">
                <span className="text-slate-500">Time Spent:</span>
                <span className="font-bold text-slate-950">{latestTimeLabel}</span>
              </p>
              <p className="inline-flex items-center gap-1 border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]">
                <span className="text-slate-500">Completed:</span>
                <span className="font-bold text-slate-950">{formatDateTime(group?.latestSubmittedAt)}</span>
              </p>
            </div>
          </div>
        </div>
        <Link
          className="group/review inline-flex shrink-0 items-center gap-2.5 justify-self-end border-none bg-transparent px-1 py-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-700 transition-colors duration-300 hover:text-emerald-900"
          to={openRoute}
        >
          <span className="relative block h-[1.1rem] overflow-hidden">
            <span className="flex flex-col transition-transform duration-300 ease-out group-hover/review:-translate-y-1/2">
              <span className="h-[1.1rem]">Review</span>
              <span className="h-[1.1rem] text-emerald-900">Review</span>
            </span>
          </span>
        </Link>
      </div>

    </article>
  );
}

export default ResultGroupCard;
