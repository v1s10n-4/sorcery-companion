import { Suspense } from "react";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { requireUser } from "@/lib/auth";
import { getUserDecks } from "@/lib/data-user";
import { DeckListSkeleton } from "@/components/skeletons";

const DeckListView = dynamic(
  () =>
    import("@/components/deck/deck-list-view").then((m) => ({
      default: m.DeckListView,
    })),
  { loading: () => <DeckListSkeleton /> }
);

export const metadata: Metadata = {
  title: "My Decks — Sorcery Companion",
};

export default function DecksPage() {
  return (
    <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-3xl">
      <Suspense fallback={<DeckListSkeleton />}>
        <DecksContent />
      </Suspense>
    </main>
  );
}

async function DecksContent() {
  const user = await requireUser();
  const decks = await getUserDecks(user.id);

  return <DeckListView decks={decks} />;
}
