import { CardGridSkeleton } from "@/components/card-grid-skeleton";

export default function Loading() {
  return (
    <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-[1400px]">
      <div className="mb-4">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
      </div>
      <CardGridSkeleton />
    </main>
  );
}
