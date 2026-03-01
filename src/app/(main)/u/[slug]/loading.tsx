import { PublicCollectionSkeleton } from "@/components/skeletons";

export default function PublicCollectionLoading() {
  return (
    <main className="container mx-auto px-4 py-6 max-w-5xl">
      <PublicCollectionSkeleton />
    </main>
  );
}
