import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllCards, getAllSets } from "@/lib/data";
import { DeckEditorView } from "@/components/deck/deck-editor-view";
import { CardBrowserSkeleton } from "@/components/skeletons";
import type { SetInfo } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const deck = await prisma.deck.findUnique({ where: { id }, select: { name: true } });
  return { title: deck ? `${deck.name} — Sorcery Companion` : "Deck Not Found" };
}

export default async function DeckEditorPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-[1400px]">
      <Suspense fallback={<CardBrowserSkeleton />}>
        <DeckEditorContent deckId={id} />
      </Suspense>
    </main>
  );
}

async function DeckEditorContent({ deckId }: { deckId: string }) {
  const [user, allCards, sets] = await Promise.all([
    requireUser(),
    getAllCards(),
    getAllSets(),
  ]);

  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    include: {
      cards: {
        include: {
          card: {
            include: {
              variants: {
                take: 1,
                orderBy: { createdAt: "asc" },
                select: { slug: true },
              },
            },
          },
        },
        orderBy: { card: { name: "asc" } },
      },
    },
  });

  if (!deck || deck.userId !== user.id) notFound();

  const deckCards = deck.cards.map((dc) => ({
    id: dc.id,
    cardId: dc.cardId,
    cardName: dc.card.name,
    cardType: dc.card.type,
    rarity: dc.card.rarity,
    cost: dc.card.cost,
    attack: dc.card.attack,
    defence: dc.card.defence,
    life: dc.card.life,
    elements: dc.card.elements,
    slug: dc.card.variants[0]?.slug ?? "",
    quantity: dc.quantity,
    section: dc.section,
  }));

  // Get user's other decks (for selection bar)
  const userDecks = await prisma.deck.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <DeckEditorView
      deckId={deck.id}
      deckName={deck.name}
      deckCards={deckCards}
      allCards={allCards}
      sets={sets as SetInfo[]}
      userDecks={userDecks}
    />
  );
}
