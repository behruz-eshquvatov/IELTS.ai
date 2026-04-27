function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function Skeleton({ className = "", rounded = "rounded-none", ...props }) {
  return (
    <span
      aria-hidden="true"
      className={cx("skeleton-shimmer block bg-slate-200/80", rounded, className)}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 1, className = "", widths = [] }) {
  return (
    <div aria-hidden="true" className={cx("space-y-2", className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          className="h-3"
          key={index}
          style={{ width: widths[index] || (index === lines - 1 ? "68%" : "100%") }}
        />
      ))}
    </div>
  );
}

export function SkeletonCircle({ className = "h-10 w-10" }) {
  return <Skeleton className={className} rounded="rounded-full" />;
}

export function SkeletonCard({ className = "", children, withIcon = true }) {
  return (
    <article
      aria-hidden="true"
      className={cx("rounded-none border border-slate-200/80 bg-white/90 p-5", className)}
    >
      {children || (
        <div className="flex items-center gap-4">
          {withIcon ? <Skeleton className="h-12 w-12 shrink-0" /> : null}
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-4 w-3/5" />
            <SkeletonText lines={2} widths={["85%", "45%"]} />
          </div>
          <Skeleton className="hidden h-7 w-20 sm:block" />
        </div>
      )}
    </article>
  );
}

export function SkeletonGrid({ count = 6, columns = "md:grid-cols-3", cardClassName = "" }) {
  return (
    <div aria-hidden="true" className={cx("grid gap-4", columns)}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard className={cardClassName} key={index} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, columns = 4, className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={cx("overflow-hidden rounded-none border border-slate-200/80 bg-white/90", className)}
    >
      <div
        className="grid gap-3 border-b border-slate-200/80 bg-slate-50/80 p-4"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }, (_, index) => (
          <Skeleton className="h-3 w-2/3" key={index} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div
          className="grid gap-3 border-b border-slate-200/70 p-4 last:border-b-0"
          key={rowIndex}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }, (_, columnIndex) => (
            <Skeleton
              className="h-3"
              key={columnIndex}
              style={{ width: columnIndex === 0 ? "82%" : columnIndex === columns - 1 ? "48%" : "68%" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonPage({ children, className = "", label = "Loading content" }) {
  return (
    <div aria-busy="true" className={cx("space-y-6", className)} role="status">
      <span className="sr-only">{label}</span>
      {children || (
        <>
          <Skeleton className="h-4 w-40" />
          <SkeletonGrid count={4} columns="md:grid-cols-2" />
        </>
      )}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <SkeletonPage className="space-y-10" label="Loading dashboard">
      <section className="space-y-4">
        <Skeleton className="h-3 w-36" />
        <div className="grid gap-4 md:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>
      <section className="space-y-4">
        <Skeleton className="h-3 w-44" />
        <SkeletonGrid count={3} columns="md:grid-cols-3" />
      </section>
      <section className="space-y-4">
        <Skeleton className="h-3 w-28" />
        <div className="grid gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>
    </SkeletonPage>
  );
}

export function AnalyticsSkeleton() {
  return (
    <SkeletonPage className="space-y-10" label="Loading analytics">
      <SkeletonCard className="min-h-36" withIcon={false}>
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-5 h-5 w-2/5" />
        <SkeletonText className="mt-4 max-w-3xl" lines={3} widths={["92%", "78%", "54%"]} />
      </SkeletonCard>
      <div className="grid gap-6 xl:grid-cols-2">
        <SkeletonCard className="h-80" withIcon={false} />
        <SkeletonCard className="h-80" withIcon={false} />
      </div>
      <SkeletonCard className="h-56" withIcon={false} />
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <SkeletonCard className="h-80" withIcon={false} />
        <SkeletonCard className="h-80" withIcon={false} />
      </div>
    </SkeletonPage>
  );
}

export function LibraryListSkeleton({ count = 6 }) {
  return (
    <SkeletonPage label="Loading library items">
      <section className="space-y-3">
        {Array.from({ length: count }, (_, index) => (
          <SkeletonCard className="min-h-[104px]" key={index} />
        ))}
      </section>
    </SkeletonPage>
  );
}

export function LibraryGridSkeleton({ count = 6 }) {
  return <SkeletonGrid count={count} columns="sm:grid-cols-2 xl:grid-cols-3" cardClassName="min-h-36" />;
}

export function TestPageSkeleton() {
  return (
    <SkeletonPage className="space-y-5" label="Loading test">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <SkeletonCard className="min-h-[34rem]" withIcon={false} />
        <div className="space-y-4">
          <SkeletonCard className="h-24" />
          <SkeletonCard className="min-h-[24rem]" withIcon={false} />
        </div>
      </div>
    </SkeletonPage>
  );
}

export function ProfileSkeleton() {
  return (
    <SkeletonPage className="space-y-8 pb-16 pt-4" label="Loading profile">
      <Skeleton className="h-3 w-40" />
      <SkeletonCard className="min-h-56 bg-slate-900/90" withIcon={false} />
      <section className="space-y-4">
        <Skeleton className="h-3 w-28" />
        <div className="grid gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>
      <section className="space-y-4">
        <Skeleton className="h-3 w-24" />
        <div className="grid gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>
    </SkeletonPage>
  );
}

export function ResultsSkeleton({ count = 4 }) {
  return (
    <SkeletonPage label="Loading results">
      <Skeleton className="h-3 w-36" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton className="h-9 w-28" key={index} />
        ))}
      </div>
      <section className="space-y-4">
        {Array.from({ length: count }, (_, index) => (
          <SkeletonCard className="min-h-28" key={index} />
        ))}
      </section>
    </SkeletonPage>
  );
}

export function AdminListSkeleton({ rows = 6 }) {
  return (
    <SkeletonPage label="Loading admin data">
      <SkeletonGrid count={2} columns="md:grid-cols-2" />
      <SkeletonTable rows={rows} columns={4} />
    </SkeletonPage>
  );
}
