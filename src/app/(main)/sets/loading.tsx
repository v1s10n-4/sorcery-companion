import { Skeleton } from "@/components/ui/skeleton";
import { SetsListSkeleton } from "@/components/skeletons";

export default function SetsLoading() {
  return (
    <main className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="inline-flex items-center gap-1 mb-6">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-20 rounded" />
      </div>
      <Skeleton className="h-9 w-32 rounded mb-8" />
      <SetsListSkeleton />
    </main>
  );
}
