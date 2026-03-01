import { Skeleton } from "@/components/ui/skeleton";
import { CardDetailSkeleton } from "@/components/skeletons";

export default function CardDetailLoading() {
  return (
    <main className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="inline-flex items-center gap-1 mb-6">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-24 rounded" />
      </div>
      <CardDetailSkeleton />
    </main>
  );
}
