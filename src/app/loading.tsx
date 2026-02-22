import { CardGridSkeleton } from "@/components/card-grid-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-32" />
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-16 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      <CardGridSkeleton />
    </main>
  );
}
