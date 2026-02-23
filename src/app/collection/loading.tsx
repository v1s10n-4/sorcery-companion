import { Skeleton } from "@/components/ui/skeleton";

export default function CollectionLoading() {
  return (
    <main className="container mx-auto px-4 py-6 max-w-5xl">
      <Skeleton className="h-8 w-48 mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </main>
  );
}
