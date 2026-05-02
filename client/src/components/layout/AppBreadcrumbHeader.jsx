import { ChevronRight, Monitor } from "lucide-react";

export default function AppBreadcrumbHeader({ segments = [] }) {
  const safeSegments = (Array.isArray(segments) ? segments : [])
    .map((segment) => String(segment || "").trim())
    .filter(Boolean);

  return (
    <nav
      aria-label="Page breadcrumb"
      className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-600"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-slate-200 bg-white text-slate-500">
        <Monitor className="h-4 w-4" />
      </span>
      {safeSegments.map((segment, index) => {
        const isLast = index === safeSegments.length - 1;

        return (
          <span className="flex min-w-0 items-center gap-2" key={`${segment}-${index}`}>
            {index > 0 ? <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" /> : null}
            <span className={`truncate ${isLast ? "font-semibold text-slate-900" : "text-slate-600"}`}>
              {segment}
            </span>
          </span>
        );
      })}
    </nav>
  );
}
