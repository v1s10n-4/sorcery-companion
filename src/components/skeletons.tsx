import { Skeleton } from "@/components/ui/skeleton";

// ── Card Browser (Home / Collection / Deck Editor) ────────────────────────────

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

// ── Card Detail ───────────────────────────────────────────────────────────────

export function CardDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
      {/* Image + thumbnails */}
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

        {/* Rules text */}
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

// ── Sets List ─────────────────────────────────────────────────────────────────

export function SetsListSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/50 bg-card p-6 space-y-3">
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

// ── Set Detail ────────────────────────────────────────────────────────────────

export function SetDetailSkeleton() {
  return (
    <div>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-48 rounded" />
        <div className="flex gap-3">
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
      </div>

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

// ── Collection Page (title + stats bar + card browser) ───────────────────────

export function CollectionPageSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {/* Header: title + action buttons */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40 rounded" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-[72px] rounded-md" />
          <Skeleton className="h-8 w-[72px] rounded-md" />
          <Skeleton className="h-8 w-[72px] rounded-md" />
        </div>
      </div>

      {/* Stats bar: 4 stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-xl" />
        ))}
      </div>

      {/* Search + filter + sort */}
      <div className="flex gap-2 items-center mt-1">
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

// ── Collection Stats ──────────────────────────────────────────────────────────

const CURVE_HEIGHTS = ["30%", "70%", "45%", "90%", "60%", "80%", "40%", "55%"];

export function CollectionStatsSkeleton() {
  return (
    <div>
      {/* Title */}
      <Skeleton className="h-8 w-48 rounded mb-6" />

      {/* Completion card */}
      <div className="rounded-xl border border-border/50 bg-card p-6 mb-6 space-y-3">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-10 w-32 rounded" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-3 w-48 rounded" />
      </div>

      {/* By type + by element */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card p-6 space-y-3">
            <Skeleton className="h-3 w-20 rounded" />
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex items-center gap-2">
                <Skeleton className="h-3 w-16 rounded shrink-0" />
                <Skeleton className="h-2 flex-1 rounded-full" />
                <Skeleton className="h-3 w-8 rounded shrink-0" />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Mana curve */}
      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-3 mb-4">
        <Skeleton className="h-3 w-24 rounded" />
        <div className="flex items-end gap-2 h-24">
          {CURVE_HEIGHTS.map((h, i) => (
            <Skeleton key={i} className="flex-1 rounded-t" style={{ height: h }} />
          ))}
        </div>
      </div>

      {/* By set */}
      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-3">
        <Skeleton className="h-3 w-20 rounded" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-32 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Import ────────────────────────────────────────────────────────────────────

export function ImportSkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-36 rounded mb-6" />

      {/* Format picker */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>

      {/* Text area */}
      <Skeleton className="h-48 w-full rounded-xl mb-3" />

      {/* File upload + button */}
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export function ExportSkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-44 rounded mb-6" />

      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/50 bg-card p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-3 w-48 rounded" />
              </div>
            </div>
            <Skeleton className="h-8 w-20 rounded-md shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Decks List ────────────────────────────────────────────────────────────────

export function DeckListSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-32 rounded" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/50 bg-card p-4 flex items-center gap-4"
          >
            {/* Avatar card thumbnail */}
            <Skeleton className="h-16 w-11 rounded-lg shrink-0" />
            {/* Deck info */}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40 rounded" />
              <div className="flex gap-2">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
            </div>
            {/* Updated date */}
            <Skeleton className="h-4 w-16 rounded hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function SettingsSkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-28 rounded mb-6" />

      <div className="space-y-4">
        {/* Profile card */}
        <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
          <Skeleton className="h-3 w-16 rounded" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-full shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-3 w-40 rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-12 rounded" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>

        {/* Plan card */}
        <div className="rounded-xl border border-border/50 bg-card p-6 space-y-3">
          <Skeleton className="h-3 w-12 rounded" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>

        {/* Actions card */}
        <div className="rounded-xl border border-border/50 bg-card p-6">
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}

// ── Auth (Login + Signup) ─────────────────────────────────────────────────────

export function AuthFormSkeleton() {
  return (
    <div>
      {/* Title */}
      <div className="text-center mb-8 space-y-2">
        <Skeleton className="h-9 w-48 rounded mx-auto" />
        <Skeleton className="h-4 w-64 rounded mx-auto" />
      </div>

      {/* OAuth buttons */}
      <div className="space-y-2 mb-6">
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-px flex-1 rounded" />
        <Skeleton className="h-3 w-6 rounded" />
        <Skeleton className="h-px flex-1 rounded" />
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-10 rounded" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-14 rounded" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    </div>
  );
}

// ── Public Collection (u/[slug]) ──────────────────────────────────────────────

export function PublicCollectionSkeleton() {
  return (
    <div>
      {/* Profile header */}
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-40 rounded" />
          <Skeleton className="h-3 w-32 rounded" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>

      {/* Card list */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border/50 bg-card p-3 flex items-center gap-3"
          >
            <Skeleton className="h-14 w-10 rounded shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
            <Skeleton className="h-4 w-12 rounded shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
