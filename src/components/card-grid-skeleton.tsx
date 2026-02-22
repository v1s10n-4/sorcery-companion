import { Skeleton } from "@/components/ui/skeleton";

export function CardGridSkeleton({ count = 24 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border bg-card p-4 space-y-3"
        >
          <Skeleton className="w-full aspect-[5/7] rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <div className="flex gap-1">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
