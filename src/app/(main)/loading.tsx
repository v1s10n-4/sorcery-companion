import { Skeleton } from "@/components/ui/skeleton";
import { CardBrowserSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-[1400px]">
      <div className="mb-4">
        <Skeleton className="h-8 sm:h-9 w-52 sm:w-64 rounded" />
      </div>
      <CardBrowserSkeleton />
    </main>
  );
}
