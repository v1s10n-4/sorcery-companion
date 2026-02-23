import { Skeleton } from "@/components/ui/skeleton";

export function CardGridSkeleton({ count = 42 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {/* Search + buttons skeleton */}
      <div className="flex gap-2 items-center">
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i}>
            <Skeleton className="w-full aspect-[5/7] rounded-lg" />
            <Skeleton className="h-3 w-3/4 mt-1 mx-auto rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
