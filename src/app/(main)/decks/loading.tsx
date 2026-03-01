import { DeckListSkeleton } from "@/components/skeletons";

export default function DecksLoading() {
  return (
    <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-3xl">
      <DeckListSkeleton />
    </main>
  );
}
