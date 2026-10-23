export function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <Skeleton className="mb-2 h-7 w-56" />
      <Skeleton className="mb-6 h-4 w-80" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="mt-6 h-64 rounded-xl" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-3 py-2">
      <Skeleton className="h-9 w-64" />
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      <span className="sr-only">Loading...</span>
    </div>
  );
}
