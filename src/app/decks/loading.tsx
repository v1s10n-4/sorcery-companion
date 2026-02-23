import { Skeleton } from "@/components/ui/skeleton";

export default function DecksLoading() {
  return (
    <main className="container mx-auto px-4 py-6 max-w-3xl">
      <Skeleton className="h-8 w-36 mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    </main>
  );
}
