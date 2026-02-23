import { Skeleton } from "@/components/ui/skeleton";

// ── Card Browser (Home page) ──

export function CardBrowserSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {/* Search + filter + sort */}
      <div className="flex gap-2 items-center">
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 w-[72px] rounded-md" />
        <Skeleton className="h-9 w-[72px] rounded-md" />
      </div>

      {/* Result count */}
      <Skeleton className="h-4 w-24 rounded" />

      {/* Card grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
        {Array.from({ length: 42 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="w-full aspect-[5/7] rounded-lg" />
            <Skeleton className="h-3 w-3/4 mt-1.5 mx-auto rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Card Detail ──

export function CardDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
      {/* Image */}
      <div className="space-y-3">
        <Skeleton className="w-full max-w-[300px] aspect-[5/7] rounded-lg" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-full aspect-[5/7] rounded-sm" />
          ))}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-4">
        {/* Title */}
        <Skeleton className="h-9 w-3/4 rounded" />

        {/* Badges */}
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>

        {/* Element icons */}
        <div className="flex gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>

        {/* Keywords */}
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>

        {/* Rules */}
        <Skeleton className="h-24 w-full rounded-lg" />

        {/* Printings */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ── Sets List ──

export function SetsListSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border/50 bg-card p-6 space-y-3"
        >
          <Skeleton className="h-6 w-3/4 rounded" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Set Detail ──

export function SetDetailSkeleton() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-48 rounded" />
        <div className="flex gap-3">
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
        {Array.from({ length: 42 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="w-full aspect-[5/7] rounded-lg" />
            <Skeleton className="h-3 w-3/4 mt-1.5 mx-auto rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
