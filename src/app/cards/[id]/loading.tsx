import { Skeleton } from "@/components/ui/skeleton";

export default function CardDetailLoading() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <Skeleton className="h-4 w-24 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
        <Skeleton className="w-[300px] aspect-[5/7] rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-9 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </main>
  );
}
