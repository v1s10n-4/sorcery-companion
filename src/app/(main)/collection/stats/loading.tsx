import { CollectionStatsSkeleton } from "@/components/skeletons";

export default function CollectionStatsLoading() {
  return (
    <main className="container mx-auto px-4 py-6 max-w-4xl">
      <CollectionStatsSkeleton />
    </main>
  );
}
