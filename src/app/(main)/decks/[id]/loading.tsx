import { CardBrowserSkeleton } from "@/components/skeletons";

export default function DeckEditorLoading() {
  return (
    <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-[1400px]">
      <CardBrowserSkeleton />
    </main>
  );
}
