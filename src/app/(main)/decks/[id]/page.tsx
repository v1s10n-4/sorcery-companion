import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { requireUser } from "@/lib/auth";
import { getAllCards, getAllSets, preloadCatalog } from "@/lib/data";
import { getDeckWithCards, getDeckMeta } from "@/lib/data-user";
import { CardBrowserSkeleton } from "@/components/skeletons";
import type { SetInfo } from "@/lib/types";
import type { DeckDetail } from "@/lib/data-user";

const DeckEditorView = dynamic(
  () =>
    import("@/components/deck/deck-editor-view").then((m) => ({
      default: m.DeckEditorView,
    })),
  { loading: () => <CardBrowserSkeleton /> }
);

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const deck = await getDeckMeta(id);
  return { title: deck ? `${deck.name} — Sorcery Companion` : "Deck Not Found" };
}

export default async function DeckEditorPage({ params }: PageProps) {
  const { id } = await params;
  preloadCatalog();

  return (
    <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-[1400px]">
      <Suspense fallback={<CardBrowserSkeleton />}>
        <DeckEditorContent deckId={id} />
      </Suspense>
    </main>
  );
}

async function DeckEditorContent({ deckId }: { deckId: string }) {
  const [user, deck] = await Promise.all([
    requireUser(),
    getDeckWithCards(deckId),
  ]);

  if (!deck || deck.userId !== user.id) notFound();

  return <DeckEditorWithCatalog deck={deck} />;
}

/** Fetches catalog data internally — no prop drilling from parent. */
async function DeckEditorWithCatalog({ deck }: { deck: DeckDetail }) {
  const [allCards, sets] = await Promise.all([getAllCards(), getAllSets()]);

  return (
    <DeckEditorView
      deckId={deck.id}
      deckName={deck.name}
      deckCards={deck.cards}
      allCards={allCards}
      sets={sets as SetInfo[]}
    />
  );
}
