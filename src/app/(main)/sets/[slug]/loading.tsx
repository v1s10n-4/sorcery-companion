import { Skeleton } from "@/components/ui/skeleton";
import { SetDetailSkeleton } from "@/components/skeletons";

export default function SetDetailLoading() {
  return (
    <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-[1400px]">
      <div className="inline-flex items-center gap-1 mb-6">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-16 rounded" />
      </div>
      <SetDetailSkeleton />
    </main>
  );
}
